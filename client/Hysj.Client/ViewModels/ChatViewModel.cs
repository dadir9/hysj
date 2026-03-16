using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Hysj.Client.Models;
using Hysj.Client.Services;

namespace Hysj.Client.ViewModels;

[QueryProperty(nameof(Conversation), "Conversation")]
public partial class ChatViewModel : ObservableObject
{
    private readonly ILocalDbService      _db;
    private readonly IChatService         _chat;
    private readonly ICryptoService       _crypto;
    private readonly IAuthStateService    _auth;
    private readonly ILocalizationService _loc;

    [ObservableProperty] private Conversation? _conversation;
    [ObservableProperty] private ObservableCollection<Message> _messages = [];
    [ObservableProperty] private string _messageText = string.Empty;
    [ObservableProperty] private bool   _isBusy;

    public string SecurityLabel => "🛡 ratchet · quantum · sealed · onion";
    public string AnonBadge => Conversation?.IsAnonymous == true
        ? $"You are anonymous as «{Conversation.MyAlias}»"
        : string.Empty;

    public ChatViewModel(
        ILocalDbService db, IChatService chat,
        ICryptoService crypto, IAuthStateService auth,
        ILocalizationService loc)
    {
        _db     = db;
        _chat   = chat;
        _crypto = crypto;
        _auth   = auth;
        _loc    = loc;

        _chat.MessageReceived += OnIncoming;
    }

    partial void OnConversationChanged(Conversation? value)
    {
        if (value is null) return;
        _ = LoadMessagesAsync();
    }

    private async Task LoadMessagesAsync()
    {
        if (Conversation is null) return;
        var list = await _db.GetMessagesAsync(Conversation.Id);
        Messages = new ObservableCollection<Message>(list);
    }

    private void OnIncoming(IncomingMessage msg)
    {
        if (Conversation is null || msg.ConversationId != Conversation.Id) return;
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            try
            {
                var plain = await Task.Run(() =>
                    _crypto.DecryptAsync(msg.SenderId, msg.EncryptedPayload));
                var m = new Message
                {
                    Id              = msg.MessageId,
                    ConversationId  = msg.ConversationId,
                    SenderId        = msg.SenderId,
                    SenderAlias     = msg.SenderAlias,
                    SenderAvatarColor = msg.SenderAvatarColor,
                    Content         = System.Text.Encoding.UTF8.GetString(plain),
                    Status          = MessageStatus.Delivered,
                    SentAt          = msg.SentAt,
                    IsOutgoing      = false
                };
                await _db.SaveMessageAsync(m);
                Messages.Add(m);
                await _chat.AcknowledgeDeliveryAsync(msg.MessageId);
            }
            catch { /* decryption failed */ }
        });
    }

    [RelayCommand]
    private async Task SendAsync()
    {
        if (string.IsNullOrWhiteSpace(MessageText) || Conversation is null) return;

        var text       = MessageText;
        MessageText    = string.Empty;
        var recipientId = Conversation.IsGroup ? Conversation.GroupId! : Conversation.PeerUserId;

        var m = new Message
        {
            ConversationId = Conversation.Id,
            SenderId       = _auth.UserId ?? string.Empty,
            Content        = text,
            Status         = MessageStatus.Sent,
            SentAt         = DateTimeOffset.UtcNow,
            IsOutgoing     = true
        };
        Messages.Add(m);
        await _db.SaveMessageAsync(m);

        try
        {
            var plain   = System.Text.Encoding.UTF8.GetBytes(text);
            var sealed_ = await Task.Run(() => _crypto.EncryptAsync(recipientId, plain));
            await _chat.SendMessageAsync(recipientId, sealed_, Conversation.IsGroup);
            m.Status = MessageStatus.Delivered;
            await _db.SaveMessageAsync(m);
        }
        catch
        {
            m.Status = MessageStatus.Failed;
            await _db.SaveMessageAsync(m);
        }
    }

    [RelayCommand]
    private async Task GoBackAsync() =>
        await Shell.Current.GoToAsync("..");
}
