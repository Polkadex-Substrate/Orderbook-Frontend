import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";

import { QUERY_KEYS, TIME_INTERVAL } from "../..";

export const useTraderMetrics = (market: string) => {
  const { api, lmp } = useNativeApi();
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();

  const enabled = !!api && api?.isConnected && !!lmp && market?.length > 0;

  const { data, status } = useQuery({
    queryKey: QUERY_KEYS.traderMetrics(market, mainAddress),
    queryFn: async () => {
      if (!api?.isConnected || !lmp) return;

      const currentEpoch = await lmp.queryCurrentEpoch();
      const blocksToNextEpoch = await lmp.blocksToNextEpoch(
        TIME_INTERVAL.blocksInEpoch
      );

      const traderMetrics = await lmp.getTraderMetrics(
        currentEpoch,
        market,
        mainAddress
      );

      const volumeGeneratedByUser = await lmp.getVolumeGeneratedByUserPerEpoch(
        currentEpoch,
        market,
        mainAddress
      );

      const feePaidByUser = await lmp.getFeePaidByUserPerEpoch(
        currentEpoch,
        market,
        mainAddress
      );

      return {
        ...traderMetrics,
        currentEpoch,
        volumeGeneratedByUser,
        feePaidByUser,
        blocksToNextEpoch,
      };
    },
    enabled,
  });

  return { userMetrics: data, isLoading: status === "pending" };
};
