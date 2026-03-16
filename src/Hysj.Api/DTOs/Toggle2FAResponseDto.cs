namespace Hysj.Api.DTOs;

public record Toggle2FAResponseDto(bool Has2FAEnabled, string? TotpQrUri);
