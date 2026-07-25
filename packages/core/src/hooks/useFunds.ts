import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, useMemo, useState } from "react";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";

import { QUERY_KEYS } from "../constants";
import { appsyncOrderbookService } from "../utils/orderbookService";
import { fetchOnChainBalance } from "../helpers";
import { useOrderbookService } from "../providers/public/orderbookServiceProvider/useOrderbookService";

import { useOnChainBalances } from "./useOnChainBalances";

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
      const tradingBalance = tradingBalances?.find((balance) => {
        if (!balance?.asset) return {};
        return balance.asset.id === currentAssetId;
      });

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
