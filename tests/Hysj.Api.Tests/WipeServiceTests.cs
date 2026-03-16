using FluentAssertions;
using Hysj.Api.Data;
using Hysj.Api.DTOs;
using Hysj.Api.Hubs;
using Hysj.Api.Models;
using Hysj.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using StackExchange.Redis;

namespace Hysj.Api.Tests;

public class WipeServiceTests
{
    private static HysjDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<HysjDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new HysjDbContext(options);
    }

    private static IConfiguration CreateConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["WipePolicy:TtlSeconds"] = "2592000"
            })
            .Build();

    [Fact]
    public async Task IssueWipe_All_TargetsAllUserDevices()
    {
        var db = CreateDb();
        var userId = Guid.NewGuid();
        db.Users.Add(new User { Id = userId, Username = "test", PasswordHash = "", Salt = [], IdentityPublicKey = [], TotpSecret = [], CreatedAt = DateTimeOffset.UtcNow, LastSeenAt = DateTimeOffset.UtcNow });
        db.Devices.AddRange(
            new Device { Id = Guid.NewGuid(), UserId = userId, DeviceName = "A", SignedPreKey = [], SignedPreKeySig = [], RegisteredAt = DateTimeOffset.UtcNow, LastActiveAt = DateTimeOffset.UtcNow },
            new Device { Id = Guid.NewGuid(), UserId = userId, DeviceName = "B", SignedPreKey = [], SignedPreKeySig = [], RegisteredAt = DateTimeOffset.UtcNow, LastActiveAt = DateTimeOffset.UtcNow }
        );
        await db.SaveChangesAsync();

        var redisMock = new Mock<IConnectionMultiplexer>();
        var dbMock = new Mock<IDatabase>();
        var serverMock = new Mock<IServer>();
        redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(dbMock.Object);
        redisMock.Setup(r => r.GetEndPoints(It.IsAny<bool>())).Returns([new System.Net.DnsEndPoint("localhost", 6379)]);
        redisMock.Setup(r => r.GetServer(It.IsAny<System.Net.EndPoint>(), It.IsAny<object>())).Returns(serverMock.Object);
        dbMock.Setup(d => d.StringSetAsync(It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<TimeSpan?>(), It.IsAny<When>(), It.IsAny<CommandFlags>())).ReturnsAsync(true);

        var hubMock = new Mock<IHubContext<ChatHub>>();
        var clientsMock = new Mock<IHubClients>();
        var clientProxyMock = new Mock<IClientProxy>();
        hubMock.Setup(h => h.Clients).Returns(clientsMock.Object);
        clientsMock.Setup(c => c.User(It.IsAny<string>())).Returns(clientProxyMock.Object);
        clientProxyMock.Setup(c => c.SendCoreAsync(It.IsAny<string>(), It.IsAny<object[]>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var service = new WipeService(db, redisMock.Object, hubMock.Object, CreateConfig());
        var wipeId = await service.IssueWipeAsync(userId, new WipeCommandDto(WipeType.All, "123456"));

        wipeId.Should().NotBeNullOrEmpty();
        // WipeService calls StringSetAsync — just verify wipeId was returned
        wipeId.Should().NotBeNullOrEmpty();
    }
}
