import { useQuery } from "@tanstack/react-query";
import { Asset, BaseChainAdapter, Chain } from "@polkadex/thea";
import { useMemo } from "react";

import { QUERY_KEYS } from "../constants";

export const useTheaConfig = ({
  sourceAddress = "",
  destinationChain = null,
  selectedAsset,
  destinationAddress = "",
  connector,
  isDirectDeposit,
}: {
  sourceAddress?: string;
  destinationChain: Chain | null;
  selectedAsset: Asset | null;
  destinationAddress?: string;
  connector: BaseChainAdapter | null;
  isDirectDeposit?: boolean;
}) => {
  const enabled = useMemo(
    () =>
      !!sourceAddress &&
      !!destinationChain &&
      !!selectedAsset &&
      !!destinationAddress &&
      !!connector,
    [
      connector,
      sourceAddress,
      destinationChain,
      selectedAsset,
      destinationAddress,
    ]
  );

  return useQuery({
    queryKey: QUERY_KEYS.getTheConfig(
      sourceAddress,
      destinationAddress,
      selectedAsset?.ticker ?? "",
      destinationChain?.genesis ?? ""
    ),
    enabled,
    queryFn: async () => {
      if (!destinationChain || !selectedAsset || !connector) return;

      const res = await connector?.getTransferConfig(
        destinationChain,
        selectedAsset,
        sourceAddress,
        destinationAddress,
        isDirectDeposit
      );
      return res;
    },
    refetchInterval: 12 * 1000,
  });
};
