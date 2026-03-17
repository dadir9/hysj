namespace Hysj.Api.DTOs;

public record RegisterRequestDto(
    string Username,
    string PhoneNumber,
    string Password,
    byte[] IdentityPublicKey,
    string DeviceName,
    byte[] SignedPreKey,
    byte[] SignedPreKeySig,
    byte[][] OneTimePreKeys,
    byte[]? KyberPublicKey = null,
    byte[]? IdentityDhPublicKey = null
);
