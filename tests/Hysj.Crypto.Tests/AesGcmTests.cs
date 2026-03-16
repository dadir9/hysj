using System.Security.Cryptography;
using FluentAssertions;

namespace Hysj.Crypto.Tests;

/// <summary>
/// Verifiserer at AES-256-GCM kryptering fungerer korrekt.
/// </summary>
public class AesGcmTests
{
    private static byte[] RandomKey() => RandomNumberGenerator.GetBytes(32);

    [Fact]
    public void Encrypt_ThenDecrypt_ReturnsOriginalPlaintext()
    {
        var key       = RandomKey();
        var plaintext = "Hei, dette er en hemmelig melding!"u8.ToArray();

        var encrypted = AesGcmHelper.Encrypt(plaintext, key);
        var decrypted = AesGcmHelper.Decrypt(encrypted, key);

        decrypted.Should().Equal(plaintext);
    }

    [Fact]
    public void Encrypt_ProducesDifferentCiphertextEachTime()
    {
        var key       = RandomKey();
        var plaintext = "Samme melding"u8.ToArray();

        var enc1 = AesGcmHelper.Encrypt(plaintext, key);
        var enc2 = AesGcmHelper.Encrypt(plaintext, key);

        // Ulik nonce → ulik ciphertext (selv om plaintext og nøkkel er like)
        enc1.Should().NotEqual(enc2);
    }

    [Fact]
    public void Decrypt_WithWrongKey_ThrowsException()
    {
        var key       = RandomKey();
        var wrongKey  = RandomKey();
        var plaintext = "Hemmelig"u8.ToArray();

        var encrypted = AesGcmHelper.Encrypt(plaintext, key);

        var act = () => AesGcmHelper.Decrypt(encrypted, wrongKey);
        act.Should().Throw<Exception>("feil nøkkel skal feile autentisering");
    }

    [Fact]
    public void Decrypt_WithTamperedCiphertext_ThrowsException()
    {
        var key       = RandomKey();
        var plaintext = "Ikke tukl med meg"u8.ToArray();

        var encrypted = AesGcmHelper.Encrypt(plaintext, key).ToArray();
        encrypted[20] ^= 0xFF; // Manipuler midten av ciphertext

        var act = () => AesGcmHelper.Decrypt(encrypted, key);
        act.Should().Throw<Exception>("manipulert ciphertext skal avvises");
    }

    [Fact]
    public void Decrypt_WithTamperedTag_ThrowsException()
    {
        var key       = RandomKey();
        var plaintext = "Autentisert melding"u8.ToArray();

        var encrypted = AesGcmHelper.Encrypt(plaintext, key).ToArray();
        // Tag er de siste 16 bytene
        encrypted[^1] ^= 0xFF;

        var act = () => AesGcmHelper.Decrypt(encrypted, key);
        act.Should().Throw<Exception>("manipulert tag skal avvises");
    }

    [Fact]
    public void EncryptedData_HasCorrectFormat()
    {
        var key       = RandomKey();
        var plaintext = "Test"u8.ToArray();

        var encrypted = AesGcmHelper.Encrypt(plaintext, key);

        // Format: [12 nonce][ciphertext][16 tag]
        encrypted.Length.Should().Be(12 + plaintext.Length + 16);
    }

    [Fact]
    public void Encrypt_EmptyPlaintext_Works()
    {
        var key       = RandomKey();
        var plaintext = Array.Empty<byte>();

        var encrypted = AesGcmHelper.Encrypt(plaintext, key);
        var decrypted = AesGcmHelper.Decrypt(encrypted, key);

        decrypted.Should().BeEmpty();
    }

    [Fact]
    public void Encrypt_LargePlaintext_Works()
    {
        var key       = RandomKey();
        var plaintext = RandomNumberGenerator.GetBytes(1024 * 1024); // 1 MB

        var encrypted = AesGcmHelper.Encrypt(plaintext, key);
        var decrypted = AesGcmHelper.Decrypt(encrypted, key);

        decrypted.Should().Equal(plaintext);
    }
}

/// <summary>
/// Lokal kopi av AES-256-GCM implementasjonen for testing.
/// Format: [12-byte nonce][ciphertext][16-byte tag]
/// </summary>
internal static class AesGcmHelper
{
    private const int NonceSize = 12;
    private const int TagSize   = 16;

    public static byte[] Encrypt(byte[] plaintext, byte[] key)
    {
        var nonce  = RandomNumberGenerator.GetBytes(NonceSize);
        var cipher = new byte[plaintext.Length];
        var tag    = new byte[TagSize];

#pragma warning disable CA1416
        using var aes = new AesGcm(key, TagSize);
#pragma warning restore CA1416
        aes.Encrypt(nonce, plaintext, cipher, tag);

        var result = new byte[NonceSize + cipher.Length + TagSize];
        nonce.CopyTo(result, 0);
        cipher.CopyTo(result, NonceSize);
        tag.CopyTo(result, NonceSize + cipher.Length);
        return result;
    }

    public static byte[] Decrypt(byte[] data, byte[] key)
    {
        var nonce  = data[..NonceSize];
        var tag    = data[^TagSize..];
        var cipher = data[NonceSize..^TagSize];
        var plain  = new byte[cipher.Length];

#pragma warning disable CA1416
        using var aes = new AesGcm(key, TagSize);
#pragma warning restore CA1416
        aes.Decrypt(nonce, cipher, tag, plain);
        return plain;
    }
}
