using Hysj.Client.Models;

namespace Hysj.Client.Services;

public class WipeService : IWipeService
{
    private readonly IApiService     _api;
    private readonly ILocalDbService _db;
    private readonly IKeyManager     _keys;

    public WipeService(IApiService api, ILocalDbService db, IKeyManager keys)
    {
        _api  = api;
        _db   = db;
        _keys = keys;
    }

    public async Task WipeConversationAsync(string conversationId)
    {
        await _db.DeleteMessagesForConversationAsync(conversationId);
        await _db.DeleteConversationAsync(conversationId);
        await _api.SendWipeAsync(new WipeCommand
        {
            Type           = WipeType.Conversation,
            ConversationId = conversationId
        });
    }

    public async Task WipeDeviceAsync(Guid deviceId)
    {
        await _api.SendWipeAsync(new WipeCommand
        {
            Type           = WipeType.Device,
            TargetDeviceId = deviceId
        });
    }

    public async Task WipeAllAsync()
    {
        await _db.DeleteAllAsync();
        await _keys.WipeAllKeysAsync();
        await _api.SendWipeAsync(new WipeCommand { Type = WipeType.All });
    }

    public async Task ExecuteLocalWipeAsync(WipeCommand cmd)
    {
        switch (cmd.Type)
        {
            case WipeType.All:
                await _db.DeleteAllAsync();
                await _keys.WipeAllKeysAsync();
                break;
            case WipeType.Conversation when cmd.ConversationId is { } id:
                await _db.DeleteMessagesForConversationAsync(id);
                await _db.DeleteConversationAsync(id);
                break;
        }
    }
}
