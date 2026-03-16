using Microsoft.AspNetCore.SignalR.Client;

namespace Hysj.Client.Services;

public class ChatService : IChatService
{
    private readonly IAuthStateService _auth;
    private HubConnection? _hub;

    public event Action<IncomingMessage>? MessageReceived;
    public event Action<string>? WipeCommandReceived;
    public event Action<(string UserId, bool IsOnline)>? PresenceChanged;

    public bool IsConnected => _hub?.State == HubConnectionState.Connected;

    public ChatService(IAuthStateService auth) => _auth = auth;

    public async Task ConnectAsync()
    {
        if (IsConnected) return;

        _hub = new HubConnectionBuilder()
            .WithUrl("https://localhost:7100/chathub", opts =>
            {
                opts.AccessTokenProvider = () => Task.FromResult(_auth.Token);
            })
            .WithAutomaticReconnect()
            .Build();

        _hub.On<string, string, string, string, string, byte[], DateTimeOffset, bool>(
            "ReceiveMessage",
            (msgId, convId, senderId, alias, color, payload, sentAt, isGroup) =>
                MessageReceived?.Invoke(new IncomingMessage(
                    msgId, convId, senderId, alias, color, payload, sentAt, isGroup)));

        _hub.On<string>("WipeCommand",
            target => WipeCommandReceived?.Invoke(target));

        _hub.On<string, bool>("PresenceUpdate",
            (userId, online) => PresenceChanged?.Invoke((userId, online)));

        await _hub.StartAsync();
    }

    public async Task DisconnectAsync()
    {
        if (_hub is null) return;
        await _hub.StopAsync();
        await _hub.DisposeAsync();
        _hub = null;
    }

    public async Task SendMessageAsync(string recipientId, byte[] sealedPayload, bool isGroup = false)
    {
        if (_hub is null) return;
        var method = isGroup ? "SendGroupMessage" : "SendMessage";
        await _hub.InvokeAsync(method, recipientId, sealedPayload);
    }

    public async Task AcknowledgeDeliveryAsync(string messageId)
    {
        if (_hub is null) return;
        await _hub.InvokeAsync("AcknowledgeDelivery", messageId);
    }
}
