using System.Security.Cryptography;
using System.Text;

namespace Hysj.Client.Crypto;

public static class HkdfDeriver
{
    public static byte[] DeriveKey(byte[] inputKeyMaterial, byte[]? salt, string info, int length)
    {
        var infoBytes = Encoding.UTF8.GetBytes(info);
        return HKDF.DeriveKey(HashAlgorithmName.SHA256, inputKeyMaterial, length, salt, infoBytes);
    }
}
