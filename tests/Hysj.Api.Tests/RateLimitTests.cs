using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Hysj.Api.Tests;

public class RateLimitTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Login_BlocksAfterMaxAttempts()
    {
        var client = factory.CreateClient();
        var payload = JsonSerializer.Serialize(new { Username = "noone", Password = "wrong", TotpCode = "000000" });
        var content = new StringContent(payload, Encoding.UTF8, "application/json");

        HttpResponseMessage? last = null;
        for (var i = 0; i < 7; i++)
        {
            last = await client.PostAsync("/api/auth/login",
                new StringContent(payload, Encoding.UTF8, "application/json"));
        }

        last!.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }
}
