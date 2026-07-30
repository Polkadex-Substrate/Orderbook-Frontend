import { useState, useEffect, useCallback } from "react";

import { getSubstrateApi } from "./substrateApiSingleton";

import { BRIDGE_CHAINS } from "@/config/bridge";
import type { SubstrateChainConfig } from "@/config/bridge";

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

export type SubstrateTokenSpec = {
  ticker: string;
  /**
   * Fallback only, used if the chain has no metadata for this asset.
   *
   * Do NOT pass the token's EVM decimals expecting them to be used. Callers were
   * passing BridgeTokenConfig.decimals - the ERC-20 value, 18 for WETH and 6 for
   * USDC - while pallet_assets on Polkadex stores every bridged asset at 12dp.
   * That divided WETH balances by 10^18 against a 10^12 value (a million times
   * too small) and USDC by 10^6 (a million times too large).
   */
  decimals?: number;
};

/**
 * Fetches on-chain balances for all given tokens from the Polkadex (Substrate)
 * chain.
 *
 * Asset IDs AND decimals both come from `api.query.assets.metadata`, matching
 * the on-chain symbol to the token ticker - nothing about the Substrate side is
 * hardcoded. The metadata entries were already being read here to discover
 * asset ids; the decimals were sitting in the same payload, unused.
 *
 * Reading them from chain rather than config means a `forceSetMetadata` can
 * never silently desync the UI again - which is exactly what happened when all
 * nine testnet assets were normalised to 12dp.
 */
export function useAllSubstrateBalances(
  address?: string,
  tokens?: SubstrateTokenSpec[],
  options?: { wsUrl?: string }
) {
  const wsUrl = options?.wsUrl ?? defaultSubstrateChain.wsUrl;
  const tokensKey = tokens?.map((t) => t.ticker).join(",") ?? "";

  const [refreshCount, setRefreshCount] = useState(0);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  // ticker (uppercase) → on-chain assetId string, discovered from chain metadata
  const [assetIds, setAssetIds] = useState<Map<string, string>>(new Map());
  // ticker (uppercase) → on-chain decimals. Exposed so callers that need to
  // build extrinsic amounts scale them the same way balances were read.
  const [assetDecimals, setAssetDecimals] = useState<Map<string, number>>(
    new Map()
  );
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

        // Build ticker → assetId and ticker → decimals from the same metadata
        // entries. Both are authoritative; neither should come from config.
        const tickerToAssetId = new Map<string, string>();
        const tickerToDecimals = new Map<string, number>();
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entries = await (api.query.assets.metadata as any).entries();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const [storageKey, meta] of entries as [any, any][]) {
            const assetId: string = storageKey.args[0].toString();
            const m = meta.toJSON() as Record<string, unknown>;
            const sym = decodeBytes(m?.symbol);
            if (!sym) continue;
            tickerToAssetId.set(sym.toUpperCase(), assetId);

            // decimals is a plain number in the metadata JSON. Guard against
            // 0/undefined rather than trusting it: a missing value would become
            // 10^0 = 1 and render the raw integer balance as if it were whole
            // tokens, which looks like an enormous balance rather than an error.
            const dec = Number(m?.decimals);
            if (Number.isFinite(dec) && dec > 0) {
              tickerToDecimals.set(sym.toUpperCase(), dec);
            }
          }
        } catch (err) {
          console.warn(
            "[useAllSubstrateBalances] metadata.entries() failed:",
            err
          );
        }

        // Fetch balance for each token using the discovered assetId
        const result = new Map<string, number>();
        await Promise.all(
          (tokens ?? []).map(async ({ ticker, decimals: fallbackDecimals }) => {
            const key = ticker.toUpperCase();
            const assetId = tickerToAssetId.get(key);
            if (!assetId) {
              result.set(ticker, 0);
              return;
            }

            // Chain first; the caller's value is a last resort.
            const decimals = tickerToDecimals.get(key) ?? fallbackDecimals;
            if (decimals === undefined) {
              console.warn(
                `[useAllSubstrateBalances] no on-chain decimals for ${ticker} (asset ${assetId}) and no fallback given - reporting 0 rather than guessing a scale.`
              );
              result.set(ticker, 0);
              return;
            }

            try {
              const res = await api.query.assets.account(assetId, address);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const data = (res as any).toJSON() as Record<
                string,
                unknown
              > | null;
              const raw = BigInt(
                (data?.balance as string | number | null) ?? 0
              );
              result.set(ticker, Number(raw) / Math.pow(10, decimals));
            } catch {
              result.set(ticker, 0);
            }
          })
        );

        if (!cancelled) {
          setBalances(result);
          setAssetIds(tickerToAssetId);
          setAssetDecimals(tickerToDecimals);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("[useAllSubstrateBalances] error:", err);
        if (!cancelled) {
          setBalances(new Map());
          setAssetDecimals(new Map());
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // tokensKey is a stable string proxy for the tokens array - intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, wsUrl, tokensKey, refreshCount]);

  return { balances, assetIds, assetDecimals, isLoading, refetch };
}
