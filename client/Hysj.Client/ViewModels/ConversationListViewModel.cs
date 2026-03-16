using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Hysj.Client.Models;
using Hysj.Client.Services;

namespace Hysj.Client.ViewModels;

public partial class ConversationListViewModel : ObservableObject
{
    private readonly ILocalDbService      _db;
    private readonly IChatService         _chat;
    private readonly IAuthStateService    _auth;
    private readonly ILocalizationService _loc;

    [ObservableProperty] private ObservableCollection<Conversation> _conversations = [];
    [ObservableProperty] private string _searchQuery = string.Empty;
    [ObservableProperty] private bool   _isBusy;
    [ObservableProperty] private string _username = string.Empty;

    public ConversationListViewModel(
        ILocalDbService db, IChatService chat,
        IAuthStateService auth, ILocalizationService loc)
    {
        _db   = db;
        _chat = chat;
        _auth = auth;
        _loc  = loc;

        _chat.MessageReceived  += OnMessageReceived;
        _chat.WipeCommandReceived += OnWipeReceived;
    }

    public async Task InitAsync()
    {
        Username = _auth.Username ?? string.Empty;
        IsBusy   = true;
        try
        {
            var list = await _db.GetConversationsAsync();
            Conversations = new ObservableCollection<Conversation>(list);
            if (!_chat.IsConnected) await _chat.ConnectAsync();
        }
        finally { IsBusy = false; }
    }

    private void OnMessageReceived(IncomingMessage msg)
    {
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            var existing = Conversations.FirstOrDefault(c =>
                c.Id == msg.ConversationId || c.PeerUserId == msg.SenderId);

            if (existing is not null)
            {
                existing.LastMessagePreview = "•••";
                existing.LastMessageAt      = msg.SentAt;
                existing.UnreadCount++;
                await _db.UpsertConversationAsync(existing);
                var idx = Conversations.IndexOf(existing);
                Conversations.Move(idx, 0);
            }
        });
    }

    private void OnWipeReceived(string target)
    {
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            if (target == "ALL") { Conversations.Clear(); return; }
            var c = Conversations.FirstOrDefault(x => x.Id == target);
            if (c is not null) Conversations.Remove(c);
        });
    }

    [RelayCommand]
    private async Task OpenConversationAsync(Conversation conv) =>
        await Shell.Current.GoToAsync("ChatPage",
            new Dictionary<string, object> { ["Conversation"] = conv });

    [RelayCommand]
    private async Task GoToSettingsAsync() =>
        await Shell.Current.GoToAsync("SettingsPage");

    [RelayCommand]
    private async Task GoToSecurityAsync() =>
        await Shell.Current.GoToAsync("SecurityPage");

    [RelayCommand]
    private async Task GoToCreateGroupAsync() =>
        await Shell.Current.GoToAsync("CreateGroupPage");
}
