namespace Hysj.Api.DTOs;

public record LoginResponseDto(
    string Token,
    Guid UserId,
    Guid DeviceId,
    DateTimeOffset ExpiresAt
);
