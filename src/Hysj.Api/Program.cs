using System.Text;
using Hysj.Api.Data;
using Microsoft.EntityFrameworkCore;
using Hysj.Api.Middleware;
using Hysj.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Hysj.Api.BackgroundServices;
using Hysj.Api.Hubs;
using Npgsql;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5076", "http://localhost:8081", "http://10.0.2.2:5076"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
    options.AddPolicy("SignalR", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Database: try Supabase PostgreSQL, fall back to SQLite in dev if unreachable
var useSqlite = false;
var postgresConn = builder.Configuration.GetConnectionString("Postgres");

if (builder.Environment.IsDevelopment() && !string.IsNullOrEmpty(postgresConn))
{
    try
    {
        using var testConn = new NpgsqlConnection(postgresConn);
        testConn.Open();
        testConn.Close();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Startup] PostgreSQL unavailable ({ex.GetBaseException().Message}) — falling back to SQLite.");
        useSqlite = true;
    }
}

if (useSqlite || string.IsNullOrEmpty(postgresConn))
{
    builder.Services.AddDbContext<HysjDbContext>(options =>
        options.UseSqlite("Data Source=hysj_dev.db"));
}
else
{
    builder.Services.AddDbContext<HysjDbContext>(options =>
        options.UseNpgsql(postgresConn));
}

if (!builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
        ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")!));
}
else
{
    // Redis er valgfri i dev — kobler til hvis tilgjengelig, ellers null-objekt
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    {
        try { return ConnectionMultiplexer.Connect("localhost:6379,connectTimeout=1000,syncTimeout=1000"); }
        catch { return null!; }
    });
}

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<ICertificateService, CertificateService>();
builder.Services.AddScoped<IMessageQueueService, MessageQueueService>();
builder.Services.AddHostedService<MessageExpiryService>();
builder.Services.AddHostedService<WipePendingService>();
builder.Services.AddScoped<IWipeService, WipeService>();

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured. Set it in appsettings or environment variable Jwt__Secret.");
if (Encoding.UTF8.GetByteCount(jwtSecret) < 64)
    throw new InvalidOperationException("Jwt:Secret must be at least 64 bytes. Generate one with: openssl rand -base64 64");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSecret))
        };

        // SignalR sends JWT via query string (?access_token=xxx) for WebSocket connections
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chathub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HysjDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        if (useSqlite)
        {
            db.Database.EnsureCreated();
            logger.LogInformation("SQLite development database ready (hysj_dev.db).");
        }
        else
        {
            db.Database.Migrate();
            logger.LogInformation("PostgreSQL database migration completed.");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Database setup failed — continuing startup.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<NoLogMiddleware>();
app.UseMiddleware<RateLimitMiddleware>();
app.UseCors();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/chathub").RequireCors("SignalR");

app.Run();

public partial class Program { }
