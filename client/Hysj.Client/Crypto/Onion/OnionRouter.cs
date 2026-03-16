namespace Hysj.Client.Crypto.Onion;

public record OnionPacket(string EntryNodeAddress, byte[] Data);

public class OnionRouter
{
    private readonly List<RelayNode> _availableNodes;

    public OnionRouter(List<RelayNode> nodes) => _availableNodes = nodes;

    public OnionPacket? BuildRoute(byte[] payload, string serverAddress)
    {
        if (_availableNodes.Count < 3) return null;

        var nodes = SelectRandomNodes(3);

        // Wrap from inside out
        byte[] current = OnionLayer.Wrap(payload, serverAddress, nodes[2].PublicKey);
        current = OnionLayer.Wrap(current, nodes[2].Address, nodes[1].PublicKey);
        current = OnionLayer.Wrap(current, nodes[1].Address, nodes[0].PublicKey);

        return new OnionPacket(nodes[0].Address, current);
    }

    private List<RelayNode> SelectRandomNodes(int count)
    {
        var shuffled = _availableNodes.OrderBy(_ => Random.Shared.Next()).Take(count).ToList();
        return shuffled;
    }
}
