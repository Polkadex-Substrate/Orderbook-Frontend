import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { defaultConfig } from "@orderbook/core/config";
import { Asset } from "@orderbook/core/utils/orderbookService";

import { isAssetPDEX } from "../helpers";
import { EVM_TOKENS, POLKADEX_ASSET } from "../constants";
import { useOrderbookService } from "../providers/public/orderbookServiceProvider/useOrderbookService";

import { useFunds } from "./useFunds";
export interface AssetsProps extends Asset {
  free_balance: string;
  onChainBalance: string;
  inOrdersBalance: string;
}

// The `locale` parameter is gone: it was only ever forwarded to
// BalanceFormatter.toHuman, which ignored it (see packages/format/src/balances.ts,
// where the third argument is unused), and no caller in this repo passed one.
export function useAssets() {
  const [filters, setFilters] = useState({ search: "", hideZero: false });

  const { assets: assetsList, isReady } = useOrderbookService();
  const { balances, loading: balancesLoading } = useFunds();

  const selectGetAsset = useCallback(
    (assetId: string | number | Record<string, string>): Asset | undefined => {
      if (!assetId || !assetsList) {
        return;
      }
      if (typeof assetId === "object" && "asset" in assetId) {
        assetId = assetId.asset;
      }
      return isAssetPDEX(assetId.toString())
        ? POLKADEX_ASSET
        : assetsList?.find((asset) => asset.id === assetId.toString());
    },
    [assetsList]
  );

  const assets = useMemo(
    () =>
      assetsList
        ?.map((e: Asset) => {
          const tokenBalance = balances?.find(
            (value) => value.asset.id === e.id
          );
          const free_balance =
            tokenBalance?.free.toString() === "0"
              ? "0.00"
              : tokenBalance?.free || "0.00";

          const onChainBalance =
            tokenBalance?.onChainBalance === "0"
              ? "0.00"
              : tokenBalance?.onChainBalance || "0.00";

          const inOrdersBalance =
            tokenBalance?.reserved.toString() === "0"
              ? "0.00"
              : tokenBalance?.reserved.toString() || "0.00";

          /*
           * Balances are passed through at FULL precision. They used to go through
           * BalanceFormatter.toHuman(v, 8), which truncates to 8 decimals here, in
           * the data layer, before any component sees the value.
           *
           * That destroyed information irreversibly: anything below 5e-9 became
           * exactly "0", so the UI could not distinguish an empty account from a
           * dust balance - and a balance that exists but reads "0" is the same
           * class of bug as the "0.0000" this work started from. It also defeated
           * AmountCard's `<0.00000001` guard, which exists precisely to say
           * "present but tiny" and can never fire on a value already rounded to 0.
           *
           * Truncation is a DISPLAY concern and now lives in AmountCard, which
           * formats to 8 decimals and puts the exact figure in a hover title.
           * Callers doing arithmetic (transfer max, deposit sizing) get the real
           * number rather than a pre-rounded one.
           */
          // String(): `free` and `reserved` come through as numbers when no trading
          // balance exists (see useFunds' defaultBalance), and AssetsProps declares
          // these as strings. toHuman() used to do this coercion incidentally.
          return {
            ...e,
            free_balance: String(free_balance),
            onChainBalance: String(onChainBalance),
            inOrdersBalance: String(inOrdersBalance),
            isEvm: EVM_TOKENS.includes(e.ticker),
          };
        })
        ?.filter((e: AssetsProps) => {
          const hasZeroAmount =
            filters.hideZero && Number(e?.free_balance || 0) < 0.001;

          const matchesNameOrTicker =
            e.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            e.ticker.toLowerCase().includes(filters.search.toLowerCase());

          return (
            matchesNameOrTicker &&
            !hasZeroAmount &&
            !defaultConfig.blockedAssets?.some((value) => e.id === value)
          );
        })
        ?.sort((a, b) => a.name.localeCompare(b.name)),
    [filters.search, assetsList, balances, filters.hideZero]
  );

  return {
    assets,
    filters,
    loading: !isReady || balancesLoading,
    onHideZeroBalance: () =>
      setFilters({
        ...filters,
        hideZero: !filters.hideZero,
      }),
    onSearchToken: (e: ChangeEvent<HTMLInputElement>) =>
      setFilters({ ...filters, search: e.target.value }),
    selectGetAsset,
  };
}
