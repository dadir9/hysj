namespace Hysj.Client.Services;

public interface IAuthStateService
{
    string? Token { get; }
    string? UserId { get; }
    string? Username { get; }
    bool IsAuthenticated { get; }
    void SetSession(string token, string userId, string username);
    void ClearSession();
}
