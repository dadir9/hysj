using System.Security.Cryptography;
using Hysj.Client.Crypto.PostQuantum;

namespace Hysj.Client.Crypto.X3DH;

/// <summary>Bob-siden av X3DH handshake.</summary>
public static class X3DHResponder
{
    public static byte[] Respond(
        byte[] myIdentityPrivate,
        byte[] mySignedPreKeyPrivate,
        byte[] myOneTimePreKeyPrivate,
        byte[] myKyberPrivateKey,
        byte[] theirIdentityPublic,
        byte[] theirEphemeralPublic,
        byte[] kyberCiphertext)
    {
        using var myIdentity     = EccKeyPair.FromPrivateKey(myIdentityPrivate);
        using var mySignedPreKey = EccKeyPair.FromPrivateKey(mySignedPreKeyPrivate);
        using var myOtpk         = EccKeyPair.FromPrivateKey(myOneTimePreKeyPrivate);

        byte[] dh1 = mySignedPreKey.DeriveSharedSecret(theirIdentityPublic);
        byte[] dh2 = myIdentity.DeriveSharedSecret(theirEphemeralPublic);
        byte[] dh3 = mySignedPreKey.DeriveSharedSecret(theirEphemeralPublic);
        byte[] dh4 = myOtpk.DeriveSharedSecret(theirEphemeralPublic);

        byte[] kyberSecret = KyberKem.Decapsulate(kyberCiphertext, myKyberPrivateKey);

        byte[] combined = Combine(dh1, dh2, dh3, dh4, kyberSecret);
        byte[] masterSecret = HkdfDeriver.DeriveKey(combined, null, "hysj-x3dh-v1", 32);

        CryptographicOperations.ZeroMemory(dh1);
        CryptographicOperations.ZeroMemory(dh2);
        CryptographicOperations.ZeroMemory(dh3);
        CryptographicOperations.ZeroMemory(dh4);
        CryptographicOperations.ZeroMemory(kyberSecret);
        CryptographicOperations.ZeroMemory(combined);

        return masterSecret;
    }

    private static byte[] Combine(params byte[][] arrays)
    {
        var total = new byte[arrays.Sum(a => a.Length)];
        int offset = 0;
        foreach (var arr in arrays) { arr.CopyTo(total, offset); offset += arr.Length; }
        return total;
    }
}
