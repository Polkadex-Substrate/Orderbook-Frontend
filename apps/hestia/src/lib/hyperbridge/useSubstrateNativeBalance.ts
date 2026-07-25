import { useState, useEffect, useRef } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";

import { BRIDGE_CHAINS } from "@/config/bridge";
import type { SubstrateChainConfig } from "@/config/bridge";

const defaultSubstrateChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;

interface UseSubstrateNativeBalanceOptions {
  wsUrl?: string;
  decimals?: number;
}

// Reuse the per-URL singleton from useSubstrateWethBalance pattern
const apiInstances = new Map<string, ApiPromise>();
const connectingUrls = new Set<string>();
const apiQueues = new Map<string, Array<(api: ApiPromise) => void>>();

async function getApi(wsUrl: string): Promise<ApiPromise> {
  const existing = apiInstances.get(wsUrl);
  if (existing?.isConnected) return existing;

  if (connectingUrls.has(wsUrl)) {
    return new Promise((resolve) => {
      const q = apiQueues.get(wsUrl) ?? [];
      q.push(resolve);
      apiQueues.set(wsUrl, q);
    });
  }

  connectingUrls.add(wsUrl);
  try {
    const provider = new WsProvider(wsUrl);
    const api = await ApiPromise.create({ provider });
    apiInstances.set(wsUrl, api);
    (apiQueues.get(wsUrl) ?? []).forEach((cb) => cb(api));
    apiQueues.delete(wsUrl);
    return api;
  } finally {
    connectingUrls.delete(wsUrl);
  }
}

export function useSubstrateNativeBalance(
  address?: string,
  options?: UseSubstrateNativeBalanceOptions
) {
  const wsUrl = options?.wsUrl ?? defaultSubstrateChain.wsUrl;
  const decimals =
    options?.decimals ?? defaultSubstrateChain.nativeCurrency.decimals;
  const divisor = Math.pow(10, decimals);

  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!address) {
      setBalance(0);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getApi(wsUrl)
      .then(async (api) => {
        if (cancelled) return;

        try {
          const unsub = await api.query.system.account(
            address,
            (result: any) => {
              if (cancelled) return;
              const data = result.toJSON();
              const raw = BigInt(data?.data?.free ?? 0);
              setBalance(Number(raw) / divisor);
              setIsLoading(false);
            }
          );
          unsubRef.current = unsub as unknown as () => void;
        } catch (err) {
          console.error("Failed to fetch native balance:", err);
          if (!cancelled) {
            setBalance(0);
            setIsLoading(false);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to connect to Substrate node:", err);
        if (!cancelled) {
          setBalance(0);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [address, wsUrl, divisor]);

  return { balance, isLoading };
}
