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
    // deviceId -> connectionId
    private static readonly ConcurrentDictionary<Guid, string> _online = new();

    public override async Task OnConnectedAsync()
    {
        var deviceId = GetDeviceId();
        var userId = GetUserId();

        // Validate that this device belongs to the authenticated user
        var deviceOwned = await db.Devices
            .AnyAsync(d => d.Id == deviceId && d.UserId == userId);
        if (!deviceOwned)
        {
            Context.Abort();
            return;
        }

        _online[deviceId] = Context.ConnectionId;

        var now = DateTimeOffset.UtcNow;
        await db.Devices
            .Where(d => d.Id == deviceId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(d => d.IsOnline, true)
                .SetProperty(d => d.LastActiveAt, now));

        // lever alle ventende meldinger
        var pending = await queue.DequeueAllAsync(deviceId);
        foreach (var (messageId, blob) in pending)
        {
            await Clients.Caller.SendAsync("ReceiveMessage", new
            {
                messageId,
                encryptedBlob = blob
            });
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var deviceId = GetDeviceId();
        _online.TryRemove(deviceId, out _);

        var now = DateTimeOffset.UtcNow;
        await db.Devices
            .Where(d => d.Id == deviceId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(d => d.IsOnline, false)
                .SetProperty(d => d.LastActiveAt, now));

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(SendMessageDto message)
    {
        var userId = GetUserId();
        var deviceId = GetDeviceId();

        // Validate that the sender's device belongs to them
        var deviceOwned = await db.Devices
            .AnyAsync(d => d.Id == deviceId && d.UserId == userId);
        if (!deviceOwned) return;

        var ttl = TimeSpan.FromSeconds(259200); // 72 timer

        if (_online.TryGetValue(message.RecipientDeviceId, out var connId))
        {
            // mottaker online -- lever direkte, ingenting lagres
            await Clients.Client(connId).SendAsync("ReceiveMessage", new
            {
                messageId = message.MessageId,
                encryptedBlob = message.EncryptedBlob
            });
            await Clients.Caller.SendAsync("MessageDelivered", message.MessageId);
        }
        else
        {
            // mottaker offline -- legg i Redis med TTL
            await queue.EnqueueAsync(message.RecipientDeviceId, message.MessageId, message.EncryptedBlob, ttl);
            await Clients.Caller.SendAsync("MessageQueued", message.MessageId);
        }
    }

    public async Task AcknowledgeDelivery(DeliveryAckDto ack)
    {
        // slett fra Redis (om den la der)
        await queue.DeleteAsync(ack.RecipientDeviceId, ack.MessageId);
        await Clients.Caller.SendAsync("DeliveryAcknowledged", ack.MessageId);
    }

    public async Task SendTypingIndicator(Guid recipientDeviceId, bool isTyping)
    {
        if (_online.TryGetValue(recipientDeviceId, out var connId))
        {
            var userId = GetUserId();
            await Clients.Client(connId).SendAsync("UserTyping", userId, isTyping);
        }
    }

    public async Task MarkMessageRead(Guid senderDeviceId, string messageId)
    {
        if (_online.TryGetValue(senderDeviceId, out var connId))
        {
            var readBy = GetUserId();
            await Clients.Client(connId).SendAsync("MessageRead", messageId, readBy);
        }
    }

    public async Task SendWipeCommand(string wipeId, Guid targetDeviceId, string wipeType, Guid? conversationPartnerId = null)
    {
        var userId = GetUserId();

        // Validate that the target device belongs to the authenticated user
        var deviceOwned = await db.Devices
            .AnyAsync(d => d.Id == targetDeviceId && d.UserId == userId);
        if (!deviceOwned) return;

        if (_online.TryGetValue(targetDeviceId, out var connId))
        {
            await Clients.Client(connId).SendAsync("WipeCommand", new
            {
                wipeId,
                type = wipeType,
                conversationId = conversationPartnerId?.ToString(),
                targetDeviceId = targetDeviceId.ToString(),
                timestamp = DateTimeOffset.UtcNow.ToString("o")
            });
        }
    }

    public async Task AcknowledgeWipe(WipeAckDto ack)
    {
        var senderId = GetUserId();
        await Clients.User(senderId.ToString()).SendAsync("WipeConfirmed", ack.WipeId, ack.Success);
    }

    public async Task SendGroupMessage(GroupMessageDto message)
    {
        var userId = GetUserId();

        var isMember = await db.GroupMembers
            .AnyAsync(gm => gm.GroupId == message.GroupId && gm.UserId == userId);
        if (!isMember) return;

        var group = await db.Groups.FindAsync(message.GroupId);
        if (group is null) return;

        // determine sender display name
        var senderDisplay = group.IsAnonymous
            ? (await db.GroupMembers.FirstAsync(gm => gm.GroupId == message.GroupId && gm.UserId == userId)).Alias
            : Context.User!.FindFirstValue(ClaimTypes.Name) ?? userId.ToString();

        // get all other members' device ids
        var memberUserIds = await db.GroupMembers
            .Where(gm => gm.GroupId == message.GroupId && gm.UserId != userId)
            .Select(gm => gm.UserId)
            .ToListAsync();

        var deviceIds = await db.Devices
            .Where(d => memberUserIds.Contains(d.UserId))
            .Select(d => d.Id)
            .ToListAsync();

        var ttl = TimeSpan.FromSeconds(259200);
        foreach (var deviceId in deviceIds)
        {
            if (_online.TryGetValue(deviceId, out var connId))
                await Clients.Client(connId).SendAsync(
                    "ReceiveGroupMessage", message.GroupId, message.MessageId, senderDisplay, message.EncryptedBlob);
            else
                await queue.EnqueueAsync(deviceId, message.MessageId, message.EncryptedBlob, ttl);
        }
    }

    private Guid GetDeviceId() =>
        Guid.Parse(Context.User!.FindFirstValue("deviceId")!);

    private Guid GetUserId() =>
        Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
