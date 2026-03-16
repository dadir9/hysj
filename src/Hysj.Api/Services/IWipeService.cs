using Hysj.Api.DTOs;

namespace Hysj.Api.Services;

public interface IWipeService
{
    Task<string> IssueWipeAsync(Guid issuerId, WipeCommandDto command);
    Task ConfirmWipeAsync(WipeAckDto ack);
}
