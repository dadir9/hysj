namespace Hysj.Api.DTOs;

public record LoginRequestDto(
    string PhoneNumber,
    string Password,
    string? TotpCode
);
