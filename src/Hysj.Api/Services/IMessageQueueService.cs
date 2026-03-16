namespace Hysj.Api.Services;

public interface IMessageQueueService
{
    Task EnqueueAsync(Guid recipientDeviceId, string messageId, byte[] encryptedBlob, TimeSpan ttl);
    Task<IEnumerable<(string MessageId, byte[] Blob)>> DequeueAllAsync(Guid recipientDeviceId);
    Task DeleteAsync(Guid recipientDeviceId, string messageId);
}
