using SQLite;

namespace Hysj.Client.Models;

[Table("messages")]
public class Message
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ConversationId { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public string SenderAlias { get; set; } = string.Empty;  // alias in anon group
    public string SenderAvatarColor { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;      // decrypted locally
    public MessageType Type { get; set; } = MessageType.Text;
    public MessageStatus Status { get; set; } = MessageStatus.Sent;
    public DateTimeOffset SentAt { get; set; }
    public bool IsOutgoing { get; set; }
}

public enum MessageType { Text, Audio, Image }
public enum MessageStatus { Sent, Delivered, Read, Failed }
