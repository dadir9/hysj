namespace Hysj.Api.Models;

public class Group
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsAnonymous { get; set; }
    public bool MembersCanAdd { get; set; }   // true = alle kan adde, false = kun admin
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public User CreatedBy { get; set; } = null!;
    public ICollection<GroupMember> Members { get; set; } = [];
}
