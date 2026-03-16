namespace Hysj.Api.DTOs;

public record GroupMessageDto(
    Guid GroupId,
    string MessageId,
    byte[] EncryptedBlob
);
