namespace Hysj.Api.DTOs;

public record RefreshTokenRequestDto(string RefreshToken);

public record RefreshResponseDto(
    string Token,
    string RefreshToken,
    DateTimeOffset ExpiresAt
);
