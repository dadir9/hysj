using StackExchange.Redis;

namespace Hysj.Api.BackgroundServices;

public class MessageExpiryService(IConnectionMultiplexer redis, ILogger<MessageExpiryService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

            try
            {
                var server = redis.GetServer(redis.GetEndPoints().First());
                var db = redis.GetDatabase();
                var count = 0;

                await foreach (var key in server.KeysAsync(pattern: "msg:*"))
                {
                    var ttl = await db.KeyTimeToLiveAsync(key);
                    if (ttl is null || ttl <= TimeSpan.Zero)
                    {
                        await db.KeyDeleteAsync(key);
                        count++;
                    }
                }

                if (count > 0)
                    logger.LogWarning("MessageExpiryService: slettet {Count} utløpte meldinger.", count);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "MessageExpiryService feilet, prøver igjen om 5 min.");
            }
        }
    }
}
