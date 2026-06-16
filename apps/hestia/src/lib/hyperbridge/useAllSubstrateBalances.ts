import { useState, useEffect, useCallback } from "react";
import { BRIDGE_CHAINS } from "@/config/bridge";
import type { SubstrateChainConfig } from "@/config/bridge";
import { getSubstrateApi } from "./substrateApiSingleton";

const defaultSubstrateChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;

function decodeBytes(raw: unknown): string {
  if (typeof raw !== "string") return "";
  if (raw.startsWith("0x")) {
    try {
      return Buffer.from(raw.slice(2), "hex")
        .toString("utf8")
        .replace(/\0/g, "")
        .trim();
    } catch {
      return "";
    }
  }
  return raw.trim();
}

export type SubstrateTokenSpec = { ticker: string; decimals: number };

/**
 * Fetches on-chain balances for all given tokens from the Polkadex (Substrate)
 * chain. Asset IDs are discovered automatically from `api.query.assets.metadata`
 * by matching the on-chain symbol to the token ticker — no hardcoding required.
 */
export function useAllSubstrateBalances(
  address?: string,
  tokens?: SubstrateTokenSpec[],
  options?: { wsUrl?: string },
) {
  const wsUrl = options?.wsUrl ?? defaultSubstrateChain.wsUrl;
  const tokensKey = tokens?.map((t) => t.ticker).join(",") ?? "";

  const [refreshCount, setRefreshCount] = useState(0);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  // ticker (uppercase) → on-chain assetId string, discovered from chain metadata
  const [assetIds, setAssetIds] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(() => setRefreshCount((c) => c + 1), []);

  useEffect(() => {
    if (!address || !tokens?.length) {
      setBalances(new Map());
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getSubstrateApi(wsUrl)
      .then(async (api) => {
        if (cancelled) return;

        // Build ticker → assetId from on-chain metadata entries
        const tickerToAssetId = new Map<string, string>();
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entries = await (api.query.assets.metadata as any).entries();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const [storageKey, meta] of entries as [any, any][]) {
            const assetId: string = storageKey.args[0].toString();
            const m = meta.toJSON() as Record<string, unknown>;
            const sym = decodeBytes(m?.symbol);
            if (sym) tickerToAssetId.set(sym.toUpperCase(), assetId);
          }
        } catch (err) {
          console.warn("[useAllSubstrateBalances] metadata.entries() failed:", err);
        }

        // Fetch balance for each token using the discovered assetId
        const result = new Map<string, number>();
        await Promise.all(
          (tokens ?? []).map(async ({ ticker, decimals }) => {
            const assetId = tickerToAssetId.get(ticker.toUpperCase());
            if (!assetId) {
              result.set(ticker, 0);
              return;
            }
            try {
              const res = await api.query.assets.account(assetId, address);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const data = (res as any).toJSON() as Record<string, unknown> | null;
              const raw = BigInt((data?.balance as string | number | null) ?? 0);
              result.set(ticker, Number(raw) / Math.pow(10, decimals));
            } catch {
              result.set(ticker, 0);
            }
          }),
        );

        if (!cancelled) {
          setBalances(result);
          setAssetIds(tickerToAssetId);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("[useAllSubstrateBalances] error:", err);
        if (!cancelled) {
          setBalances(new Map());
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // tokensKey is a stable string proxy for the tokens array — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, wsUrl, tokensKey, refreshCount]);

  return { balances, assetIds, isLoading, refetch };
}
