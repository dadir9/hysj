using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using NSec.Cryptography;

namespace Hysj.Api.Services;

public class CertificateService : ICertificateService, IDisposable
{
    private readonly Key _signingKey;

    public CertificateService(IConfiguration config)
    {
        // Derive a deterministic Ed25519 signing key from the JWT secret.
        // This ensures the key is stable across restarts without needing a separate key file.
        var secret = Encoding.UTF8.GetBytes(config["Jwt:Secret"]!);
        var seed = SHA256.HashData(Encoding.UTF8.GetBytes("hysj-sender-cert-v1:" + Convert.ToBase64String(secret)));

        var algorithm = SignatureAlgorithm.Ed25519;
        _signingKey = Key.Import(algorithm, seed, KeyBlobFormat.RawPrivateKey,
            new KeyCreationParameters { ExportPolicy = KeyExportPolicies.AllowPlaintextExport });
    }

    public byte[] GetServerPublicKey()
    {
        return _signingKey.PublicKey.Export(KeyBlobFormat.RawPublicKey);
    }

    public byte[] IssueCertificate(string userId, string username, DateTimeOffset expires)
    {
        var payload = new
        {
            UserId = userId,
            Username = username,
            Expires = expires.ToUnixTimeSeconds()
        };

        var payloadBytes = JsonSerializer.SerializeToUtf8Bytes(payload);
        var algorithm = SignatureAlgorithm.Ed25519;
        var signature = algorithm.Sign(_signingKey, payloadBytes);

        // Certificate = [4-byte payload len (LE)][payload][64-byte Ed25519 signature]
        var cert = new byte[4 + payloadBytes.Length + signature.Length];
        BitConverter.GetBytes(payloadBytes.Length).CopyTo(cert, 0);
        payloadBytes.CopyTo(cert, 4);
        signature.CopyTo(cert, 4 + payloadBytes.Length);

        return cert;
    }

    public void Dispose()
    {
        _signingKey.Dispose();
    }
}
