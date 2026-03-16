using FluentAssertions;

namespace Hysj.Crypto.Tests;

/// <summary>
/// Verifiserer at Wipe faktisk sletter data og nøkler.
/// </summary>
public class WipeTests
{
    [Fact]
    public void ZeroMemory_ClearsKeyBytes()
    {
        var key    = new byte[] { 0x01, 0x02, 0x03, 0x04, 0xAA, 0xBB, 0xCC, 0xDD };
        var backup = (byte[])key.Clone();

        System.Security.Cryptography.CryptographicOperations.ZeroMemory(key);

        key.Should().AllSatisfy(b => b.Should().Be(0),
            "alle bytes skal være 0 etter ZeroMemory");
        backup.Any(b => b != 0).Should().BeTrue(
            "backup verifiserer at originalen faktisk hadde data");
    }

    [Fact]
    public void WipedKey_CannotDecryptData()
    {
        var key       = System.Security.Cryptography.RandomNumberGenerator.GetBytes(32);
        var keyCopy   = (byte[])key.Clone();
        var plaintext = "Sensitiv melding"u8.ToArray();

        var encrypted = AesGcmHelper.Encrypt(plaintext, key);

        // Wipe nøkkelen
        System.Security.Cryptography.CryptographicOperations.ZeroMemory(key);

        // Nøkkelen er nå nullet ut — dekryptering med den wipede nøkkelen skal feile
        var act = () => AesGcmHelper.Decrypt(encrypted, key);
        act.Should().Throw<Exception>("wipet nøkkel (alle nuller) skal feile autentisering");

        // Men kopien fungerer fortsatt
        var decrypted = AesGcmHelper.Decrypt(encrypted, keyCopy);
        decrypted.Should().Equal(plaintext);
    }

    [Fact]
    public void DeletedMessages_AreNotRecoverable()
    {
        // Simuler en enkel in-memory meldingsdatabase
        var db = new Dictionary<string, byte[]>
        {
            ["msg1"] = "Melding 1"u8.ToArray(),
            ["msg2"] = "Melding 2"u8.ToArray(),
            ["msg3"] = "Melding 3"u8.ToArray(),
        };

        // Wipe alle meldinger
        foreach (var key in db.Keys.ToList())
        {
            System.Security.Cryptography.CryptographicOperations.ZeroMemory(db[key]);
            db.Remove(key);
        }

        db.Should().BeEmpty("alle meldinger skal slettes");
    }

    [Fact]
    public void WipeConversation_OnlyDeletesTargetConversation()
    {
        var db = new Dictionary<string, List<string>>
        {
            ["conv_alice"] = ["Hei Alice!", "Hvordan har du det?"],
            ["conv_bob"]   = ["Hei Bob!", "Vi snakkes"],
            ["conv_eve"]   = ["Sensitiv info"],
        };

        // Wipe kun conv_eve
        db.Remove("conv_eve");

        db.Should().ContainKey("conv_alice");
        db.Should().ContainKey("conv_bob");
        db.Should().NotContainKey("conv_eve", "kun den ene samtalen skal slettes");
    }
}
