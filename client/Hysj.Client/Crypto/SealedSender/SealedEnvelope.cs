using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Hysj.Client.Crypto.SealedSender;

/// <summary>
/// Sealed Sender: krypter meldingen slik at serveren ikke vet hvem som sender.
/// Avsender-info er kryptert INNE i meldingen.
/// </summary>
public static class SealedEnvelope
{
    public static byte[] Seal(
        byte[] plaintext,
        Guid senderId,
        byte[] senderCertificate,
        byte[] recipientPublicKey)
    {
        // 1. Generer ephemeral nøkkelpar (engangs)
        using var ephemeral = EccKeyPair.Generate();

        // 2. ECDH med mottakers offentlige nøkkel
        byte[] sharedSecret = ephemeral.DeriveSharedSecret(recipientPublicKey);
        byte[] encKey = HkdfDeriver.DeriveKey(sharedSecret, null, "hysj-sealed-enc", 32);

        // 3. Bygg innhold: avsender-ID + sertifikat + melding
        var inner = new SealedInner(senderId, senderCertificate, plaintext);
        byte[] innerBytes = JsonSerializer.SerializeToUtf8Bytes(inner);

        // 4. Krypter med AES-256-GCM
        byte[] encrypted = AesGcmCipher.Encrypt(innerBytes, encKey);

        CryptographicOperations.ZeroMemory(sharedSecret);
        CryptographicOperations.ZeroMemory(encKey);

        // 5. Returner: ephemeral public key + kryptert payload (INGEN avsender-info)
        byte[] pub = ephemeral.ExportPublicKey();
        byte[] result = new byte[4 + pub.Length + encrypted.Length];
        BitConverter.GetBytes(pub.Length).CopyTo(result, 0);
        pub.CopyTo(result, 4);
        encrypted.CopyTo(result, 4 + pub.Length);
        return result;
    }

    private record SealedInner(Guid SenderId, byte[] Certificate, byte[] Payload);
}
