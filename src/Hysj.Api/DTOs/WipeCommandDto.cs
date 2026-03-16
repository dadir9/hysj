namespace Hysj.Api.DTOs;

public enum WipeType { Conversation, Device, All }

public record WipeCommandDto(
    WipeType Type,
    string TotpCode,
    Guid? ConversationPartnerId = null,
    Guid? TargetDeviceId = null
);
