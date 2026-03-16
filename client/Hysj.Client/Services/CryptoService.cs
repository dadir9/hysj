using System.Security.Cryptography;
using System.Text;
using Hysj.Client.Crypto.Ratchet;
using Hysj.Client.Crypto.SealedSender;
using Hysj.Client.Crypto.X3DH;

namespace Hysj.Client.Services;

public class CryptoService : ICryptoService
{
    private readonly IKeyManager _keys;
    private readonly Dictionary<string, DoubleRatchet> _sessions = new();

    public CryptoService(IKeyManager keys) => _keys = keys;

    public bool HasSession(string recipientId) => _sessions.ContainsKey(recipientId);

    public async Task InitSessionAsync(string recipientId, PreKeyBundleDto bundle)
    {
        var myIdentityPriv = await _keys.GetOrCreateIdentityPrivateAsync();

        var result = X3DHInitiator.Initiate(
            myIdentityPriv,
            bundle.IdentityPublicKey,
            bundle.SignedPreKey,
            bundle.OneTimePreKey,
            bundle.KyberPublicKey);

        var ratchet = DoubleRatchet.InitSender(result.SharedSecret, bundle.SignedPreKey);
        _sessions[recipientId] = ratchet;

        CryptographicOperations.ZeroMemory(result.SharedSecret);
    }

    public async Task<byte[]> EncryptAsync(string recipientId, byte[] plaintext)
    {
        if (!_sessions.TryGetValue(recipientId, out var ratchet))
            throw new InvalidOperationException($"No session for {recipientId}");

        var (ciphertext, header) = ratchet.Encrypt(plaintext);

        // Serialize: [4 dhLen][dhPub][4 msgIdx][4 prevLen][ciphertext]
        var headerBytes = SerializeHeader(header);
        var payload = new byte[4 + headerBytes.Length + ciphertext.Length];
        BitConverter.GetBytes(headerBytes.Length).CopyTo(payload, 0);
        headerBytes.CopyTo(payload, 4);
        ciphertext.CopyTo(payload, 4 + headerBytes.Length);

        // Sealed Sender
        var myIdentityPriv = await _keys.GetOrCreateIdentityPrivateAsync();
        var recipientKey   = await _keys.GetCachedPublicKeyAsync(recipientId);
        if (recipientKey is null) return payload;

        var cert     = await _keys.GetOrCreateSenderCertificateAsync();
        var userIdStr = await _keys.GetUserIdAsync() ?? Guid.Empty.ToString();
        var senderId = Guid.TryParse(userIdStr, out var g) ? g : Guid.Empty;

        return SealedEnvelope.Seal(payload, senderId, cert, recipientKey);
    }

    public async Task<byte[]> DecryptAsync(string senderId, byte[] sealedPayload)
    {
        var myIdentityPriv = await _keys.GetOrCreateIdentityPrivateAsync();

        var content = SealedOpener.Open(sealedPayload, myIdentityPriv);
        var innerPayload = content.Payload;

        var headerLen   = BitConverter.ToInt32(innerPayload, 0);
        var headerBytes = innerPayload[4..(4 + headerLen)];
        var ciphertext  = innerPayload[(4 + headerLen)..];
        var header      = DeserializeHeader(headerBytes);

        if (!_sessions.TryGetValue(senderId, out var ratchet))
        {
            var mySpkPriv = await _keys.GetOrCreateSignedPreKeyPrivateAsync();
            // InitReceiver expects (sharedSecret, myDhPrivate) — here we use spk as initial DH
            ratchet = DoubleRatchet.InitReceiver(header.DHPublic, mySpkPriv);
            _sessions[senderId] = ratchet;
        }

        return ratchet.Decrypt(ciphertext, header);
    }

    // ── Header serialization ─────────────────────────────────────────
    private static byte[] SerializeHeader(MessageHeader h)
    {
        // [4 dhLen][dhPub][4 msgIdx][4 prevLen]
        var buf = new byte[4 + h.DHPublic.Length + 8];
        BitConverter.GetBytes(h.DHPublic.Length).CopyTo(buf, 0);
        h.DHPublic.CopyTo(buf, 4);
        BitConverter.GetBytes(h.MessageIndex).CopyTo(buf, 4 + h.DHPublic.Length);
        BitConverter.GetBytes(h.PreviousChainLength).CopyTo(buf, 4 + h.DHPublic.Length + 4);
        return buf;
    }

    private static MessageHeader DeserializeHeader(byte[] buf)
    {
        int dhLen   = BitConverter.ToInt32(buf, 0);
        var dhPub   = buf[4..(4 + dhLen)];
        int msgIdx  = BitConverter.ToInt32(buf, 4 + dhLen);
        int prevLen = BitConverter.ToInt32(buf, 4 + dhLen + 4);
        return new MessageHeader(dhPub, msgIdx, prevLen);
    }
}
