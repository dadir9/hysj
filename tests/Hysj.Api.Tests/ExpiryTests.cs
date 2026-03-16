using FluentAssertions;
using Hysj.Api.Services;
using Microsoft.Extensions.Configuration;
using Moq;
using StackExchange.Redis;

namespace Hysj.Api.Tests;

public class ExpiryTests
{
    private static IConfiguration CreateConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["MessagePolicy:TtlSeconds"] = "259200"
            })
            .Build();

    [Fact]
    public async Task DeleteAsync_DoesNotThrow()
    {
        var redisMock = new Mock<IConnectionMultiplexer>();
        var dbMock = new Mock<IDatabase>();
        redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(dbMock.Object);
        dbMock.Setup(d => d.KeyDeleteAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>())).ReturnsAsync(true);

        var service = new MessageQueueService(redisMock.Object, CreateConfig());
        var act = () => service.DeleteAsync(Guid.NewGuid(), "msg1");
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task EnqueueAsync_DoesNotThrow()
    {
        var redisMock = new Mock<IConnectionMultiplexer>();
        var dbMock = new Mock<IDatabase>();
        redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(dbMock.Object);
        dbMock.Setup(d => d.StringSetAsync(It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<TimeSpan?>(), It.IsAny<When>(), It.IsAny<CommandFlags>()))
              .ReturnsAsync(true);

        var service = new MessageQueueService(redisMock.Object, CreateConfig());
        var act = () => service.EnqueueAsync(Guid.NewGuid(), "msg1", "encrypted_blob_data", TimeSpan.FromHours(72));
        await act.Should().NotThrowAsync();
    }
}
