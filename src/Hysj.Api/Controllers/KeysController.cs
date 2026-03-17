using System.Security.Claims;
using Hysj.Api.Data;
using Hysj.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hysj.Api.Controllers;

[ApiController]
[Route("api/keys")]
[Authorize]
public class KeysController(HysjDbContext db) : ControllerBase
{
    [HttpGet("{deviceId:guid}")]
    public async Task<IActionResult> GetPreKeyBundle(Guid deviceId)
    {
        var device = await db.Devices
            .Include(d => d.User)
            .Include(d => d.PreKeys.Where(k => !k.IsUsed))
            .FirstOrDefaultAsync(d => d.Id == deviceId);

        if (device is null) return NotFound();

        var preKey = device.PreKeys.FirstOrDefault();
        if (preKey is null) return StatusCode(503, new { error = "No pre-keys available." });

        preKey.IsUsed = true;
        await db.SaveChangesAsync();

        return Ok(new
        {
            DeviceId = device.Id,
            IdentityPublicKey = device.User.IdentityPublicKey,
            IdentityDhPublicKey = device.User.IdentityDhPublicKey,
            device.SignedPreKey,
            device.SignedPreKeySig,
            OneTimePreKey = preKey.PublicKey,
            PreKeyId = preKey.Id,
            KyberPublicKey = device.KyberPublicKey
        });
    }

    [HttpPost("{deviceId:guid}/prekeys")]
    public async Task<IActionResult> UploadPreKeys(Guid deviceId, [FromBody] byte[][] publicKeys)
    {
        var userId = GetUserId();
        var device = await db.Devices.FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == userId);
        if (device is null) return NotFound();

        var preKeys = publicKeys.Select(k => new PreKey
        {
            DeviceId = deviceId,
            PublicKey = k,
            IsUsed = false,
            CreatedAt = DateTimeOffset.UtcNow
        });

        db.PreKeys.AddRange(preKeys);
        await db.SaveChangesAsync();

        return Ok(new { uploaded = publicKeys.Length });
    }

    [HttpGet("{deviceId:guid}/prekeys/count")]
    public async Task<IActionResult> GetPreKeyCount(Guid deviceId)
    {
        var userId = GetUserId();
        var device = await db.Devices.FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == userId);
        if (device is null) return NotFound();

        var count = await db.PreKeys.CountAsync(k => k.DeviceId == deviceId && !k.IsUsed);
        return Ok(new { count });
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
