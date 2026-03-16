using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Hysj.Client.Crypto.Onion;

public static class OnionLayer
{
    public static byte[] Wrap(byte[] payload, string nextAddress, byte[] nodePublicKey)
    {
        using var ephemeral = EccKeyPair.Generate();
        byte[] shared = ephemeral.DeriveSharedSecret(nodePublicKey);
        byte[] key    = HkdfDeriver.DeriveKey(shared, null, "hysj-onion-layer", 32);

        var layer = new { Next = nextAddress, Payload = payload };
        byte[] layerBytes = JsonSerializer.SerializeToUtf8Bytes(layer);
        byte[] encrypted  = AesGcmCipher.Encrypt(layerBytes, key);

        CryptographicOperations.ZeroMemory(shared);
        CryptographicOperations.ZeroMemory(key);

        byte[] pub = ephemeral.ExportPublicKey();
        byte[] result = new byte[4 + pub.Length + encrypted.Length];
        BitConverter.GetBytes(pub.Length).CopyTo(result, 0);
        pub.CopyTo(result, 4);
        encrypted.CopyTo(result, 4 + pub.Length);
        return result;
    }
}
