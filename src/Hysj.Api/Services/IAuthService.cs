using Hysj.Api.DTOs;

namespace Hysj.Api.Services;

public interface IAuthService
{
    Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto request, string ipAddress);
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request, string ipAddress, string? userAgent);
    bool VerifyTotp(byte[] totpSecret, string code);
}
