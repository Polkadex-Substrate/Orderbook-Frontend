import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";

import { QUERY_KEYS } from "../..";

export const useClaimableRewards = (market: string) => {
  const { api, lmp } = useNativeApi();
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();

  const enabled = !!api && api?.isConnected && !!lmp && market?.length > 0;

  const { data, status } = useQuery({
    queryKey: QUERY_KEYS.lmpRewards(market, mainAddress),
    queryFn: async () => {
      if (!api?.isConnected || !lmp) return;

      const currentEpoch = await lmp.queryCurrentEpoch();
      const claimableEpochs = await lmp.listClaimableEpochs(
        market,
        mainAddress,
        currentEpoch
      );

      const res = claimableEpochs.map(async (epoch) => {
        const reward = await lmp.getEligibleRewards(epoch, market, mainAddress);
        const totalReward = reward.marketMaking + reward.trading;
        return {
          epoch,
          totalReward,
          token: "PDEX",
          isClaimed: reward.isClaimed,
        };
      });

      return await Promise.all(res);
    },
    enabled,
  });

  return { claimableRewards: data, isLoading: status === "pending" };
};
