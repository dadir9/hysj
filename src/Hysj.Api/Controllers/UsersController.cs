using Hysj.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hysj.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(HysjDbContext db) : ControllerBase
{
    [HttpGet("lookup")]
    public async Task<IActionResult> Lookup([FromQuery] string username)
    {
        var user = await db.Users
            .Include(u => u.Devices)
            .Where(u => u.Username == username)
            .Select(u => new {
                u.Id,
                u.Username,
                DeviceIds = u.Devices.Select(d => d.Id).ToList()
            })
            .FirstOrDefaultAsync();

        return user is null ? NotFound() : Ok(user);
    }

    /// <summary>
    /// Returns online status and lastSeenAt for a peer user.
    /// A user is considered online if any of their devices is online.
    /// </summary>
    [HttpGet("{userId:guid}/status")]
    public async Task<IActionResult> GetUserStatus(Guid userId)
    {
        var user = await db.Users
            .Include(u => u.Devices)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return NotFound();

        var isOnline = user.Devices.Any(d => d.IsOnline);
        var lastSeenAt = user.Devices
            .Select(d => d.LastActiveAt)
            .DefaultIfEmpty(user.LastSeenAt)
            .Max();

        return Ok(new { IsOnline = isOnline, LastSeenAt = lastSeenAt });
    }

    /// <summary>
    /// Batch status lookup — returns online status for multiple users in one request.
    /// Accepts up to 100 user IDs.
    /// </summary>
    [HttpPost("status-batch")]
    public async Task<IActionResult> GetUserStatusBatch([FromBody] Guid[] userIds)
    {
        if (userIds is null || userIds.Length == 0)
            return Ok(Array.Empty<object>());

        if (userIds.Length > 100)
            return BadRequest(new { error = "Maximum 100 user IDs per request." });

        var distinctIds = userIds.Distinct().ToList();

        var users = await db.Users
            .Include(u => u.Devices)
            .Where(u => distinctIds.Contains(u.Id))
            .ToListAsync();

        var results = distinctIds.Select(id =>
        {
            var user = users.FirstOrDefault(u => u.Id == id);
            if (user is null)
                return new { UserId = id, IsOnline = false, LastSeenAt = (DateTimeOffset?)null };

            var isOnline = user.Devices.Any(d => d.IsOnline);
            var lastSeenAt = user.Devices
                .Select(d => d.LastActiveAt)
                .DefaultIfEmpty(user.LastSeenAt)
                .Max();

            return new { UserId = id, IsOnline = isOnline, LastSeenAt = (DateTimeOffset?)lastSeenAt };
        });

        return Ok(results);
    }
}
