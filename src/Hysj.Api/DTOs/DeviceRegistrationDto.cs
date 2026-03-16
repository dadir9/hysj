namespace Hysj.Api.DTOs;

public record DeviceRegistrationDto(
    string DeviceName,
    byte[] SignedPreKey,
    byte[] SignedPreKeySig,
    byte[][] OneTimePreKeys,
    string? PushToken = null
);
