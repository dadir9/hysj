namespace Hysj.Api.DTOs;

public record CreateGroupDto(
    string Name,
    bool IsAnonymous,
    List<Guid>? InitialMemberUserIds = null
);
