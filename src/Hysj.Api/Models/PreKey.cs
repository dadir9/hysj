namespace Hysj.Api.Models;

public class PreKey
{
    public int Id { get; set; }
    public Guid DeviceId { get; set; }
    public byte[] PublicKey { get; set; } = [];
    public bool IsUsed { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Device Device { get; set; } = null!;
}
