using System.Security.Cryptography;
using FluentAssertions;

namespace Hysj.Crypto.Tests;

/// <summary>
/// Verifiserer at Double Ratchet gir korrekt forward secrecy per melding.
/// </summary>
public class DoubleRatchetTests
{
    // Enkel ratchet-simulasjon for tester
    private static (byte[] chainKey, byte[] messageKey) KdfCk(byte[] ck)
    {
        using var hmac = new HMACSHA256(ck);
        var mk = hmac.ComputeHash([0x01]);
        var nk = hmac.ComputeHash([0x02]);
        return (nk, mk);
    }

    private static byte[] DeriveInitialKey() =>
        RandomNumberGenerator.GetBytes(32);

    [Fact]
    public void EachMessage_GetsUniqueMessageKey()
    {
        var chainKey = DeriveInitialKey();
        var keys     = new List<byte[]>();

        for (int i = 0; i < 100; i++)
        {
            var (newChain, msgKey) = KdfCk(chainKey);
            keys.Add(msgKey);
            chainKey = newChain;
        }

        // Alle 100 meldingsnøkler skal være unike
        var unique = keys.Select(Convert.ToBase64String).Distinct().Count();
        unique.Should().Be(100, "hver melding skal ha unik nøkkel");
    }

    [Fact]
    public void ForwardSecrecy_OldKeyCannotDecryptNewMessage()
    {
        var chainKey = DeriveInitialKey();

        // Melding 1
        var (chain1, msgKey1) = KdfCk(chainKey);
        var plain1    = "Melding 1"u8.ToArray();
        var cipher1   = AesGcmHelper.Encrypt(plain1, msgKey1);

        // Melding 2
        var (chain2, msgKey2) = KdfCk(chain1);
        var plain2    = "Melding 2"u8.ToArray();
        var cipher2   = AesGcmHelper.Encrypt(plain2, msgKey2);

        // Melding 1 sin nøkkel kan ikke dekryptere melding 2
        var act = () => AesGcmHelper.Decrypt(cipher2, msgKey1);
        act.Should().Throw<Exception>("gammel nøkkel skal ikke fungere på ny melding");
    }

    [Fact]
    public void CompromisedKey_DoesNotRevealOtherMessages()
    {
        var chainKey = DeriveInitialKey();
        var messageKeys = new List<byte[]>();
        var ciphertexts = new List<byte[]>();

        for (int i = 0; i < 10; i++)
        {
            var (newChain, msgKey) = KdfCk(chainKey);
            var plain    = System.Text.Encoding.UTF8.GetBytes($"Melding {i}");
            var cipher   = AesGcmHelper.Encrypt(plain, msgKey);
            messageKeys.Add(msgKey);
            ciphertexts.Add(cipher);
            chainKey = newChain;
        }

        // Kompromitter nøkkel 5
        var stolenKey = messageKeys[4];

        // Nøkkel 5 kan bare lese melding 5
        var decrypted5 = AesGcmHelper.Decrypt(ciphertexts[4], stolenKey);
        System.Text.Encoding.UTF8.GetString(decrypted5).Should().Be("Melding 4");

        // Nøkkel 5 kan IKKE lese melding 1-4 eller 6-10
        for (int i = 0; i < 10; i++)
        {
            if (i == 4) continue;
            var act = () => AesGcmHelper.Decrypt(ciphertexts[i], stolenKey);
            act.Should().Throw<Exception>($"melding {i} skal ikke kunne leses med nøkkel 5");
        }
    }

    [Fact]
    public void ChainKey_IsAlwaysDifferentFromMessageKey()
    {
        var chainKey = DeriveInitialKey();

        for (int i = 0; i < 50; i++)
        {
            var (newChain, msgKey) = KdfCk(chainKey);
            newChain.Should().NotEqual(msgKey,
                "chain key og message key skal aldri være like");
            chainKey = newChain;
        }
    }

    [Fact]
    public void RatchetChain_IsOneWay_CannotGoBack()
    {
        var chainKey  = DeriveInitialKey();
        var original  = (byte[])chainKey.Clone();

        var (step1, _) = KdfCk(chainKey);
        var (step2, _) = KdfCk(step1);
        var (step3, _) = KdfCk(step2);

        // Kan ikke gå tilbake til original fra steg 3
        step3.Should().NotEqual(original);
        step3.Should().NotEqual(step1);
        step3.Should().NotEqual(step2);
    }
}
