namespace Hysj.Api.DTOs;

public record Toggle2FADto(bool Enable, string? TotpCode);
