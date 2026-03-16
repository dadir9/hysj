using System.Security.Cryptography;

namespace Hysj.Client.Crypto;

/// <summary>
/// AES-256-GCM authenticated encryption.
/// Output format: [12-byte nonce][ciphertext+16-byte tag]
/// </summary>
public static class AesGcmCipher
{
    private const int NonceSize = 12;
    private const int TagSize   = 16;

    public static byte[] Encrypt(byte[] plaintext, byte[] key)
    {
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var cipher = new byte[plaintext.Length];
        var tag    = new byte[TagSize];

        using var aes = new AesGcm(key, TagSize);
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

        using var aes = new AesGcm(key, TagSize);
        aes.Decrypt(nonce, cipher, tag, plain);
        return plain;
    }
}
