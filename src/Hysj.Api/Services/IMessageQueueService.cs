namespace Hysj.Api.Services;

public interface IMessageQueueService
{
    Task EnqueueAsync(Guid recipientDeviceId, string messageId, string encryptedBlob, TimeSpan ttl);
    Task<IEnumerable<(string MessageId, string Blob)>> DequeueAllAsync(Guid recipientDeviceId);
    Task DeleteAsync(Guid recipientDeviceId, string messageId);
}
