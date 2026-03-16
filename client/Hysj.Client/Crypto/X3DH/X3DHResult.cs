namespace Hysj.Client.Crypto.X3DH;

public record X3DHResult(
    byte[] SharedSecret,
    byte[] EphemeralPublicKey,
    byte[] KyberCiphertext    // included in first message header
);
