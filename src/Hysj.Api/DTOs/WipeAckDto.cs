namespace Hysj.Api.DTOs;

public record WipeAckDto(
    string WipeId,
    Guid DeviceId,
    bool Success
);
