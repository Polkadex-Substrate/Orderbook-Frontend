import { useState, useEffect, useRef } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { BRIDGE_CHAINS, BRIDGE_TOKENS } from "@/config/bridge";
import type { SubstrateChainConfig } from "@/config/bridge";

const defaultSubstrateChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;
const defaultToken = BRIDGE_TOKENS.weth;

interface UseSubstrateAssetBalanceOptions {
  wsUrl?: string;
  assetId?: string;
  decimals?: number;
}

// Per-URL singleton connections — supports multiple Substrate chains
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

export function useSubstrateWethBalance(
  address?: string,
  options?: UseSubstrateAssetBalanceOptions,
) {
  const wsUrl = options?.wsUrl ?? defaultSubstrateChain.wsUrl;
  const assetId = options?.assetId;
  const decimals = options?.decimals ?? defaultToken.decimals;
  const divisor = Math.pow(10, decimals);

  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!address || !assetId) {
      setBalance(0);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getApi(wsUrl)
      .then(async (api) => {
        if (cancelled) return;

        try {
          if (api.query.assets?.account) {
            const unsub = await api.query.assets.account(
              assetId,
              address,
              (result: any) => {
                if (cancelled) return;
                const data = result.toJSON();
                if (data && data.balance !== undefined) {
                  setBalance(Number(BigInt(data.balance)) / divisor);
                } else {
                  setBalance(0);
                }
                setIsLoading(false);
              },
            );
            unsubRef.current = unsub as unknown as () => void;
          } else if (api.query.ormlTokens?.accounts) {
            const unsub = await api.query.ormlTokens.accounts(
              address,
              { Token: defaultToken.ticker },
              (result: any) => {
                if (cancelled) return;
                const data = result.toJSON();
                setBalance(Number(BigInt(data?.free ?? 0)) / divisor);
                setIsLoading(false);
              },
            );
            unsubRef.current = unsub as unknown as () => void;
          } else {
            const result = await (api.query as any).assets?.account?.(
              assetId,
              address,
            );
            if (!cancelled) {
              const data = result?.toJSON();
              setBalance(Number(BigInt(data?.balance ?? 0)) / divisor);
              setIsLoading(false);
            }
          }
        } catch (err) {
          console.error("Failed to fetch substrate asset balance:", err);
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
  }, [address, wsUrl, assetId, divisor]);

  return { balance, isLoading };
}