namespace Hysj.Api.DTOs;

public record RegisterRequestDto(
    string Username,
    string Password,
    byte[] IdentityPublicKey,
    string DeviceName,
    byte[] SignedPreKey,
    byte[] SignedPreKeySig,
    byte[][] OneTimePreKeys
);
