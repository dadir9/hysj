using System.Security.Cryptography;
using System.Text.Json;
using FluentAssertions;

namespace Hysj.Crypto.Tests;

/// <summary>
/// Verifiserer at Sealed Sender skjuler avsender-identitet korrekt.
/// </summary>
public class SealedSenderTests
{
    private static (byte[] priv, byte[] pub) GenerateKeyPair()
    {
        using var ecdh = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        return (ecdh.ExportECPrivateKey(), ecdh.ExportSubjectPublicKeyInfo());
    }

    private static byte[] DeriveSharedSecret(byte[] myPriv, byte[] theirPub)
    {
        using var myKey    = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        using var theirKey = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        myKey.ImportECPrivateKey(myPriv, out _);
        theirKey.ImportSubjectPublicKeyInfo(theirPub, out _);
        return myKey.DeriveKeyMaterial(theirKey.PublicKey);
    }

    private static byte[] Seal(byte[] payload, Guid senderId, byte[] recipientPub)
    {
        using var ephemeral = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        var sharedSecret    = DeriveSharedSecret(ephemeral.ExportECPrivateKey(), recipientPub);
        var encKey          = HkdfHelper.DeriveKey(sharedSecret, null, "hysj-sealed-enc", 32);

        var inner     = new { SenderId = senderId, Payload = payload };
        var innerJson = JsonSerializer.SerializeToUtf8Bytes(inner);
        var encrypted = AesGcmHelper.Encrypt(innerJson, encKey);

        var pub    = ephemeral.ExportSubjectPublicKeyInfo();
        var result = new byte[4 + pub.Length + encrypted.Length];
        BitConverter.GetBytes(pub.Length).CopyTo(result, 0);
        pub.CopyTo(result, 4);
        encrypted.CopyTo(result, 4 + pub.Length);
        return result;
    }

    private record SealedInner(Guid SenderId, byte[] Payload);

    private static (Guid senderId, byte[] payload) Open(byte[] sealed_, byte[] recipientPriv)
    {
        int pubLen      = BitConverter.ToInt32(sealed_, 0);
        var ephPub      = sealed_[4..(4 + pubLen)];
        var encrypted   = sealed_[(4 + pubLen)..];

        var sharedSecret = DeriveSharedSecret(recipientPriv, ephPub);
        var encKey       = HkdfHelper.DeriveKey(sharedSecret, null, "hysj-sealed-enc", 32);
        var innerJson    = AesGcmHelper.Decrypt(encrypted, encKey);
        var inner        = JsonSerializer.Deserialize<SealedInner>(innerJson)!;
        return (inner.SenderId, inner.Payload);
    }

    [Fact]
    public void Seal_ThenOpen_ReturnsOriginalPayloadAndSenderId()
    {
        var (bobPriv, bobPub) = GenerateKeyPair();
        var senderId = Guid.NewGuid();
        var payload  = "Hemmelig melding"u8.ToArray();

        var sealed_          = Seal(payload, senderId, bobPub);
        var (gotId, gotData) = Open(sealed_, bobPriv);

        gotId.Should().Be(senderId);
        gotData.Should().Equal(payload);
    }

    [Fact]
    public void SealedData_ContainsNoPlaintextSenderId()
    {
        var (_, bobPub) = GenerateKeyPair();
        var senderId = Guid.NewGuid();
        var payload  = "Test"u8.ToArray();

        var sealed_ = Seal(payload, senderId, bobPub);

        // Avsender-ID skal IKKE finnes i klartekst i den forseglede konvolutten
        var senderIdBytes = senderId.ToByteArray();
        var senderIdStr   = senderId.ToString();

        ContainsSubsequence(sealed_, senderIdBytes)
            .Should().BeFalse("avsender-ID skal ikke være synlig i klartekst");

        System.Text.Encoding.UTF8.GetString(sealed_)
            .Contains(senderIdStr)
            .Should().BeFalse("avsender-ID som streng skal ikke finnes i klartekst");
    }

    [Fact]
    public void Open_WithWrongPrivateKey_ThrowsException()
    {
        var (_, bobPub)       = GenerateKeyPair();
        var (evePriv, _)      = GenerateKeyPair(); // En annen persons nøkkel
        var payload           = "Privat"u8.ToArray();

        var sealed_ = Seal(payload, Guid.NewGuid(), bobPub);

        var act = () => Open(sealed_, evePriv);
        act.Should().Throw<Exception>("feil privat nøkkel skal ikke åpne konvolutten");
    }

    [Fact]
    public void Open_WithTamperedData_ThrowsException()
    {
        var (bobPriv, bobPub) = GenerateKeyPair();
        var payload           = "Test"u8.ToArray();

        var sealed_ = Seal(payload, Guid.NewGuid(), bobPub).ToArray();
        sealed_[^10] ^= 0xFF; // Tukl med kryptert data

        var act = () => Open(sealed_, bobPriv);
        act.Should().Throw<Exception>("manipulert sealed data skal avvises");
    }

    [Fact]
    public void EachSeal_ProducesUniqueCiphertext()
    {
        var (_, bobPub) = GenerateKeyPair();
        var payload     = "Samme payload"u8.ToArray();

        var seal1 = Seal(payload, Guid.NewGuid(), bobPub);
        var seal2 = Seal(payload, Guid.NewGuid(), bobPub);

        seal1.Should().NotEqual(seal2,
            "ulik ephemeral nøkkel hver gang → ulik ciphertext");
    }

    private static bool ContainsSubsequence(byte[] data, byte[] pattern)
    {
        for (int i = 0; i <= data.Length - pattern.Length; i++)
            if (data.Skip(i).Take(pattern.Length).SequenceEqual(pattern))
                return true;
        return false;
    }
}
