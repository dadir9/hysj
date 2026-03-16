using System.Security.Cryptography;

namespace Hysj.Client.Crypto;

public sealed class EccKeyPair : IDisposable
{
    private readonly ECDiffieHellman _ecdh;

    private EccKeyPair(ECDiffieHellman ecdh) => _ecdh = ecdh;

    public static EccKeyPair Generate() =>
        new(ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256));

    public static EccKeyPair FromPrivateKey(byte[] pkcs8)
    {
        var ecdh = ECDiffieHellman.Create();
        ecdh.ImportPkcs8PrivateKey(pkcs8, out _);
        return new EccKeyPair(ecdh);
    }

    public byte[] ExportPublicKey()  => _ecdh.PublicKey.ExportSubjectPublicKeyInfo();
    public byte[] ExportPrivateKey() => _ecdh.ExportPkcs8PrivateKey();

    public byte[] DeriveSharedSecret(byte[] theirPublicKeySpki)
    {
        using var their = ECDiffieHellman.Create();
        their.ImportSubjectPublicKeyInfo(theirPublicKeySpki, out _);
        return _ecdh.DeriveRawSecretAgreement(their.PublicKey);
    }

    public void Dispose() => _ecdh.Dispose();
}
