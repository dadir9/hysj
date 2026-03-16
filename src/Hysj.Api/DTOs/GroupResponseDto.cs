namespace Hysj.Api.DTOs;

public record GroupMemberDto(
    Guid? UserId,        // null for non-admin members in anonymous mode
    string DisplayName   // alias if anonymous, username if not
);

public record GroupResponseDto(
    Guid Id,
    string Name,
    bool IsAnonymous,
    bool IsAdmin,
    string MyAlias,
    IEnumerable<GroupMemberDto> Members
);
