using System.Security.Cryptography;
using Hysj.Client.Crypto.PostQuantum;

namespace Hysj.Client.Crypto.X3DH;

/// <summary>
/// Alice-siden av X3DH handshake med hybrid ECC+Kyber.
/// Produserer delt hemmelighet og initialiseringsdata for Double Ratchet.
/// </summary>
public static class X3DHInitiator
{
    public static X3DHResult Initiate(
        byte[] myIdentityPrivate,
        byte[] theirIdentityPublic,
        byte[] theirSignedPreKey,
        byte[] theirOneTimePreKey,
        byte[] theirKyberPublicKey)
    {
        using var myIdentity  = EccKeyPair.FromPrivateKey(myIdentityPrivate);
        using var ephemeral   = EccKeyPair.Generate();

        // X3DH: 4 DH operations
        byte[] dh1 = myIdentity.DeriveSharedSecret(theirSignedPreKey);
        byte[] dh2 = ephemeral.DeriveSharedSecret(theirIdentityPublic);
        byte[] dh3 = ephemeral.DeriveSharedSecret(theirSignedPreKey);
        byte[] dh4 = ephemeral.DeriveSharedSecret(theirOneTimePreKey);

        // Kyber encapsulation (post-quantum)
        var (kyberCiphertext, kyberSecret) = KyberKem.Encapsulate(theirKyberPublicKey);

        // Combine all secrets
        byte[] combined = Combine(dh1, dh2, dh3, dh4, kyberSecret);
        byte[] masterSecret = HkdfDeriver.DeriveKey(combined, null, "hysj-x3dh-v1", 32);

        CryptographicOperations.ZeroMemory(dh1);
        CryptographicOperations.ZeroMemory(dh2);
        CryptographicOperations.ZeroMemory(dh3);
        CryptographicOperations.ZeroMemory(dh4);
        CryptographicOperations.ZeroMemory(kyberSecret);
        CryptographicOperations.ZeroMemory(combined);

        return new X3DHResult(masterSecret, ephemeral.ExportPublicKey(), kyberCiphertext);
    }

    private static byte[] Combine(params byte[][] arrays)
    {
        var total = new byte[arrays.Sum(a => a.Length)];
        int offset = 0;
        foreach (var arr in arrays) { arr.CopyTo(total, offset); offset += arr.Length; }
        return total;
    }
}
