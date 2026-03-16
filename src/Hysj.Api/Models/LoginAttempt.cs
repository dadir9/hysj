namespace Hysj.Api.Models;

public class LoginAttempt
{
    public long Id { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public bool Success { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string? UserAgent { get; set; }
}
