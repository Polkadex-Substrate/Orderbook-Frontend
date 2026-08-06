import { ApiPromise, WsProvider } from "@polkadot/api";

const instances = new Map<string, ApiPromise>();
const connecting = new Set<string>();
const queues = new Map<string, Array<(api: ApiPromise) => void>>();

export async function getSubstrateApi(wsUrl: string): Promise<ApiPromise> {
  const existing = instances.get(wsUrl);
  if (existing?.isConnected) return existing;

  if (connecting.has(wsUrl)) {
    return new Promise((resolve) => {
      const q = queues.get(wsUrl) ?? [];
      q.push(resolve);
      queues.set(wsUrl, q);
    });
  }

  connecting.add(wsUrl);
  try {
    const provider = new WsProvider(wsUrl);
    const api = await ApiPromise.create({ provider });
    instances.set(wsUrl, api);
    (queues.get(wsUrl) ?? []).forEach((cb) => cb(api));
    queues.delete(wsUrl);
    return api;
  } finally {
    connecting.delete(wsUrl);
  }
}
