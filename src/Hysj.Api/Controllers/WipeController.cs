using System.Security.Claims;
using Hysj.Api.Data;
using Hysj.Api.DTOs;
using Hysj.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hysj.Api.Controllers;

[ApiController]
[Route("api/wipe")]
[Authorize]
public class WipeController(IWipeService wipeService, IAuthService authService, HysjDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> IssueWipe([FromBody] WipeCommandDto command)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var user = await db.Users.FindAsync(userId);
        if (user is null) return Unauthorized();

        if (!authService.VerifyTotp(user.TotpSecret, command.TotpCode))
            return Unauthorized(new { error = "Invalid 2FA code." });

        var wipeId = await wipeService.IssueWipeAsync(userId, command);
        return Ok(new { wipeId });
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmWipe([FromBody] WipeAckDto ack)
    {
        await wipeService.ConfirmWipeAsync(ack);
        return Ok();
    }
}
