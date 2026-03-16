namespace Hysj.Api.Models;

public class GroupMember
{
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
    public string Alias { get; set; } = string.Empty;
    public DateTimeOffset JoinedAt { get; set; }

    public Group Group { get; set; } = null!;
    public User User { get; set; } = null!;
}
