using System.Security.Cryptography;
using Hysj.Client.Crypto;

namespace Hysj.Client.Services;

public class KeyManager : IKeyManager
{
    private const string IdentityPrivKey  = "hysj_id_priv";
    private const string IdentityPubKey   = "hysj_id_pub";
    private const string SpkPrivKey       = "hysj_spk_priv";
    private const string SpkPubKey        = "hysj_spk_pub";
    private const string UserIdKey        = "hysj_user_id";
    private const string CertKey          = "hysj_sender_cert";

    public async Task<byte[]> GetOrCreateIdentityPrivateAsync()
    {
        var b64 = await SecureStorage.GetAsync(IdentityPrivKey);
        if (b64 is not null) return Convert.FromBase64String(b64);

        using var kp  = EccKeyPair.Generate();
        var priv = kp.ExportPrivateKey();
        var pub  = kp.ExportPublicKey();
        await SecureStorage.SetAsync(IdentityPrivKey, Convert.ToBase64String(priv));
        await SecureStorage.SetAsync(IdentityPubKey,  Convert.ToBase64String(pub));
        return priv;
    }

    public async Task<byte[]> GetOrCreateIdentityPublicAsync()
    {
        var b64 = await SecureStorage.GetAsync(IdentityPubKey);
        if (b64 is not null) return Convert.FromBase64String(b64);
        await GetOrCreateIdentityPrivateAsync(); // generates both
        return Convert.FromBase64String((await SecureStorage.GetAsync(IdentityPubKey))!);
    }

    public async Task<byte[]> GetOrCreateSignedPreKeyPrivateAsync()
    {
        var b64 = await SecureStorage.GetAsync(SpkPrivKey);
        if (b64 is not null) return Convert.FromBase64String(b64);

        using var kp  = EccKeyPair.Generate();
        var priv = kp.ExportPrivateKey();
        var pub  = kp.ExportPublicKey();
        await SecureStorage.SetAsync(SpkPrivKey, Convert.ToBase64String(priv));
        await SecureStorage.SetAsync(SpkPubKey,  Convert.ToBase64String(pub));
        return priv;
    }

    public async Task<byte[]> GetOrCreateSignedPreKeyPublicAsync()
    {
        var b64 = await SecureStorage.GetAsync(SpkPubKey);
        if (b64 is not null) return Convert.FromBase64String(b64);
        await GetOrCreateSignedPreKeyPrivateAsync();
        return Convert.FromBase64String((await SecureStorage.GetAsync(SpkPubKey))!);
    }

    public async Task<byte[]> GetOrCreateSenderCertificateAsync()
    {
        var b64 = await SecureStorage.GetAsync(CertKey);
        return b64 is null ? [] : Convert.FromBase64String(b64);
    }

    public async Task SetSenderCertificateAsync(byte[] cert) =>
        await SecureStorage.SetAsync(CertKey, Convert.ToBase64String(cert));

    public async Task<byte[]?> GetCachedPublicKeyAsync(string userId)
    {
        var b64 = await SecureStorage.GetAsync($"pk_{userId}");
        return b64 is null ? null : Convert.FromBase64String(b64);
    }

    public async Task CachePublicKeyAsync(string userId, byte[] publicKey) =>
        await SecureStorage.SetAsync($"pk_{userId}", Convert.ToBase64String(publicKey));

    public async Task<string?> GetUserIdAsync() =>
        await SecureStorage.GetAsync(UserIdKey);

    public async Task SetUserIdAsync(string userId) =>
        await SecureStorage.SetAsync(UserIdKey, userId);

    public Task WipeAllKeysAsync()
    {
        SecureStorage.RemoveAll();
        return Task.CompletedTask;
    }
}
