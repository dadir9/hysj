using System.Security.Cryptography;

namespace Hysj.Client.Crypto.Ratchet;

public sealed class MessageKey : IDisposable
{
    public byte[] Key { get; }

    public MessageKey(byte[] key) => Key = key;

    public void Dispose() => CryptographicOperations.ZeroMemory(Key);
}
