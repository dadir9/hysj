using System.Net.Http.Json;
using Hysj.Client.Models;
using DeviceInfo = Hysj.Client.Models.DeviceInfo;

namespace Hysj.Client.Services;

public class ApiService : IApiService
{
    private readonly HttpClient _http;
    private readonly IAuthStateService _auth;

    public ApiService(IAuthStateService auth)
    {
        _auth = auth;
        _http = new HttpClient { BaseAddress = new Uri("https://localhost:7100/") };
    }

    private void SetAuthHeader()
    {
        _http.DefaultRequestHeaders.Authorization =
            _auth.Token is { } t
                ? new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", t)
                : null;
    }

    // ── Auth ─────────────────────────────────────────────────────────
    public async Task<RegisterResponse> RegisterAsync(RegisterRequest req)
    {
        var res = await _http.PostAsJsonAsync("api/auth/register", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<RegisterResponse>())!;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest req)
    {
        var res = await _http.PostAsJsonAsync("api/auth/login", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<LoginResponse>())!;
    }

    public async Task<SenderCertificateResponse> GetSenderCertificateAsync()
    {
        SetAuthHeader();
        var res = await _http.PostAsync("api/auth/sender-certificate", null);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<SenderCertificateResponse>())!;
    }

    // ── Keys ─────────────────────────────────────────────────────────
    public async Task UploadKeyBundleAsync(PreKeyBundleDto bundle)
    {
        SetAuthHeader();
        var res = await _http.PostAsJsonAsync("api/keys/bundle", bundle);
        res.EnsureSuccessStatusCode();
    }

    public async Task<PreKeyBundleDto?> GetKeyBundleAsync(string userId)
    {
        SetAuthHeader();
        var res = await _http.GetAsync($"api/keys/{userId}");
        if (!res.IsSuccessStatusCode) return null;
        return await res.Content.ReadFromJsonAsync<PreKeyBundleDto>();
    }

    // ── Devices ──────────────────────────────────────────────────────
    public async Task<List<DeviceInfo>> GetDevicesAsync()
    {
        SetAuthHeader();
        return await _http.GetFromJsonAsync<List<DeviceInfo>>("api/devices") ?? [];
    }

    public async Task DeleteDeviceAsync(Guid deviceId)
    {
        SetAuthHeader();
        await _http.DeleteAsync($"api/devices/{deviceId}");
    }

    // ── Groups ───────────────────────────────────────────────────────
    public async Task<GroupDto> CreateGroupAsync(CreateGroupRequest req)
    {
        SetAuthHeader();
        var res = await _http.PostAsJsonAsync("api/groups", req);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<GroupDto>())!;
    }

    public async Task<List<GroupDto>> GetGroupsAsync()
    {
        SetAuthHeader();
        return await _http.GetFromJsonAsync<List<GroupDto>>("api/groups") ?? [];
    }

    public async Task<GroupDto?> GetGroupAsync(Guid groupId)
    {
        SetAuthHeader();
        var res = await _http.GetAsync($"api/groups/{groupId}");
        if (!res.IsSuccessStatusCode) return null;
        return await res.Content.ReadFromJsonAsync<GroupDto>();
    }

    public async Task DeleteGroupAsync(Guid groupId)
    {
        SetAuthHeader();
        await _http.DeleteAsync($"api/groups/{groupId}");
    }

    public async Task<List<GroupMemberDto>> GetMembersAsync(Guid groupId)
    {
        SetAuthHeader();
        return await _http.GetFromJsonAsync<List<GroupMemberDto>>($"api/groups/{groupId}/members") ?? [];
    }

    public async Task AddMemberAsync(Guid groupId, AddMemberRequest req)
    {
        SetAuthHeader();
        var res = await _http.PostAsJsonAsync($"api/groups/{groupId}/members", req);
        res.EnsureSuccessStatusCode();
    }

    public async Task RemoveMemberAsync(Guid groupId, Guid userId)
    {
        SetAuthHeader();
        await _http.DeleteAsync($"api/groups/{groupId}/members/{userId}");
    }

    public async Task LeaveGroupAsync(Guid groupId)
    {
        SetAuthHeader();
        await _http.PostAsync($"api/groups/{groupId}/leave", null);
    }

    // ── Relay ─────────────────────────────────────────────────────────
    public async Task<List<RelayNodeDto>> GetRelayNodesAsync()
    {
        SetAuthHeader();
        return await _http.GetFromJsonAsync<List<RelayNodeDto>>("api/relay/nodes") ?? [];
    }

    // ── Wipe ─────────────────────────────────────────────────────────
    public async Task SendWipeAsync(WipeCommand wipe)
    {
        SetAuthHeader();
        await _http.PostAsJsonAsync("api/wipe", wipe);
    }
}
