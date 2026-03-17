using System.Security.Claims;
using Hysj.Api.DTOs;
using Hysj.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hysj.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService, ICertificateService certificateService) : ControllerBase
{
    /// <summary>
    /// Returns the server's Ed25519 public key used to verify sender certificates.
    /// Clients should cache this and use it to validate certificates in unsealed messages.
    /// </summary>
    [HttpGet("server-public-key")]
    public IActionResult GetServerPublicKey()
    {
        var publicKey = certificateService.GetServerPublicKey();
        return Ok(new { PublicKey = publicKey });
    }

    [HttpPost("sender-certificate")]
    [Authorize]
    public IActionResult GetSenderCertificate()
    {
        var userId   = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue("sub");
        var username = User.FindFirstValue(ClaimTypes.Name)
                    ?? User.FindFirstValue("unique_name");
        var expires  = DateTimeOffset.UtcNow.AddHours(24);

        var cert = certificateService.IssueCertificate(userId!, username!, expires);

        return Ok(new { Certificate = cert, ExpiresAt = expires });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var result = await authService.RegisterAsync(request, ip);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("toggle-2fa")]
    [Authorize]
    public async Task<IActionResult> Toggle2FA([FromBody] Toggle2FADto request)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        try
        {
            var result = await authService.Toggle2FAAsync(userId, request);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = HttpContext.Request.Headers.UserAgent.ToString();
            var result = await authService.LoginAsync(request, ip, userAgent);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { error = "Invalid credentials or 2FA code." });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequestDto request)
    {
        try
        {
            var result = await authService.RefreshTokenAsync(request.RefreshToken);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { error = "Invalid or expired refresh token." });
        }
    }
}
