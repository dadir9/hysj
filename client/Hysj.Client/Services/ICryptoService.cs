namespace Hysj.Client.Services;

public interface ICryptoService
{
    /// <summary>Encrypt plaintext for a recipient. Returns sealed+onion-wrapped bytes.</summary>
    Task<byte[]> EncryptAsync(string recipientId, byte[] plaintext);

    /// <summary>Decrypt incoming sealed payload. Returns plaintext.</summary>
    Task<byte[]> DecryptAsync(string senderId, byte[] sealedPayload);

    /// <summary>Initialize ratchet session with a recipient using their key bundle.</summary>
    Task InitSessionAsync(string recipientId, PreKeyBundleDto bundle);

    bool HasSession(string recipientId);
}
