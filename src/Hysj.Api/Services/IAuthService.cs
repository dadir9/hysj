using Hysj.Api.DTOs;

namespace Hysj.Api.Services;

public interface IAuthService
{
    Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto request, string ipAddress);
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request, string ipAddress, string? userAgent);
    Task<RefreshResponseDto> RefreshTokenAsync(string refreshToken);
    bool VerifyTotp(byte[] totpSecret, string? code);
    Task<Toggle2FAResponseDto> Toggle2FAAsync(Guid userId, Toggle2FADto request);
}
