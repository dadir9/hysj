namespace Hysj.Client.Services;

public interface IKeyManager
{
    /// <summary>Returns identity key private bytes (EC private key DER).</summary>
    Task<byte[]> GetOrCreateIdentityPrivateAsync();
    Task<byte[]> GetOrCreateIdentityPublicAsync();

    Task<byte[]> GetOrCreateSignedPreKeyPrivateAsync();
    Task<byte[]> GetOrCreateSignedPreKeyPublicAsync();

    Task<byte[]> GetOrCreateSenderCertificateAsync();
    Task SetSenderCertificateAsync(byte[] cert);

    Task<byte[]?> GetCachedPublicKeyAsync(string userId);
    Task CachePublicKeyAsync(string userId, byte[] publicKey);

    Task<string?> GetUserIdAsync();
    Task SetUserIdAsync(string userId);

    Task WipeAllKeysAsync();
}
