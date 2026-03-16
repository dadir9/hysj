namespace Hysj.Client.Services;

public class AuthStateService : IAuthStateService
{
    public string? Token { get; private set; }
    public string? UserId { get; private set; }
    public string? Username { get; private set; }
    public bool IsAuthenticated => Token is not null;

    public void SetSession(string token, string userId, string username)
    {
        Token    = token;
        UserId   = userId;
        Username = username;
        Preferences.Set("auth_token",    token);
        Preferences.Set("auth_user_id",  userId);
        Preferences.Set("auth_username", username);
    }

    public void ClearSession()
    {
        Token    = null;
        UserId   = null;
        Username = null;
        Preferences.Remove("auth_token");
        Preferences.Remove("auth_user_id");
        Preferences.Remove("auth_username");
    }

    public void LoadFromPreferences()
    {
        Token    = Preferences.Get("auth_token",    null as string);
        UserId   = Preferences.Get("auth_user_id",  null as string);
        Username = Preferences.Get("auth_username", null as string);
    }
}
