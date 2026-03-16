namespace Hysj.Client.Models;

public class Group
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsAnonymous { get; set; }
    public bool MembersCanAdd { get; set; }
    public bool IsAdmin { get; set; }
    public string MyAlias { get; set; } = string.Empty;
    public List<GroupMember> Members { get; set; } = [];
}

public class GroupMember
{
    public Guid? UserId { get; set; }   // null for non-admins in anonymous group
    public string DisplayName { get; set; } = string.Empty;
    public string AvatarColor { get; set; } = string.Empty;
}
