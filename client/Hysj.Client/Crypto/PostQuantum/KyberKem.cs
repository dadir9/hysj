using Org.BouncyCastle.Crypto;
using Org.BouncyCastle.Crypto.Generators;
using Org.BouncyCastle.Crypto.Kems;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Security;

namespace Hysj.Client.Crypto.PostQuantum;

/// <summary>
/// ML-KEM-1024 (FIPS 203, formerly CRYSTALS-Kyber) Key Encapsulation Mechanism.
/// Uses BouncyCastle 2.6.x for post-quantum security.
///
/// ML-KEM-1024 provides NIST Security Level 5 (equivalent to AES-256).
/// Combined with ECC in HybridKeyExchange, both classical and quantum
/// attacks must succeed to break the key exchange.
/// </summary>
public static class KyberKem
{
    private static readonly SecureRandom Rng = new();

    public static (byte[] publicKey, byte[] privateKey) GenerateKeyPair()
    {
        var keyGenParams = new MLKemKeyGenerationParameters(Rng, MLKemParameters.ml_kem_1024);
        var keyGen = new MLKemKeyPairGenerator();
        keyGen.Init(keyGenParams);

        AsymmetricCipherKeyPair keyPair = keyGen.GenerateKeyPair();

        var pubParams = (MLKemPublicKeyParameters)keyPair.Public;
        var privParams = (MLKemPrivateKeyParameters)keyPair.Private;

        return (pubParams.GetEncoded(), privParams.GetEncoded());
    }

    public static (byte[] ciphertext, byte[] sharedSecret) Encapsulate(byte[] theirPublicKey)
    {
        var pubParams = MLKemPublicKeyParameters.FromEncoding(MLKemParameters.ml_kem_1024, theirPublicKey);

        var encapsulator = new MLKemEncapsulator(MLKemParameters.ml_kem_1024);
        encapsulator.Init(pubParams);

        byte[] ciphertext = new byte[encapsulator.EncapsulationLength];
        byte[] sharedSecret = new byte[encapsulator.SecretLength];
        encapsulator.Encapsulate(ciphertext, 0, ciphertext.Length, sharedSecret, 0, sharedSecret.Length);

        return (ciphertext, sharedSecret);
    }

    public static byte[] Decapsulate(byte[] ciphertext, byte[] privateKey)
    {
        var privParams = MLKemPrivateKeyParameters.FromEncoding(MLKemParameters.ml_kem_1024, privateKey);

        var decapsulator = new MLKemDecapsulator(MLKemParameters.ml_kem_1024);
        decapsulator.Init(privParams);

        byte[] sharedSecret = new byte[decapsulator.SecretLength];
        decapsulator.Decapsulate(ciphertext, 0, ciphertext.Length, sharedSecret, 0, sharedSecret.Length);

        return sharedSecret;
    }
}
