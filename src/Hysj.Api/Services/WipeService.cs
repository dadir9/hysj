using System.Text.Json;
using Hysj.Api.Data;
using Hysj.Api.DTOs;
using Hysj.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace Hysj.Api.Services;

public class WipeService(
    HysjDbContext db,
    IConnectionMultiplexer redis,
    IHubContext<ChatHub> hubContext,
    IConfiguration config) : IWipeService
{
    private readonly IDatabase _cache = redis.GetDatabase();
    private readonly int _wipeTtlSeconds = config.GetValue<int>("WipePolicy:TtlSeconds");

    public async Task<string> IssueWipeAsync(Guid issuerId, WipeCommandDto command)
    {
        var wipeId = Guid.NewGuid().ToString();

        var targetDeviceIds = await ResolveTargetDevicesAsync(issuerId, command);

        foreach (var deviceId in targetDeviceIds)
        {
            var key = $"wipe:{deviceId}:{wipeId}";
            var payload = JsonSerializer.Serialize(new { command.Type, wipeId });
            await _cache.StringSetAsync(key, payload, TimeSpan.FromSeconds(_wipeTtlSeconds));

            // prøv å sende direkte via SignalR
            await hubContext.Clients.User(deviceId.ToString())
                .SendAsync("ExecuteWipe", wipeId, command.Type.ToString());
        }

        return wipeId;
    }

    public async Task ConfirmWipeAsync(WipeAckDto ack)
    {
        var key = $"wipe:{ack.DeviceId}:{ack.WipeId}";
        await _cache.KeyDeleteAsync(key);
    }

    private async Task<IEnumerable<Guid>> ResolveTargetDevicesAsync(Guid issuerId, WipeCommandDto command)
    {
        return command.Type switch
        {
            WipeType.All => await db.Devices
                .Where(d => d.UserId == issuerId)
                .Select(d => d.Id)
                .ToListAsync(),

            WipeType.Device when command.TargetDeviceId.HasValue => await db.Devices
                .Where(d => d.Id == command.TargetDeviceId && d.UserId == issuerId)
                .Select(d => d.Id)
                .ToListAsync(),

            WipeType.Conversation when command.ConversationPartnerId.HasValue =>
                // wipe egne enheter (klienten håndterer hvilken samtale som slettes)
                await db.Devices
                    .Where(d => d.UserId == issuerId)
                    .Select(d => d.Id)
                    .ToListAsync(),

            _ => []
        };
    }
}
