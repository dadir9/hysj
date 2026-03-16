using FluentAssertions;
using Org.BouncyCastle.Crypto;
using Org.BouncyCastle.Crypto.Generators;
using Org.BouncyCastle.Crypto.Kems;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Security;

namespace Hysj.Crypto.Tests;

/// <summary>
/// Verifiserer at ML-KEM-1024 (FIPS 203, formerly CRYSTALS-Kyber)
/// fungerer korrekt via BouncyCastle 2.6.x.
/// </summary>
public class KyberKemTests
{
    private static readonly SecureRandom Rng = new();

    private static (byte[] publicKey, byte[] privateKey) GenerateKeyPair()
    {
        var keyGenParams = new MLKemKeyGenerationParameters(Rng, MLKemParameters.ml_kem_1024);
        var keyGen = new MLKemKeyPairGenerator();
        keyGen.Init(keyGenParams);

        AsymmetricCipherKeyPair keyPair = keyGen.GenerateKeyPair();
        var pubParams = (MLKemPublicKeyParameters)keyPair.Public;
        var privParams = (MLKemPrivateKeyParameters)keyPair.Private;

        return (pubParams.GetEncoded(), privParams.GetEncoded());
    }

    private static (byte[] ciphertext, byte[] sharedSecret) Encapsulate(byte[] publicKey)
    {
        var pubParams = MLKemPublicKeyParameters.FromEncoding(MLKemParameters.ml_kem_1024, publicKey);
        var encapsulator = new MLKemEncapsulator(MLKemParameters.ml_kem_1024);
        encapsulator.Init(pubParams);

        byte[] ciphertext = new byte[encapsulator.EncapsulationLength];
        byte[] sharedSecret = new byte[encapsulator.SecretLength];
        encapsulator.Encapsulate(ciphertext, 0, ciphertext.Length, sharedSecret, 0, sharedSecret.Length);

        return (ciphertext, sharedSecret);
    }

    private static byte[] Decapsulate(byte[] ciphertext, byte[] privateKey)
    {
        var privParams = MLKemPrivateKeyParameters.FromEncoding(MLKemParameters.ml_kem_1024, privateKey);
        var decapsulator = new MLKemDecapsulator(MLKemParameters.ml_kem_1024);
        decapsulator.Init(privParams);

        byte[] sharedSecret = new byte[decapsulator.SecretLength];
        decapsulator.Decapsulate(ciphertext, 0, ciphertext.Length, sharedSecret, 0, sharedSecret.Length);

        return sharedSecret;
    }

    [Fact]
    public void GenerateKeyPair_ProducesValidKeys()
    {
        var (pub, priv) = GenerateKeyPair();

        pub.Should().NotBeEmpty("public key should have content");
        priv.Should().NotBeEmpty("private key should have content");

        // ML-KEM-1024 public key is 1568 bytes
        pub.Length.Should().Be(1568, "ML-KEM-1024 public key should be 1568 bytes");
    }

    [Fact]
    public void Encapsulate_ThenDecapsulate_ProducesSameSharedSecret()
    {
        var (pub, priv) = GenerateKeyPair();

        var (ciphertext, senderSecret) = Encapsulate(pub);
        var recipientSecret = Decapsulate(ciphertext, priv);

        recipientSecret.Should().Equal(senderSecret,
            "both parties should derive the same shared secret");
    }

    [Fact]
    public void SharedSecret_Is32Bytes()
    {
        var (pub, _) = GenerateKeyPair();
        var (_, sharedSecret) = Encapsulate(pub);

        sharedSecret.Length.Should().Be(32, "ML-KEM shared secret should be 32 bytes (256 bits)");
    }

    [Fact]
    public void DifferentKeyPairs_ProduceDifferentSecrets()
    {
        var (pub1, _) = GenerateKeyPair();
        var (pub2, _) = GenerateKeyPair();

        var (_, secret1) = Encapsulate(pub1);
        var (_, secret2) = Encapsulate(pub2);

        secret1.Should().NotEqual(secret2,
            "different key pairs should produce different shared secrets");
    }

    [Fact]
    public void WrongPrivateKey_ProducesDifferentSecret()
    {
        var (pub, _) = GenerateKeyPair();
        var (_, wrongPriv) = GenerateKeyPair();

        var (ciphertext, senderSecret) = Encapsulate(pub);

        // ML-KEM decapsulation with wrong key produces a different secret
        // (implicit rejection -- no exception, but different secret)
        var wrongSecret = Decapsulate(ciphertext, wrongPriv);

        wrongSecret.Should().NotEqual(senderSecret,
            "wrong private key should produce a different shared secret (implicit rejection)");
    }

    [Fact]
    public void MultipleEncapsulations_ProduceDifferentCiphertexts()
    {
        var (pub, priv) = GenerateKeyPair();

        var (ct1, secret1) = Encapsulate(pub);
        var (ct2, secret2) = Encapsulate(pub);

        ct1.Should().NotEqual(ct2,
            "each encapsulation should produce different ciphertext (randomized)");
        secret1.Should().NotEqual(secret2,
            "each encapsulation should produce different shared secret");

        // But both should still decapsulate correctly
        var dec1 = Decapsulate(ct1, priv);
        var dec2 = Decapsulate(ct2, priv);

        dec1.Should().Equal(secret1);
        dec2.Should().Equal(secret2);
    }

    [Fact]
    public void TamperedCiphertext_ProducesDifferentSecret()
    {
        var (pub, priv) = GenerateKeyPair();
        var (ciphertext, originalSecret) = Encapsulate(pub);

        // Tamper with ciphertext
        var tampered = (byte[])ciphertext.Clone();
        tampered[10] ^= 0xFF;

        // ML-KEM uses implicit rejection: tampered ciphertext decapsulates
        // to a different (random-looking) secret rather than throwing
        var tamperedSecret = Decapsulate(tampered, priv);

        tamperedSecret.Should().NotEqual(originalSecret,
            "tampered ciphertext should produce a different secret (implicit rejection)");
    }

    [Fact]
    public void HybridFlow_EccPlusKyber_BothSecretsContribute()
    {
        // Simulate the hybrid flow: ECC secret + Kyber secret -> HKDF
        var (kyberPub, kyberPriv) = GenerateKeyPair();

        var (kyberCt, kyberSecret) = Encapsulate(kyberPub);
        var kyberDecSecret = Decapsulate(kyberCt, kyberPriv);

        // Simulate ECC secret (random 32 bytes for test)
        var eccSecret = System.Security.Cryptography.RandomNumberGenerator.GetBytes(32);

        // Combine (as HybridKeyExchange does)
        var combined = new byte[eccSecret.Length + kyberDecSecret.Length];
        eccSecret.CopyTo(combined, 0);
        kyberDecSecret.CopyTo(combined, eccSecret.Length);

        // HKDF derive
        var finalKey = HkdfHelper.DeriveKey(combined, null, "hysj-hybrid-v1", 32);

        finalKey.Length.Should().Be(32);
        finalKey.Should().NotEqual(eccSecret, "final key should differ from ECC-only secret");
        finalKey.Should().NotEqual(kyberDecSecret, "final key should differ from Kyber-only secret");
    }
}
