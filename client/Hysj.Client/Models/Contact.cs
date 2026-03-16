using SQLite;

namespace Hysj.Client.Models;

[Table("contacts")]
public class Contact
{
    [PrimaryKey]
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string AvatarColor { get; set; } = "#7C3AED";
    public bool IsOnline { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public bool IsBlocked { get; set; }
    public DateTimeOffset AddedAt { get; set; } = DateTimeOffset.UtcNow;
}
