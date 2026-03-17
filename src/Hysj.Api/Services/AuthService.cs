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
using NSec.Cryptography;
using OtpNet;

namespace Hysj.Api.Services;

public class AuthService(HysjDbContext db, IConfiguration config) : IAuthService
{
    public async Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto request, string ipAddress)
    {
        if (await db.Users.AnyAsync(u => u.Username == request.Username))
            throw new InvalidOperationException("Username already taken.");

        if (await db.Users.AnyAsync(u => u.PhoneNumber == request.PhoneNumber))
            throw new InvalidOperationException("Phone number already registered.");

        ValidateSignedPreKey(request.IdentityPublicKey, request.SignedPreKey, request.SignedPreKeySig);

        var salt = RandomNumberGenerator.GetBytes(32);
        var hash = HashPassword(request.Password, salt);
        var totpSecret = KeyGeneration.GenerateRandomKey(20);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = hash,
            Salt = salt,
            IdentityPublicKey = request.IdentityPublicKey,
            IdentityDhPublicKey = request.IdentityDhPublicKey ?? [],
            TotpSecret = EncryptTotpSecret(totpSecret),
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
            KyberPublicKey = request.KyberPublicKey ?? [],
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

        // Use the plain (unencrypted) secret for the TOTP URI shown to the user
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
                .FirstOrDefaultAsync(u => u.PhoneNumber == request.PhoneNumber)
                ?? throw new UnauthorizedAccessException("Invalid credentials.");

            var hash = HashPassword(request.Password, user.Salt);
            if (!CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(hash),
                    Encoding.UTF8.GetBytes(user.PasswordHash)))
                throw new UnauthorizedAccessException("Invalid credentials.");

            if (user.Has2FAEnabled && !VerifyTotp(user.TotpSecret, request.TotpCode))
                throw new UnauthorizedAccessException("Invalid 2FA code.");

            user.LastSeenAt = DateTimeOffset.UtcNow;

            var device = user.Devices.FirstOrDefault()
                ?? throw new UnauthorizedAccessException("No device registered.");

            var token = GenerateJwt(user, device);
            var refreshToken = await CreateRefreshTokenAsync(user.Id, device.Id);
            var expiryMinutes = config.GetValue("Jwt:ExpiryMinutes", 60);
            success = true;

            return new LoginResponseDto(token, refreshToken, user.Id, device.Id, DateTimeOffset.UtcNow.AddMinutes(expiryMinutes));
        }
        finally
        {
            try
            {
                db.LoginAttempts.Add(new LoginAttempt
                {
                    IpAddress = ipAddress,
                    Username = request.PhoneNumber,
                    Success = success,
                    Timestamp = DateTimeOffset.UtcNow,
                    UserAgent = userAgent
                });
                await db.SaveChangesAsync();
            }
            catch
            {
                // Don't let login attempt logging swallow the original exception
            }
        }
    }

    public async Task<Toggle2FAResponseDto> Toggle2FAAsync(Guid userId, Toggle2FADto request)
    {
        var user = await db.Users.FindAsync(userId)
            ?? throw new UnauthorizedAccessException("User not found.");

        if (request.Enable)
        {
            if (!VerifyTotp(user.TotpSecret, request.TotpCode))
                throw new UnauthorizedAccessException("Invalid 2FA code.");

            user.Has2FAEnabled = true;
            await db.SaveChangesAsync();

            var plainSecret = DecryptTotpSecret(user.TotpSecret);
            var totpUri = new OtpUri(OtpType.Totp, plainSecret, user.Username, "Hysj").ToString();
            return new Toggle2FAResponseDto(true, totpUri);
        }
        else
        {
            if (!VerifyTotp(user.TotpSecret, request.TotpCode))
                throw new UnauthorizedAccessException("Invalid 2FA code. A valid TOTP code is required to disable 2FA.");

            user.Has2FAEnabled = false;
            await db.SaveChangesAsync();
            return new Toggle2FAResponseDto(false, null);
        }
    }

    public bool VerifyTotp(byte[] encryptedTotpSecret, string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return false;
        var plainSecret = DecryptTotpSecret(encryptedTotpSecret);
        var totp = new Totp(plainSecret);
        return totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
    }

    private string HashPassword(string password, byte[] salt)
    {
        using var argon2 = new Konscious.Security.Cryptography.Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            DegreeOfParallelism = 4,
            MemorySize = 65536,
            Iterations = 3
        };
        return Convert.ToBase64String(argon2.GetBytes(32));
    }

    /// <summary>
    /// Validate SignedPreKey by performing full Ed25519 signature verification.
    /// Verifies that signedPreKeySig is a valid Ed25519 signature of signedPreKey
    /// produced by the private key corresponding to identityPublicKey.
    /// </summary>
    public static void ValidateSignedPreKey(byte[] identityPublicKey, byte[] signedPreKey, byte[] signedPreKeySig)
    {
        if (identityPublicKey is not { Length: 32 })
            throw new ArgumentException("IdentityPublicKey must be 32 bytes (Ed25519).");
        if (signedPreKey is not { Length: 32 })
            throw new ArgumentException("SignedPreKey must be 32 bytes.");
        if (signedPreKeySig is not { Length: 64 })
            throw new ArgumentException("SignedPreKeySig must be 64 bytes (Ed25519 signature).");

        if (identityPublicKey.All(b => b == 0))
            throw new ArgumentException("IdentityPublicKey cannot be all zeros.");

        var algorithm = SignatureAlgorithm.Ed25519;
        PublicKey publicKey;
        try
        {
            publicKey = PublicKey.Import(algorithm, identityPublicKey, KeyBlobFormat.RawPublicKey);
        }
        catch (Exception ex)
        {
            throw new ArgumentException("IdentityPublicKey is not a valid Ed25519 public key.", ex);
        }

        if (!algorithm.Verify(publicKey, signedPreKey, signedPreKeySig))
            throw new ArgumentException("SignedPreKey signature verification failed. The signature does not match the identity key.");
    }

    /// <summary>Encrypt a TOTP secret using AES-256-GCM with a key derived from JWT secret.</summary>
    private byte[] EncryptTotpSecret(byte[] plainSecret)
    {
        var keyBytes = DeriveEncryptionKey();
        var nonce = RandomNumberGenerator.GetBytes(12); // 96-bit nonce for AES-GCM
        var ciphertext = new byte[plainSecret.Length];
        var tag = new byte[16]; // 128-bit auth tag

        using var aes = new AesGcm(keyBytes, 16);
        aes.Encrypt(nonce, plainSecret, ciphertext, tag);

        // Format: [12-byte nonce][16-byte tag][ciphertext]
        var result = new byte[12 + 16 + ciphertext.Length];
        nonce.CopyTo(result, 0);
        tag.CopyTo(result, 12);
        ciphertext.CopyTo(result, 28);
        return result;
    }

    /// <summary>Decrypt a TOTP secret encrypted with EncryptTotpSecret.</summary>
    private byte[] DecryptTotpSecret(byte[] encrypted)
    {
        // Support unencrypted legacy secrets (raw 20-byte TOTP keys)
        if (encrypted.Length <= 28)
            return encrypted;

        var keyBytes = DeriveEncryptionKey();
        var nonce = encrypted[..12];
        var tag = encrypted[12..28];
        var ciphertext = encrypted[28..];
        var plaintext = new byte[ciphertext.Length];

        using var aes = new AesGcm(keyBytes, 16);
        aes.Decrypt(nonce, ciphertext, tag, plaintext);
        return plaintext;
    }

    private byte[] DeriveEncryptionKey()
    {
        var secret = Encoding.UTF8.GetBytes(config["Jwt:Secret"]!);
        return SHA256.HashData(secret); // 32 bytes = AES-256
    }

    public async Task<RefreshResponseDto> RefreshTokenAsync(string refreshTokenValue)
    {
        var tokenHash = HashRefreshToken(refreshTokenValue);
        var storedToken = await db.RefreshTokens
            .Include(rt => rt.User)
            .ThenInclude(u => u.Devices)
            .Include(rt => rt.Device)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash && !rt.IsRevoked);

        if (storedToken is null || storedToken.ExpiresAt < DateTimeOffset.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        // Revoke the old token (rotation)
        storedToken.IsRevoked = true;

        var user = storedToken.User;
        var device = storedToken.Device;
        var newJwt = GenerateJwt(user, device);
        var newRefreshToken = await CreateRefreshTokenAsync(user.Id, device.Id);
        var expiryMinutes = config.GetValue("Jwt:ExpiryMinutes", 60);

        await db.SaveChangesAsync();

        return new RefreshResponseDto(newJwt, newRefreshToken, DateTimeOffset.UtcNow.AddMinutes(expiryMinutes));
    }

    private async Task<string> CreateRefreshTokenAsync(Guid userId, Guid deviceId)
    {
        var tokenValue = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var refreshDays = config.GetValue("Jwt:RefreshTokenDays", 30);

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            DeviceId = deviceId,
            TokenHash = HashRefreshToken(tokenValue),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(refreshDays),
            CreatedAt = DateTimeOffset.UtcNow,
            IsRevoked = false
        };

        db.RefreshTokens.Add(refreshToken);
        await db.SaveChangesAsync();

        return tokenValue;
    }

    private static string HashRefreshToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
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
