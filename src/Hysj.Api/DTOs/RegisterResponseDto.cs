namespace Hysj.Api.DTOs;

public record RegisterResponseDto(
    Guid UserId,
    Guid DeviceId,
    string TotpQrUri
);
