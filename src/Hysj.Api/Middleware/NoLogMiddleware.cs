namespace Hysj.Api.Middleware;

public class NoLogMiddleware(RequestDelegate next)
{
    private static readonly HashSet<string> _sensitiveRoutes =
    [
        "/api/auth/login",
        "/api/auth/register",
        "/api/wipe"
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        if (_sensitiveRoutes.Contains(context.Request.Path.Value ?? string.Empty))
        {
            context.Request.EnableBuffering();
        }

        await next(context);
    }
}
