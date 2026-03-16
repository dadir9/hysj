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
}
