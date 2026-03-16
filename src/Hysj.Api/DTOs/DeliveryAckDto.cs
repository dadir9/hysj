namespace Hysj.Api.DTOs;

public record DeliveryAckDto(
    string MessageId,
    Guid RecipientDeviceId
);
