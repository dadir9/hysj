namespace Hysj.Api.Services;

public interface ICertificateService
{
    /// <summary>
    /// Returns the server's Ed25519 public key (32 bytes) used to verify sender certificates.
    /// </summary>
    byte[] GetServerPublicKey();

    /// <summary>
    /// Issues a signed sender certificate for a user.
    /// The certificate is signed with the server's Ed25519 private key.
    /// Format: [4-byte payload len (LE)][JSON payload][64-byte Ed25519 signature]
    /// </summary>
    byte[] IssueCertificate(string userId, string username, DateTimeOffset expires);
}
