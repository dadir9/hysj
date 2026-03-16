namespace Hysj.Api.DTOs;

public record LoginRequestDto(
    string Username,
    string Password,
    string TotpCode
);
