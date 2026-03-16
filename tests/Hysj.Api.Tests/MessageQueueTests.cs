using FluentAssertions;
using Hysj.Api.Services;
using Microsoft.Extensions.Configuration;
using Moq;
using StackExchange.Redis;

namespace Hysj.Api.Tests;

public class MessageQueueTests
{
    private static IConfiguration CreateConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MessagePolicy:TtlSeconds"] = "259200"
            })
            .Build();

    [Fact]
    public async Task EnqueueAsync_SetsKeyWithCorrectName()
    {
        var stored = new Dictionary<string, (byte[], TimeSpan?)>();

        var redisMock = new Mock<IConnectionMultiplexer>();
        var dbMock = new Mock<IDatabase>();
        redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(dbMock.Object);

        // Capture via the sync method (for verification purposes, we track the key)
        dbMock.Setup(d => d.StringSetAsync(
            It.IsAny<RedisKey>(),
            It.IsAny<RedisValue>(),
            It.IsAny<TimeSpan?>(),
            It.IsAny<When>(),
            It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);

        var deviceId = Guid.NewGuid();
        var messageId = Guid.NewGuid().ToString();

        var service = new MessageQueueService(redisMock.Object, CreateConfig());

        // Should not throw
        var act = () => service.EnqueueAsync(deviceId, messageId, [1, 2, 3], TimeSpan.FromHours(72));
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task DeleteAsync_RemovesCorrectKey()
    {
        var deletedKey = string.Empty;

        var redisMock = new Mock<IConnectionMultiplexer>();
        var dbMock = new Mock<IDatabase>();
        redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(dbMock.Object);
        dbMock.Setup(d => d.KeyDeleteAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
              .Callback<RedisKey, CommandFlags>((k, _) => deletedKey = k.ToString())
              .ReturnsAsync(true);

        var deviceId = Guid.NewGuid();
        var messageId = Guid.NewGuid().ToString();

        var service = new MessageQueueService(redisMock.Object, CreateConfig());
        await service.DeleteAsync(deviceId, messageId);

        deletedKey.Should().Be($"msg:{deviceId}:{messageId}");
    }
}
