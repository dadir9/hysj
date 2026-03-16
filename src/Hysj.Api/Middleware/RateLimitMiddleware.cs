using System.Collections.Concurrent;

namespace Hysj.Api.Middleware;

public class RateLimitMiddleware(RequestDelegate next, IConfiguration config)
{
    private static readonly ConcurrentDictionary<string, WindowCounter> _counters = new();

    private readonly int _maxAttempts = config.GetValue<int>("RateLimit:LoginAttemptsPerWindow");
    private readonly int _windowMinutes = config.GetValue<int>("RateLimit:WindowMinutes");
    private readonly int _lockoutMinutes = config.GetValue<int>("RateLimit:LockoutMinutes");

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api/auth/login") &&
            context.Request.Method == "POST")
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var key = $"login:{ip}";

            var counter = _counters.GetOrAdd(key, _ => new WindowCounter());

            lock (counter)
            {
                var now = DateTimeOffset.UtcNow;

                if (counter.LockedUntil.HasValue && now < counter.LockedUntil)
                {
                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.Response.Headers.RetryAfter =
                        ((int)(counter.LockedUntil.Value - now).TotalSeconds).ToString();
                    return;
                }

                if (now > counter.WindowStart.AddMinutes(_windowMinutes))
                {
                    counter.Count = 0;
                    counter.WindowStart = now;
                    counter.LockedUntil = null;
                }

                counter.Count++;

                if (counter.Count > _maxAttempts)
                {
                    counter.LockedUntil = now.AddMinutes(_lockoutMinutes);
                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.Response.Headers.RetryAfter = (_lockoutMinutes * 60).ToString();
                    return;
                }
            }
        }

        await next(context);
    }
}

public class WindowCounter
{
    public int Count { get; set; }
    public DateTimeOffset WindowStart { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LockedUntil { get; set; }
}
