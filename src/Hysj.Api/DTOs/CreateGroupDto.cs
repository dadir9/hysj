namespace Hysj.Api.DTOs;

public record CreateGroupDto(
    string Name,
    bool IsAnonymous,
    bool MembersCanAdd = false,
    List<Guid>? InitialMemberUserIds = null
);
