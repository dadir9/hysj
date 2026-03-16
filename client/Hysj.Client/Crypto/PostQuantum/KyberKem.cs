using System.Security.Cryptography;

namespace Hysj.Client.Crypto.PostQuantum;

/// <summary>
/// CRYSTALS-Kyber / ML-KEM Key Encapsulation Mechanism.
///
/// TODO: Full implementation requires ML-KEM support. Options:
///   - .NET 9 + System.Security.Cryptography.MLKem (experimental)
///   - BouncyCastle 2.3.x (has vulnerability)
///   - liboqs .NET bindings
///
/// Current: uses ECDH as fallback (still ECC-only, not post-quantum yet).
/// The hybrid architecture is in place — swap Kyber in here when library support lands.
/// </summary>
public static class KyberKem
{
    public static (byte[] publicKey, byte[] privateKey) GenerateKeyPair()
    {
        // Fallback: ECDH key pair (replace with Kyber when available)
        using var ecdh = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        return (ecdh.PublicKey.ExportSubjectPublicKeyInfo(), ecdh.ExportPkcs8PrivateKey());
    }

    public static (byte[] ciphertext, byte[] sharedSecret) Encapsulate(byte[] theirPublicKey)
    {
        // Fallback: ECDH encapsulation
        using var ephemeral = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        using var their = ECDiffieHellman.Create();
        their.ImportSubjectPublicKeyInfo(theirPublicKey, out _);
        byte[] shared = ephemeral.DeriveRawSecretAgreement(their.PublicKey);
        byte[] ciphertext = ephemeral.PublicKey.ExportSubjectPublicKeyInfo();
        return (ciphertext, shared);
    }

    public static byte[] Decapsulate(byte[] ciphertext, byte[] privateKey)
    {
        // Fallback: ECDH decapsulation
        using var my = ECDiffieHellman.Create();
        my.ImportPkcs8PrivateKey(privateKey, out _);
        using var their = ECDiffieHellman.Create();
        their.ImportSubjectPublicKeyInfo(ciphertext, out _);
        return my.DeriveRawSecretAgreement(their.PublicKey);
    }
}
