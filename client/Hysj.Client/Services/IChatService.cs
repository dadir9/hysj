namespace Hysj.Client.Services;

public record IncomingMessage(
    string MessageId,
    string ConversationId,
    string SenderId,
    string SenderAlias,
    string SenderAvatarColor,
    byte[] EncryptedPayload,
    DateTimeOffset SentAt,
    bool IsGroup);

public interface IChatService
{
    event Action<IncomingMessage>? MessageReceived;
    event Action<string>? WipeCommandReceived;  // conversationId or "ALL"
    event Action<(string UserId, bool IsOnline)>? PresenceChanged;

    bool IsConnected { get; }
    Task ConnectAsync();
    Task DisconnectAsync();
    Task SendMessageAsync(string recipientId, byte[] sealedPayload, bool isGroup = false);
    Task AcknowledgeDeliveryAsync(string messageId);
}
