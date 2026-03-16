namespace Hysj.Client.Crypto.Onion;

public record RelayNode(
    string Id,
    string Address,
    string Location,
    byte[] PublicKey
);
