using System.Text.Json.Serialization;

namespace Hysj.Client.Crypto.Ratchet;

/// <summary>Serialisert Double Ratchet-tilstand per samtale.</summary>
public class RatchetState
{
    public byte[] RootKey { get; set; } = [];
    public byte[] SendingChainKey { get; set; } = [];
    public byte[] ReceivingChainKey { get; set; } = [];
    public byte[] DHSendPrivate { get; set; } = [];    // egne DH-nøkler (private)
    public byte[] DHSendPublic { get; set; } = [];
    public byte[] DHReceivePublic { get; set; } = [];  // motparts siste DH-nøkkel
    public int SendingIndex { get; set; }
    public int ReceivingIndex { get; set; }
    public int PreviousSendingLength { get; set; }

    /// <summary>Hoppet-over nøkler for meldinger mottatt ut av rekkefølge.</summary>
    public Dictionary<string, byte[]> SkippedKeys { get; set; } = new();
}
