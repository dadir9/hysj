using Hysj.Client.Models;
using DeviceInfo = Hysj.Client.Models.DeviceInfo;

namespace Hysj.Client.Services;

// ── Auth ──────────────────────────────────────────────────────────────
public record RegisterRequest(string Username, string Password);
public record RegisterResponse(string UserId, string TotpSecret, string TotpQrUri);
public record LoginRequest(string Username, string Password, string? TotpCode);
public record LoginResponse(string Token, string UserId, string Username);
public record SenderCertificateResponse(byte[] Certificate, DateTimeOffset ExpiresAt);

// ── Groups ────────────────────────────────────────────────────────────
public record CreateGroupRequest(string Name, bool IsAnonymous, bool MembersCanAdd);
public record GroupDto(Guid Id, string Name, bool IsAnonymous, bool MembersCanAdd, bool IsAdmin, string MyAlias);
public record GroupMemberDto(Guid? UserId, string DisplayName, string AvatarColor, bool IsAdmin);
public record AddMemberRequest(string Username);

// ── Keys ──────────────────────────────────────────────────────────────
public record PreKeyBundleDto(
    byte[] IdentityPublicKey,
    byte[] SignedPreKey,
    byte[] SignedPreKeySignature,
    byte[] OneTimePreKey,
    byte[] KyberPublicKey);

// ── Relay ─────────────────────────────────────────────────────────────
public record RelayNodeDto(string Address, byte[] PublicKey);

public interface IApiService
{
    // Auth
    Task<RegisterResponse> RegisterAsync(RegisterRequest req);
    Task<LoginResponse> LoginAsync(LoginRequest req);
    Task<SenderCertificateResponse> GetSenderCertificateAsync();

    // Keys
    Task UploadKeyBundleAsync(PreKeyBundleDto bundle);
    Task<PreKeyBundleDto?> GetKeyBundleAsync(string userId);

    // Devices
    Task<List<DeviceInfo>> GetDevicesAsync();
    Task DeleteDeviceAsync(Guid deviceId);

    // Groups
    Task<GroupDto> CreateGroupAsync(CreateGroupRequest req);
    Task<List<GroupDto>> GetGroupsAsync();
    Task<GroupDto?> GetGroupAsync(Guid groupId);
    Task DeleteGroupAsync(Guid groupId);
    Task<List<GroupMemberDto>> GetMembersAsync(Guid groupId);
    Task AddMemberAsync(Guid groupId, AddMemberRequest req);
    Task RemoveMemberAsync(Guid groupId, Guid userId);
    Task LeaveGroupAsync(Guid groupId);

    // Relay
    Task<List<RelayNodeDto>> GetRelayNodesAsync();

    // Wipe
    Task SendWipeAsync(WipeCommand wipe);
}
