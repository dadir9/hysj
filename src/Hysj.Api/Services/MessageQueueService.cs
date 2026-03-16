using StackExchange.Redis;

namespace Hysj.Api.Services;

public class MessageQueueService(IConnectionMultiplexer redis, IConfiguration config) : IMessageQueueService
{
    private readonly IDatabase _db = redis.GetDatabase();
    private readonly int _ttlSeconds = config.GetValue<int>("MessagePolicy:TtlSeconds");

    public async Task EnqueueAsync(Guid recipientDeviceId, string messageId, byte[] encryptedBlob, TimeSpan ttl)
    {
        var key = MessageKey(recipientDeviceId, messageId);
        await _db.StringSetAsync(key, encryptedBlob, ttl);
    }

    public async Task<IEnumerable<(string MessageId, byte[] Blob)>> DequeueAllAsync(Guid recipientDeviceId)
    {
        var server = redis.GetServer(redis.GetEndPoints().First());
        var pattern = $"msg:{recipientDeviceId}:*";
        var results = new List<(string, byte[])>();

        await foreach (var key in server.KeysAsync(pattern: pattern))
        {
            var blob = await _db.StringGetDeleteAsync(key);
            if (blob.HasValue)
            {
                var messageId = key.ToString().Split(':')[2];
                results.Add((messageId, (byte[])blob!));
            }
        }

        return results;
    }

    public async Task DeleteAsync(Guid recipientDeviceId, string messageId)
    {
        var key = MessageKey(recipientDeviceId, messageId);
        await _db.KeyDeleteAsync(key);
    }

    private static string MessageKey(Guid deviceId, string messageId) =>
        $"msg:{deviceId}:{messageId}";
}
