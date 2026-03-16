using System.Security.Cryptography;
using System.Text;

namespace Hysj.Client.Crypto.Ratchet;

/// <summary>
/// Signal Double Ratchet implementasjon.
/// Gir forward secrecy per melding.
/// </summary>
public sealed class DoubleRatchet
{
    private RatchetState _state;

    private DoubleRatchet(RatchetState state) => _state = state;

    /// <summary>Initialiser som avsender (Alice) etter X3DH handshake.</summary>
    public static DoubleRatchet InitSender(byte[] sharedSecret, byte[] bobDhPublic)
    {
        var (rootKey, chainKey) = KdfRk(sharedSecret, new byte[32]);
        var sendDh = EccKeyPair.Generate();
        var (newRoot, sendChain) = KdfRk(rootKey, sendDh.DeriveSharedSecret(bobDhPublic));

        return new DoubleRatchet(new RatchetState
        {
            RootKey              = newRoot,
            SendingChainKey      = sendChain,
            ReceivingChainKey    = chainKey,
            DHSendPrivate        = sendDh.ExportPrivateKey(),
            DHSendPublic         = sendDh.ExportPublicKey(),
            DHReceivePublic      = bobDhPublic,
        });
    }

    /// <summary>Initialiser som mottaker (Bob) etter X3DH handshake.</summary>
    public static DoubleRatchet InitReceiver(byte[] sharedSecret, byte[] myDhPrivate)
    {
        var (rootKey, chainKey) = KdfRk(sharedSecret, new byte[32]);
        var myDh = EccKeyPair.FromPrivateKey(myDhPrivate);

        return new DoubleRatchet(new RatchetState
        {
            RootKey           = rootKey,
            ReceivingChainKey = chainKey,
            DHSendPrivate     = myDh.ExportPrivateKey(),
            DHSendPublic      = myDh.ExportPublicKey(),
        });
    }

    public static DoubleRatchet FromState(RatchetState state) => new(state);

    public RatchetState ExportState() => _state;

    /// <summary>Krypter en melding. Returnerer kryptert blob + header.</summary>
    public (byte[] ciphertext, MessageHeader header) Encrypt(byte[] plaintext)
    {
        var (newChain, msgKey) = KdfCk(_state.SendingChainKey);
        _state.SendingChainKey = newChain;

        using var mk = new MessageKey(msgKey);
        var cipher = AesGcmCipher.Encrypt(plaintext, mk.Key);

        var header = new MessageHeader(
            _state.DHSendPublic,
            _state.SendingIndex,
            _state.PreviousSendingLength);

        _state.SendingIndex++;
        return (cipher, header);
    }

    /// <summary>Dekrypter en melding.</summary>
    public byte[] Decrypt(byte[] ciphertext, MessageHeader header)
    {
        // Sjekk hoppet-over nøkler
        var skipKey = $"{Convert.ToBase64String(header.DHPublic)}:{header.MessageIndex}";
        if (_state.SkippedKeys.TryGetValue(skipKey, out var skipped))
        {
            _state.SkippedKeys.Remove(skipKey);
            using var sk = new MessageKey(skipped);
            return AesGcmCipher.Decrypt(ciphertext, sk.Key);
        }

        // DH ratchet hvis ny nøkkel fra motpart
        if (!header.DHPublic.SequenceEqual(_state.DHReceivePublic))
        {
            SkipMessageKeys(_state.ReceivingChainKey, header.PreviousChainLength);
            PerformDhRatchet(header.DHPublic);
        }

        SkipMessageKeys(_state.ReceivingChainKey, header.MessageIndex);

        var (newChain, msgKey) = KdfCk(_state.ReceivingChainKey);
        _state.ReceivingChainKey = newChain;
        _state.ReceivingIndex++;

        using var mk = new MessageKey(msgKey);
        return AesGcmCipher.Decrypt(ciphertext, mk.Key);
    }

    private void PerformDhRatchet(byte[] theirDhPublic)
    {
        _state.PreviousSendingLength = _state.SendingIndex;
        _state.SendingIndex          = 0;
        _state.ReceivingIndex        = 0;
        _state.DHReceivePublic       = theirDhPublic;

        using var oldDh = EccKeyPair.FromPrivateKey(_state.DHSendPrivate);
        var dh = oldDh.DeriveSharedSecret(theirDhPublic);
        (_state.RootKey, _state.ReceivingChainKey) = KdfRk(_state.RootKey, dh);

        using var newDh = EccKeyPair.Generate();
        _state.DHSendPrivate = newDh.ExportPrivateKey();
        _state.DHSendPublic  = newDh.ExportPublicKey();

        var dh2 = newDh.DeriveSharedSecret(theirDhPublic);
        (_state.RootKey, _state.SendingChainKey) = KdfRk(_state.RootKey, dh2);

        CryptographicOperations.ZeroMemory(dh);
        CryptographicOperations.ZeroMemory(dh2);
    }

    private void SkipMessageKeys(byte[] chainKey, int until)
    {
        const int MaxSkip = 1000;
        var ck = chainKey;
        var idx = _state.ReceivingIndex;
        while (idx < until && _state.SkippedKeys.Count < MaxSkip)
        {
            var (newCk, mk) = KdfCk(ck);
            ck = newCk;
            var key = $"{Convert.ToBase64String(_state.DHReceivePublic)}:{idx}";
            _state.SkippedKeys[key] = mk;
            idx++;
        }
    }

    // KDF for root chain: returns (new root key, chain key)
    private static (byte[] rootKey, byte[] chainKey) KdfRk(byte[] rk, byte[] dh)
    {
        var derived = HkdfDeriver.DeriveKey(dh, rk, "hysj-ratchet-root", 64);
        return (derived[..32], derived[32..]);
    }

    // KDF for message chain: returns (new chain key, message key)
    private static (byte[] chainKey, byte[] messageKey) KdfCk(byte[] ck)
    {
        var mk = HMACSHA256(ck, [0x01]);
        var nk = HMACSHA256(ck, [0x02]);
        return (nk, mk);
    }

    private static byte[] HMACSHA256(byte[] key, byte[] data)
    {
        using var hmac = new System.Security.Cryptography.HMACSHA256(key);
        return hmac.ComputeHash(data);
    }
}
