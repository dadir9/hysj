using System.Security.Claims;
using Hysj.Api.Data;
using Hysj.Api.DTOs;
using Hysj.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hysj.Api.Controllers;

[ApiController]
[Route("api/devices")]
[Authorize]
public class DevicesController(HysjDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMyDevices()
    {
        var userId = GetUserId();
        var devices = await db.Devices
            .Where(d => d.UserId == userId)
            .Select(d => new
            {
                d.Id,
                d.DeviceName,
                d.IsOnline,
                d.LastActiveAt,
                d.RegisteredAt
            })
            .ToListAsync();

        return Ok(devices);
    }

    [HttpPost]
    public async Task<IActionResult> RegisterDevice([FromBody] DeviceRegistrationDto request)
    {
        var userId = GetUserId();

        var device = new Device
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            DeviceName = request.DeviceName,
            PushToken = request.PushToken,
            SignedPreKey = request.SignedPreKey,
            SignedPreKeySig = request.SignedPreKeySig,
            IsOnline = false,
            LastActiveAt = DateTimeOffset.UtcNow,
            RegisteredAt = DateTimeOffset.UtcNow
        };

        var preKeys = request.OneTimePreKeys.Select(k => new PreKey
        {
            DeviceId = device.Id,
            PublicKey = k,
            IsUsed = false,
            CreatedAt = DateTimeOffset.UtcNow
        });

        db.Devices.Add(device);
        db.PreKeys.AddRange(preKeys);
        await db.SaveChangesAsync();

        return Ok(new { device.Id });
    }

    [HttpDelete("{deviceId:guid}")]
    public async Task<IActionResult> RemoveDevice(Guid deviceId)
    {
        var userId = GetUserId();
        var device = await db.Devices.FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == userId);

        if (device is null) return NotFound();

        db.Devices.Remove(device);
        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("{deviceId:guid}/push-token")]
    public async Task<IActionResult> UpdatePushToken(Guid deviceId, [FromBody] string pushToken)
    {
        var userId = GetUserId();
        var rows = await db.Devices
            .Where(d => d.Id == deviceId && d.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.PushToken, pushToken));

        return rows > 0 ? NoContent() : NotFound();
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
