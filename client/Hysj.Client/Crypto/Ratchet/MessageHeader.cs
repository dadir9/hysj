namespace Hysj.Client.Crypto.Ratchet;

public record MessageHeader(
    byte[] DHPublic,
    int    MessageIndex,
    int    PreviousChainLength
);
