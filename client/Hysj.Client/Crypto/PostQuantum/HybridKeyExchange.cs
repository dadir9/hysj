using System.Security.Cryptography;

namespace Hysj.Client.Crypto.PostQuantum;

/// <summary>
/// Hybrid ECC + Kyber key exchange.
/// Both must be broken to compromise security.
/// </summary>
public static class HybridKeyExchange
{
    public static byte[] DeriveHybridSecret(
        byte[] myEccPrivate,
        byte[] theirEccPublic,
        byte[] kyberCiphertext,
        byte[] myKyberPrivate)
    {
        // 1. Classic ECDH
        using var myEcc = EccKeyPair.FromPrivateKey(myEccPrivate);
        byte[] eccSecret = myEcc.DeriveSharedSecret(theirEccPublic);

        // 2. Post-Quantum Kyber decapsulate
        byte[] kyberSecret = KyberKem.Decapsulate(kyberCiphertext, myKyberPrivate);

        // 3. Combine both secrets
        byte[] combined = new byte[eccSecret.Length + kyberSecret.Length];
        eccSecret.CopyTo(combined, 0);
        kyberSecret.CopyTo(combined, eccSecret.Length);

        // 4. Derive final key with HKDF
        byte[] finalKey = HkdfDeriver.DeriveKey(combined, null, "hysj-hybrid-v1", 32);

        // 5. Zero intermediate secrets
        CryptographicOperations.ZeroMemory(eccSecret);
        CryptographicOperations.ZeroMemory(kyberSecret);
        CryptographicOperations.ZeroMemory(combined);

        return finalKey;
    }
}
