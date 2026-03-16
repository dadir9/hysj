using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Hysj.Api.Data;
using Hysj.Api.DTOs;
using Hysj.Api.Models;
using Konscious.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OtpNet;

namespace Hysj.Api.Services;

public class AuthService(HysjDbContext db, IConfiguration config) : IAuthService
{
    public async Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto request, string ipAddress)
    {
        if (await db.Users.AnyAsync(u => u.Username == request.Username))
            throw new InvalidOperationException("Username already taken.");

        var salt = RandomNumberGenerator.GetBytes(32);
        var hash = HashPassword(request.Password, salt);
        var totpSecret = KeyGeneration.GenerateRandomKey(20);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            PasswordHash = hash,
            Salt = salt,
            IdentityPublicKey = request.IdentityPublicKey,
            TotpSecret = totpSecret,
            CreatedAt = DateTimeOffset.UtcNow,
            LastSeenAt = DateTimeOffset.UtcNow
        };

        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            DeviceName = request.DeviceName,
            SignedPreKey = request.SignedPreKey,
            SignedPreKeySig = request.SignedPreKeySig,
            IsOnline = false,
            LastActiveAt = DateTimeOffset.UtcNow,
            RegisteredAt = DateTimeOffset.UtcNow
        };

        var preKeys = request.OneTimePreKeys.Select(k => new PreKey
        {
            DeviceId = device.Id,
            PublicKey = k,
            IsUsed = false,
            CreatedAt = DateTimeOffset.UtcNow
        });

        db.Users.Add(user);
        db.Devices.Add(device);
        db.PreKeys.AddRange(preKeys);
        await db.SaveChangesAsync();

        var totpUri = new OtpUri(OtpType.Totp, totpSecret, user.Username, "Hysj").ToString();

        return new RegisterResponseDto(user.Id, device.Id, totpUri);
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request, string ipAddress, string? userAgent)
    {
        var success = false;
        try
        {
            var user = await db.Users
                .Include(u => u.Devices)
                .FirstOrDefaultAsync(u => u.Username == request.Username)
                ?? throw new UnauthorizedAccessException("Invalid credentials.");

            var hash = HashPassword(request.Password, user.Salt);
            if (!CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(hash),
                    Encoding.UTF8.GetBytes(user.PasswordHash)))
                throw new UnauthorizedAccessException("Invalid credentials.");

            if (!VerifyTotp(user.TotpSecret, request.TotpCode))
                throw new UnauthorizedAccessException("Invalid 2FA code.");

            user.LastSeenAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();

            var device = user.Devices.FirstOrDefault()
                ?? throw new UnauthorizedAccessException("No device registered.");

            var token = GenerateJwt(user, device);
            var expiryMinutes = config.GetValue<int>("Jwt:ExpiryMinutes");
            success = true;

            return new LoginResponseDto(token, user.Id, device.Id, DateTimeOffset.UtcNow.AddMinutes(expiryMinutes));
        }
        finally
        {
            db.LoginAttempts.Add(new LoginAttempt
            {
                IpAddress = ipAddress,
                Username = request.Username,
                Success = success,
                Timestamp = DateTimeOffset.UtcNow,
                UserAgent = userAgent
            });
            await db.SaveChangesAsync();
        }
    }

    public bool VerifyTotp(byte[] totpSecret, string code)
    {
        var totp = new Totp(totpSecret);
        return totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
    }

    private string HashPassword(string password, byte[] salt)
    {
        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            DegreeOfParallelism = 2,
            MemorySize = 65536,
            Iterations = 3
        };
        return Convert.ToBase64String(argon2.GetBytes(32));
    }

    private string GenerateJwt(User user, Device device)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiryMinutes = config.GetValue<int>("Jwt:ExpiryMinutes");

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim("deviceId", device.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
