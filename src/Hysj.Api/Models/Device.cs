namespace Hysj.Api.Models;

public class Device
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public string? PushToken { get; set; }
    public byte[] SignedPreKey { get; set; } = [];
    public byte[] SignedPreKeySig { get; set; } = [];
    public bool IsOnline { get; set; }
    public DateTimeOffset LastActiveAt { get; set; }
    public DateTimeOffset RegisteredAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<PreKey> PreKeys { get; set; } = [];
}
