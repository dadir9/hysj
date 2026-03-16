/**
 * Onion router: builds a 3-hop onion route through relay nodes.
 * Uses cryptographic random for node selection (fixes MAUI bug).
 */
import { randomBytes } from '@stablelib/random';
import { wrapLayer } from './onionLayer';

export interface RelayNode {
  id: string;
  address: string;
  location: string;
  publicKey: Uint8Array;
}

export interface OnionPacket {
  entryNodeAddress: string;
  data: Uint8Array;
}

/** Build a 3-hop onion route. Returns null if fewer than 3 nodes available. */
export function buildRoute(
  payload: Uint8Array,
  serverAddress: string,
  availableNodes: RelayNode[],
): OnionPacket | null {
  if (availableNodes.length < 3) return null;

  const nodes = selectRandomNodes(availableNodes, 3);

  // Wrap from inside out: node[2] -> server, node[1] -> node[2], node[0] -> node[1]
  let current = wrapLayer(payload, serverAddress, nodes[2].publicKey);
  current = wrapLayer(current, nodes[2].address, nodes[1].publicKey);
  current = wrapLayer(current, nodes[1].address, nodes[0].publicKey);

  return { entryNodeAddress: nodes[0].address, data: current };
}

/**
 * Select `count` random nodes using a CSPRNG (not Math.random).
 * Fisher-Yates shuffle with cryptographic randomness.
 */
function selectRandomNodes(nodes: RelayNode[], count: number): RelayNode[] {
  const copy = [...nodes];
  for (let i = copy.length - 1; i > 0; i--) {
    const rand = randomBytes(4);
    const j = new DataView(rand.buffer).getUint32(0) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
