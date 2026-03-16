namespace Hysj.Client.Models;

public class DeviceInfo
{
    public Guid Id { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public bool IsCurrent { get; set; }
    public DateTimeOffset LastActiveAt { get; set; }
    public DateTimeOffset RegisteredAt { get; set; }
}
