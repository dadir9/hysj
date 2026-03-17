namespace Hysj.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public byte[] Salt { get; set; } = [];
    public byte[] IdentityPublicKey { get; set; } = [];
    public byte[] IdentityDhPublicKey { get; set; } = [];
    public byte[] TotpSecret { get; set; } = [];
    public bool Has2FAEnabled { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }

    public ICollection<Device> Devices { get; set; } = [];
}
