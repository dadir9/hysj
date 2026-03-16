using System.Collections.Concurrent;
using System.Security.Claims;
using Hysj.Api.Data;
using Hysj.Api.DTOs;
using Hysj.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Hysj.Api.Hubs;

[Authorize]
public class ChatHub(IMessageQueueService queue, HysjDbContext db) : Hub
{
    // deviceId → connectionId
    private static readonly ConcurrentDictionary<Guid, string> _online = new();

    public override async Task OnConnectedAsync()
    {
        var deviceId = GetDeviceId();
        _online[deviceId] = Context.ConnectionId;

        await db.Devices
            .Where(d => d.Id == deviceId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(d => d.IsOnline, true)
                .SetProperty(d => d.LastActiveAt, DateTimeOffset.UtcNow));

        // lever alle ventende meldinger
        var pending = await queue.DequeueAllAsync(deviceId);
        foreach (var (messageId, blob) in pending)
        {
            await Clients.Caller.SendAsync("ReceiveMessage", messageId, blob);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var deviceId = GetDeviceId();
        _online.TryRemove(deviceId, out _);

        await db.Devices
            .Where(d => d.Id == deviceId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(d => d.IsOnline, false)
                .SetProperty(d => d.LastActiveAt, DateTimeOffset.UtcNow));

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(SendMessageDto message)
    {
        var ttl = TimeSpan.FromSeconds(259200); // 72 timer

        if (_online.TryGetValue(message.RecipientDeviceId, out var connId))
        {
            // mottaker online — lever direkte, ingenting lagres
            await Clients.Client(connId).SendAsync("ReceiveMessage", message.MessageId, message.EncryptedBlob);
            await Clients.Caller.SendAsync("MessageDelivered", message.MessageId);
        }
        else
        {
            // mottaker offline — legg i Redis med TTL
            await queue.EnqueueAsync(message.RecipientDeviceId, message.MessageId, message.EncryptedBlob, ttl);
            await Clients.Caller.SendAsync("MessageQueued", message.MessageId);
        }
    }

    public async Task AcknowledgeDelivery(DeliveryAckDto ack)
    {
        // slett fra Redis (om den lå der)
        await queue.DeleteAsync(ack.RecipientDeviceId, ack.MessageId);
        await Clients.Caller.SendAsync("DeliveryAcknowledged", ack.MessageId);
    }

    public async Task SendWipeCommand(string wipeId, Guid targetDeviceId, string wipeType)
    {
        if (_online.TryGetValue(targetDeviceId, out var connId))
        {
            await Clients.Client(connId).SendAsync("ExecuteWipe", wipeId, wipeType);
        }
    }

    public async Task AcknowledgeWipe(WipeAckDto ack)
    {
        var senderId = GetUserId();
        await Clients.User(senderId.ToString()).SendAsync("WipeConfirmed", ack.WipeId, ack.Success);
    }

    private Guid GetDeviceId() =>
        Guid.Parse(Context.User!.FindFirstValue("deviceId")!);

    private Guid GetUserId() =>
        Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
