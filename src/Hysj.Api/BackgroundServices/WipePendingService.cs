using Hysj.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;

namespace Hysj.Api.BackgroundServices;

public class WipePendingService(
    IConnectionMultiplexer redis,
    IHubContext<ChatHub> hubContext,
    ILogger<WipePendingService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);

            try
            {
                var server = redis.GetServer(redis.GetEndPoints().First());
                var db = redis.GetDatabase();

                await foreach (var key in server.KeysAsync(pattern: "wipe:*"))
                {
                    var parts = key.ToString().Split(':');
                    if (parts.Length < 3) continue;

                    var deviceId = parts[1];
                    var wipeId = parts[2];
                    var payload = await db.StringGetAsync(key);

                    if (payload.HasValue)
                    {
                        await hubContext.Clients.User(deviceId)
                            .SendAsync("ExecuteWipe", wipeId, payload.ToString(), stoppingToken);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "WipePendingService feilet, prøver igjen om 10 min.");
            }
        }
    }
}
