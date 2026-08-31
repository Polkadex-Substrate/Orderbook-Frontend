import { useQuery } from "@tanstack/react-query";
import { lmpApi, LeaderboardEntry } from "@orderbook/core/lib/lmpApi";
import { QUERY_KEYS } from "@orderbook/core/constants/queryKeys";

export { type LeaderboardEntry };

export const useLMPLeaderboard = (epoch: number, pair?: string) => {
  const { data, status } = useQuery({
    queryKey: QUERY_KEYS.lmpLeaderboardV2(epoch, pair),
    queryFn: () => lmpApi.fetchLeaderboard(epoch, pair),
    refetchInterval: 60_000,
    enabled: epoch > 0,
  });

  return {
    entries: data?.entries ?? [],
    totalParticipants: data?.totalParticipants ?? 0,
    isLoading: status === "pending",
  };
};
