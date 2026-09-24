import { useQuery } from "@tanstack/react-query";
import { lmpApi, ClaimableReward } from "@orderbook/core/lib/lmpApi";
import { QUERY_KEYS } from "@orderbook/core/constants/queryKeys";

export { type ClaimableReward };

export const useLMPHistory = (address: string | undefined) => {
  const { data, status, refetch } = useQuery({
    queryKey: QUERY_KEYS.lmpHistory(address ?? ""),
    queryFn: () => lmpApi.fetchClaimableRewards(address!),
    enabled: !!address,
  });

  return {
    history: data?.claimable ?? [],
    isLoading: status === "pending",
    refetch,
  };
};
