import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import { useQuery } from "@tanstack/react-query";
import { LmpLeaderboard, QUERY_KEYS } from "@orderbook/core";

export const useLeaderBoard = (market: string) => {
  const { api, lmp } = useNativeApi();
  const enabled = !!api && api?.isConnected && !!lmp && market?.length > 0;

  const { data, status } = useQuery({
    queryKey: QUERY_KEYS.lmpLeaderboard(market),
    queryFn: async () => {
      if (!api?.isConnected || !lmp) return;
      const currentEpoch = await lmp.queryCurrentEpoch();
      const previousEpoch = Math.max(currentEpoch - 1, 0); // Must be non-zero always

      const accounts = await lmp.getTopAccounts(previousEpoch, market);

      const res = accounts.map(async (address, i): Promise<LmpLeaderboard> => {
        const reward = await lmp.getEligibleRewards(
          previousEpoch,
          market,
          address
        );
        const totalReward = reward.marketMaking + reward.trading;

        const traderMetrics = await lmp.getTraderMetrics(
          previousEpoch,
          market,
          address
        );

        return {
          rank: i + 1,
          address,
          rewards: totalReward,
          token: "PDEX",
          ...traderMetrics,
        };
      });

      return await Promise.all(res);
    },
    enabled,
  });

  return {
    accounts: data,
    isLoading: status === "pending",
  };
};
