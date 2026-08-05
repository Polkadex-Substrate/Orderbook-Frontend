import { useState, useEffect, useRef } from "react";

import { getSubstrateApi } from "./substrateApiSingleton";

import { BRIDGE_CHAINS } from "@/config/bridge";
import type { SubstrateChainConfig } from "@/config/bridge";

const defaultSubstrateChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;

interface UseSubstrateNativeBalanceOptions {
  wsUrl?: string;
  decimals?: number;
}

/*
 * This file used to carry its own copy of the per-URL connection pool - the same
 * Map/Set/queue code as substrateApiSingleton.ts, with the variables renamed.
 * A third copy lived in useSubstrateWethBalance.ts (now deleted, nothing
 * imported it).
 *
 * Separate module-level Maps are separate pools, so the "singleton" was opening
 * one WsProvider socket per copy against the same node. Sharing the real
 * singleton means one socket per URL for the whole app, which matters when the
 * chain RPC is the flaky dependency - and it has been.
 */

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

    getSubstrateApi(wsUrl)
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
