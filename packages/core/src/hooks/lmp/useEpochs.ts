import { useQuery } from "@tanstack/react-query";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";

import { QUERY_KEYS, START_EPOCH } from "../..";

const STATUS = ["Ended", "Ongoing", "Upcoming"] as const;

export const useEpochs = () => {
  const { api, lmp } = useNativeApi();
  const enabled = !!api && api?.isConnected && !!lmp;

  const { data, status } = useQuery({
    queryKey: QUERY_KEYS.epochs(),
    queryFn: async () => {
      if (!api?.isConnected || !lmp) return;

      const currentEpoch = await lmp.queryCurrentEpoch();
      const nextEpoch = currentEpoch + 1;

      const prevEpochs: number[] = [];
      for (let i = currentEpoch - 1; i >= START_EPOCH; i--) {
        prevEpochs.push(i);
        if (prevEpochs.length === 8) break;
      }
      prevEpochs.reverse();

      const allEpochs = prevEpochs.concat([currentEpoch, nextEpoch]);

      const res = allEpochs.map((epoch) => {
        let status: (typeof STATUS)[number];

        if (epoch < currentEpoch) status = "Ended";
        else if (epoch === currentEpoch) status = "Ongoing";
        else status = "Upcoming";

        return {
          epoch,
          status,
          duration: "28 days",
        };
      });

      return res;
    },
    enabled,
  });
  return {
    epochs: data,
    isLoading: status === "pending",
  };
};
