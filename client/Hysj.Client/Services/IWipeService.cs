using Hysj.Client.Models;

namespace Hysj.Client.Services;

public interface IWipeService
{
    Task WipeConversationAsync(string conversationId);
    Task WipeDeviceAsync(Guid deviceId);
    Task WipeAllAsync();
    Task ExecuteLocalWipeAsync(WipeCommand cmd);
}
