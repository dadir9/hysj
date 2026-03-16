using SQLite;

namespace Hysj.Client.Models;

[Table("conversations")]
public class Conversation
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string PeerUserId { get; set; } = string.Empty;
    public string PeerUsername { get; set; } = string.Empty;
    public string? GroupId { get; set; }
    public string? GroupName { get; set; }
    public bool IsGroup { get; set; }
    public bool IsAnonymous { get; set; }
    public string? MyAlias { get; set; }
    public string LastMessagePreview { get; set; } = string.Empty;
    public DateTimeOffset LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
    public bool IsDeleted { get; set; }
}
