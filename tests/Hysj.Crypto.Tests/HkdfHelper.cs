using System.Security.Cryptography;

namespace Hysj.Crypto.Tests;

/// <summary>
/// HKDF hjelpeklasse for tester.
/// </summary>
internal static class HkdfHelper
{
    public static byte[] DeriveKey(byte[] inputKey, byte[]? salt, string info, int length)
    {
        var infoBytes = System.Text.Encoding.UTF8.GetBytes(info);
        return HKDF.DeriveKey(HashAlgorithmName.SHA256, inputKey, length, salt, infoBytes);
    }
}
