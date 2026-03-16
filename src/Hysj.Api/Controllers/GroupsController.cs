using System.Security.Claims;
using Hysj.Api.Constants;
using Hysj.Api.Data;
using Hysj.Api.DTOs;
using Hysj.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hysj.Api.Controllers;

[ApiController]
[Route("api/groups")]
[Authorize]
public class GroupsController(HysjDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupDto request)
    {
        var userId = GetUserId();

        var alias = PickAlias([]);
        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            IsAnonymous = request.IsAnonymous,
            MembersCanAdd = request.MembersCanAdd,
            CreatedByUserId = userId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.Groups.Add(group);
        db.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = userId,
            Alias = alias,
            JoinedAt = DateTimeOffset.UtcNow
        });

        if (request.InitialMemberUserIds is { Count: > 0 })
        {
            var usedAliases = new HashSet<string> { alias };
            foreach (var memberId in request.InitialMemberUserIds.Distinct().Where(id => id != userId))
            {
                var memberAlias = PickAlias(usedAliases);
                if (memberAlias is null) break;
                usedAliases.Add(memberAlias);
                db.GroupMembers.Add(new GroupMember
                {
                    GroupId = group.Id,
                    UserId = memberId,
                    Alias = memberAlias,
                    JoinedAt = DateTimeOffset.UtcNow
                });
            }
        }

        await db.SaveChangesAsync();
        return Ok(new { group.Id, group.Name, group.IsAnonymous, group.MembersCanAdd });
    }

    [HttpGet]
    public async Task<IActionResult> GetMyGroups()
    {
        var userId = GetUserId();
        var groups = await db.GroupMembers
            .Where(gm => gm.UserId == userId)
            .Select(gm => new
            {
                gm.Group.Id,
                gm.Group.Name,
                gm.Group.IsAnonymous,
                gm.Group.MembersCanAdd,
                IsAdmin = gm.Group.CreatedByUserId == userId,
                gm.Alias
            })
            .ToListAsync();

        return Ok(groups);
    }

    [HttpGet("{groupId:guid}")]
    public async Task<IActionResult> GetGroup(Guid groupId)
    {
        var userId = GetUserId();

        var group = await db.Groups
            .Include(g => g.Members)
            .ThenInclude(gm => gm.User)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group is null) return NotFound();

        var isMember = group.Members.Any(gm => gm.UserId == userId);
        if (!isMember) return Forbid();

        var isAdmin = group.CreatedByUserId == userId;
        var myAlias = group.Members.First(gm => gm.UserId == userId).Alias;

        var members = group.Members.Select(gm => new GroupMemberDto(
            UserId: (isAdmin || !group.IsAnonymous) ? gm.UserId : null,
            DisplayName: (isAdmin || !group.IsAnonymous) ? gm.User.Username : gm.Alias
        ));

        return Ok(new GroupResponseDto(
            group.Id, group.Name, group.IsAnonymous, group.MembersCanAdd, isAdmin, myAlias, members));
    }

    [HttpPost("{groupId:guid}/members")]
    public async Task<IActionResult> AddMember(Guid groupId, [FromBody] Guid newUserId)
    {
        var userId = GetUserId();
        var group = await db.Groups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group is null) return NotFound();

        var isMember = group.Members.Any(gm => gm.UserId == userId);
        if (!isMember) return Forbid();

        // kun admin kan adde hvis MembersCanAdd = false
        if (!group.MembersCanAdd && group.CreatedByUserId != userId)
            return Forbid();

        if (group.Members.Any(gm => gm.UserId == newUserId))
            return Conflict(new { error = "User is already a member." });

        var usedAliases = group.Members.Select(gm => gm.Alias).ToHashSet();
        var alias = PickAlias(usedAliases);
        if (alias is null)
            return BadRequest(new { error = "Group is full (alias pool exhausted)." });

        db.GroupMembers.Add(new GroupMember
        {
            GroupId = groupId,
            UserId = newUserId,
            Alias = alias,
            JoinedAt = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
        return Ok(new { UserId = newUserId, Alias = alias });
    }

    [HttpDelete("{groupId:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid groupId, Guid memberId)
    {
        var userId = GetUserId();
        var group = await db.Groups.FindAsync(groupId);
        if (group is null) return NotFound();
        if (group.CreatedByUserId != userId) return Forbid();
        if (memberId == userId) return BadRequest(new { error = "Admin cannot remove themselves. Transfer admin first." });

        var member = await db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == memberId);
        if (member is null) return NotFound();

        db.GroupMembers.Remove(member);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{groupId:guid}/admin")]
    public async Task<IActionResult> TransferAdmin(Guid groupId, [FromBody] Guid newAdminUserId)
    {
        var userId = GetUserId();
        var group = await db.Groups.FindAsync(groupId);
        if (group is null) return NotFound();
        if (group.CreatedByUserId != userId) return Forbid();

        var newAdminIsMember = await db.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == newAdminUserId);
        if (!newAdminIsMember)
            return BadRequest(new { error = "New admin must be a member of the group." });

        await db.Groups
            .Where(g => g.Id == groupId)
            .ExecuteUpdateAsync(s => s.SetProperty(g => g.CreatedByUserId, newAdminUserId));

        return NoContent();
    }

    [HttpPatch("{groupId:guid}/members-can-add")]
    public async Task<IActionResult> SetMembersCanAdd(Guid groupId, [FromBody] bool membersCanAdd)
    {
        var userId = GetUserId();
        var rows = await db.Groups
            .Where(g => g.Id == groupId && g.CreatedByUserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(g => g.MembersCanAdd, membersCanAdd));

        return rows > 0 ? NoContent() : NotFound();
    }

    [HttpDelete("{groupId:guid}")]
    public async Task<IActionResult> DeleteGroup(Guid groupId)
    {
        var userId = GetUserId();
        var rows = await db.Groups
            .Where(g => g.Id == groupId && g.CreatedByUserId == userId)
            .ExecuteDeleteAsync();

        return rows > 0 ? NoContent() : NotFound();
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static string? PickAlias(ICollection<string> usedAliases)
    {
        var available = AliasNames.Pool.Except(usedAliases).ToArray();
        if (available.Length == 0) return null;
        return available[Random.Shared.Next(available.Length)];
    }
}
