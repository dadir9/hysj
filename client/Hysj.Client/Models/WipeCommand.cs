namespace Hysj.Client.Models;

public class WipeCommand
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public WipeType Type { get; set; }
    public string? ConversationId { get; set; }
    public Guid? TargetDeviceId { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}

public enum WipeType { Conversation, Device, All }
