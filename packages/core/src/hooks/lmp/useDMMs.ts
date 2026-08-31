import { useQuery } from "@tanstack/react-query";
import { lmpApi, DMMAssignment } from "@orderbook/core/lib/lmpApi";
import { QUERY_KEYS } from "@orderbook/core/constants/queryKeys";

export { type DMMAssignment };

export const useDMMs = () => {
  const { data, status } = useQuery({
    queryKey: QUERY_KEYS.lmpDMMs(),
    queryFn: () => lmpApi.fetchActiveDMMs(),
    refetchInterval: 30_000,
  });

  return {
    assignments: data?.assignments ?? [],
    isLoading: status === "pending",
  };
};
