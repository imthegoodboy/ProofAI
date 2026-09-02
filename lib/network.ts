import { config } from "@/lib/config";

export async function getOgNetworkHealth() {
  try {
    const response = await fetch(config.og.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
        params: [],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) throw new Error(`RPC returned ${response.status}`);
    const payload = (await response.json()) as { result?: string; error?: unknown };
    if (!payload.result) throw new Error("RPC response did not include a block number.");
    return { online: true, blockNumber: Number.parseInt(payload.result, 16) };
  } catch {
    return { online: false, blockNumber: null };
  }
}
