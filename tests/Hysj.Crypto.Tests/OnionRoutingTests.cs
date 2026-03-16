using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentAssertions;

namespace Hysj.Crypto.Tests;

/// <summary>
/// Verifiserer at Onion Routing krypterer i riktig antall lag
/// og at ingen node ser for mye.
/// </summary>
public class OnionRoutingTests
{
    private static (byte[] priv, byte[] pub) GenerateKeyPair()
    {
        using var ecdh = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        return (ecdh.ExportECPrivateKey(), ecdh.ExportSubjectPublicKeyInfo());
    }

    private static byte[] WrapLayer(byte[] payload, string nextAddress, byte[] nodePub)
    {
        using var ephemeral  = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        using var nodeKey    = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        nodeKey.ImportSubjectPublicKeyInfo(nodePub, out _);

        var shared  = ephemeral.DeriveKeyMaterial(nodeKey.PublicKey);
        var encKey  = HkdfHelper.DeriveKey(shared, null, "hysj-onion-layer", 32);

        var layerContent = JsonSerializer.SerializeToUtf8Bytes(
            new { Next = nextAddress, Payload = Convert.ToBase64String(payload) });
        var encrypted = AesGcmHelper.Encrypt(layerContent, encKey);

        var pub    = ephemeral.ExportSubjectPublicKeyInfo();
        var result = new byte[4 + pub.Length + encrypted.Length];
        BitConverter.GetBytes(pub.Length).CopyTo(result, 0);
        pub.CopyTo(result, 4);
        encrypted.CopyTo(result, 4 + pub.Length);
        return result;
    }

    private record OnionLayer(string Next, string Payload);

    private static (string next, byte[] payload) PeelLayer(byte[] wrapped, byte[] nodePriv)
    {
        int pubLen     = BitConverter.ToInt32(wrapped, 0);
        var ephPub     = wrapped[4..(4 + pubLen)];
        var encrypted  = wrapped[(4 + pubLen)..];

        using var myKey    = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        using var theirKey = ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
        myKey.ImportECPrivateKey(nodePriv, out _);
        theirKey.ImportSubjectPublicKeyInfo(ephPub, out _);

        var shared  = myKey.DeriveKeyMaterial(theirKey.PublicKey);
        var encKey  = HkdfHelper.DeriveKey(shared, null, "hysj-onion-layer", 32);

        var json  = AesGcmHelper.Decrypt(encrypted, encKey);
        var layer = JsonSerializer.Deserialize<OnionLayer>(json)!;
        return (layer.Next, Convert.FromBase64String(layer.Payload));
    }

    [Fact]
    public void BuildRoute_ThreeLayers_PeelsCorrectly()
    {
        var (n1Priv, n1Pub) = GenerateKeyPair();
        var (n2Priv, n2Pub) = GenerateKeyPair();
        var (n3Priv, n3Pub) = GenerateKeyPair();

        var originalPayload = "Hemmelig melding til Bob"u8.ToArray();

        // Bygg fra innerst til ytterst
        var layer3 = WrapLayer(originalPayload, "server:7100",  n3Pub);
        var layer2 = WrapLayer(layer3,          "node3:8003",   n2Pub);
        var layer1 = WrapLayer(layer2,          "node2:8002",   n1Pub);

        // Node 1 peller sitt lag
        var (next1, payload1) = PeelLayer(layer1, n1Priv);
        next1.Should().Be("node2:8002");

        // Node 2 peller sitt lag
        var (next2, payload2) = PeelLayer(payload1, n2Priv);
        next2.Should().Be("node3:8003");

        // Node 3 peller sitt lag
        var (next3, payload3) = PeelLayer(payload2, n3Priv);
        next3.Should().Be("server:7100");

        payload3.Should().Equal(originalPayload);
    }

    [Fact]
    public void Node1_CannotSeeOriginalPayload()
    {
        var (_, n1Pub) = GenerateKeyPair();
        var (_, n2Pub) = GenerateKeyPair();
        var (_, n3Pub) = GenerateKeyPair();

        var secret  = "TOP SECRET"u8.ToArray();
        var layer3  = WrapLayer(secret,  "server:7100", n3Pub);
        var layer2  = WrapLayer(layer3,  "node3:8003",  n2Pub);
        var layer1  = WrapLayer(layer2,  "node2:8002",  n1Pub);

        // Node 1 sitt lag inneholder IKKE klartekst-payload
        var layer1Str = Encoding.UTF8.GetString(layer1);
        layer1Str.Contains("TOP SECRET")
            .Should().BeFalse("node 1 skal ikke se original payload");
    }

    [Fact]
    public void SkippingALayer_ThrowsException()
    {
        var (n1Priv, n1Pub) = GenerateKeyPair();
        var (n2Priv, n2Pub) = GenerateKeyPair();

        var payload = "Test"u8.ToArray();
        var layer2  = WrapLayer(payload, "server", n2Pub);
        var layer1  = WrapLayer(layer2,  "node2",  n1Pub);

        // Prøv å pelle lag 1 med node 2 sin nøkkel (hopp over node 1)
        var act = () => PeelLayer(layer1, n2Priv);
        act.Should().Throw<Exception>("feil nøkkel skal ikke fungere");
    }

    [Fact]
    public void TamperedLayer_IsRejected()
    {
        var (n1Priv, n1Pub) = GenerateKeyPair();
        var payload = "Test"u8.ToArray();
        var wrapped = WrapLayer(payload, "next", n1Pub).ToArray();

        wrapped[^5] ^= 0xFF; // Manipuler

        var act = () => PeelLayer(wrapped, n1Priv);
        act.Should().Throw<Exception>("manipulert lag skal avvises");
    }

    [Fact]
    public void EachLayer_HasDifferentCiphertext()
    {
        var (_, n1Pub) = GenerateKeyPair();
        var (_, n2Pub) = GenerateKeyPair();
        var (_, n3Pub) = GenerateKeyPair();

        var payload = "Test"u8.ToArray();
        var layer3  = WrapLayer(payload, "server", n3Pub);
        var layer2  = WrapLayer(layer3,  "node3",  n2Pub);
        var layer1  = WrapLayer(layer2,  "node2",  n1Pub);

        layer1.Should().NotEqual(layer2);
        layer2.Should().NotEqual(layer3);
        layer1.Should().NotEqual(layer3);
    }
}
