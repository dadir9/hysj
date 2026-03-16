namespace Hysj.Api.DTOs;

public record SendMessageDto(
    Guid RecipientDeviceId,
    string MessageId,
    string EncryptedBlob
);
