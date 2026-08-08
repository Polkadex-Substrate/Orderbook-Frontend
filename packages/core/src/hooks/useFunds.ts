import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, useMemo, useState } from "react";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";

import { QUERY_KEYS } from "../constants";
import { appsyncOrderbookService } from "../utils/orderbookService";
import { fetchOnChainBalance } from "../helpers";
import { useOrderbookService } from "../providers/public/orderbookServiceProvider/useOrderbookService";

import { useOnChainBalances } from "./useOnChainBalances";
import { matchTradingBalance } from "./matchTradingBalance";

export function useFunds() {
  const queryClient = useQueryClient();
  const { isReady, assets: assetsList } = useOrderbookService();
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();
  const { api } = useNativeApi();

  const isAssetsFetched = isReady;
  const [state, setState] = useState("");
  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setState(e.target.value);

  const shouldFetchTradingBalance = Boolean(
    isAssetsFetched && mainAddress && mainAddress?.length > 0
  );

  const {
    isLoading: isTradingBalanceLoading,
    isSuccess: isTradingBalanceSuccess,
    data: tradingBalances,
  } = useQuery({
    queryKey: QUERY_KEYS.tradingBalances(mainAddress),
    queryFn: async () =>
      await appsyncOrderbookService.query.getBalance(mainAddress),
    enabled: shouldFetchTradingBalance,
  });

  const { onChainBalances, isOnChainBalanceLoading, isOnChainBalanceSuccess } =
    useOnChainBalances();

  const balances = useMemo(() => {
    if (!isAssetsFetched) return [];

    return assetsList.map((asset) => {
      const currentAssetId = asset.id;

      // Default Balance Object
      const defaultBalance = {
        asset,
        reserved: 0,
        free: 0,
        onChainBalance: "0",
      };

      // Get trading balance object for current assetId
      //
      // The miss here was `return {}` for a balance with no asset. `find` tests
      // the RETURN VALUE for truthiness, and `{}` is truthy - so a single
      // malformed entry anywhere in the list matched EVERY lookup, and `find`
      // returned that one entry for every asset id queried. Since the result is
      // spread over the defaults below, every asset in the app would then report
      // the same free/reserved pair: identical balances across unrelated tokens,
      // which reads as "the balances are wrong" because they are.
      //
      // It only fires when the engine returns a balance whose asset did not
      // resolve against assetsList - the same unresolvable-asset condition
      // knownMarkets.ts handles for markets - so it is data-dependent and
      // invisible until it isn't.
      const tradingBalance = matchTradingBalance(
        tradingBalances,
        currentAssetId
      );

      // Get onChain balances for current assetId
      const onChainBalance =
        onChainBalances?.get(currentAssetId)?.toString() || "0";

      // Merge the data
      return {
        ...defaultBalance,
        ...tradingBalance,
        onChainBalance,
      };
    });
  }, [isAssetsFetched, tradingBalances, onChainBalances, assetsList]);

  const getFreeProxyBalance = (assetId: string) => {
    const balance = balances?.find(
      (balance) => balance?.asset?.id?.toString() === assetId
    );
    if (!balance?.asset.id) return "0";
    return balance.free.toFixed(20);
  };

  const onChangeChainBalance = async (assetId: string) => {
    if (api) {
      const newOnChainBalance = await fetchOnChainBalance(
        api,
        assetId,
        mainAddress
      );

      // Update chain balance
      queryClient.setQueryData(
        QUERY_KEYS.onChainBalances(mainAddress),
        (prevData) => {
          const oldData = new Map(prevData as Map<string, number>);
          oldData.set(assetId, Number(newOnChainBalance));
          return oldData;
        }
      );
    }
  };

  return {
    balances,
    loading: Boolean(
      (isTradingBalanceLoading || isOnChainBalanceLoading) &&
      mainAddress?.length
    ),
    success: isTradingBalanceSuccess || isOnChainBalanceSuccess,
    getFreeProxyBalance,
    onChangeChainBalance,

    searchState: state,
    handleChange,
  };
}
