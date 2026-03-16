using System.Security.Cryptography;
using System.Text.Json;

namespace Hysj.Client.Crypto.SealedSender;

public record SealedContent(Guid SenderId, byte[] Certificate, byte[] Payload);

public static class SealedOpener
{
    public static SealedContent Open(byte[] sealedData, byte[] myPrivateKey)
    {
        int pubLen = BitConverter.ToInt32(sealedData, 0);
        byte[] theirEphPub = sealedData[4..(4 + pubLen)];
        byte[] encrypted   = sealedData[(4 + pubLen)..];

        using var myKey = EccKeyPair.FromPrivateKey(myPrivateKey);
        byte[] sharedSecret = myKey.DeriveSharedSecret(theirEphPub);
        byte[] encKey = HkdfDeriver.DeriveKey(sharedSecret, null, "hysj-sealed-enc", 32);

        byte[] innerBytes = AesGcmCipher.Decrypt(encrypted, encKey);

        CryptographicOperations.ZeroMemory(sharedSecret);
        CryptographicOperations.ZeroMemory(encKey);

        var inner = JsonSerializer.Deserialize<SealedInner>(innerBytes)!;
        return new SealedContent(inner.SenderId, inner.Certificate, inner.Payload);
    }

    private record SealedInner(Guid SenderId, byte[] Certificate, byte[] Payload);
}
