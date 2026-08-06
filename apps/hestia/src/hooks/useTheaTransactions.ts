// TODO: Move this to packages/core/hooks
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { PolkadexChainQuery } from "@polkadex/subscan";
import { toUnit } from "@polkadex/numericals";
import { Asset, Chain } from "@polkadex/thea";
import { GENESIS, QUERY_KEYS } from "@orderbook/core/constants";
import { defaultConfig } from "@orderbook/core/config";

const chainQuery = new PolkadexChainQuery(defaultConfig.subqueryUrl);

export const useTheaTransactions = ({
  sourceAddress = "",
  assets,
  chains,
  baseAssets,
}: {
  sourceAddress?: string;
  assets: Asset[];
  chains: Chain[];
  baseAssets: Asset[];
}) => {
  const enabled = useMemo(
    () => !!sourceAddress && !!assets && !!chains,
    [sourceAddress, assets, chains]
  );

  return useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.getTheDeposits(sourceAddress, assets.length),
        enabled,
        queryFn: async () => {
          const data = await chainQuery.fetchTheaDeposits({
            address: sourceAddress,
          });
          return formatResult(data, assets, baseAssets, chains, true);
        },
      },
      {
        queryKey: QUERY_KEYS.getTheWithadraws(sourceAddress, assets.length),
        enabled,
        queryFn: async () => {
          const data = await chainQuery.fetchTheaWithdrawals({
            address: sourceAddress,
          });
          return formatResult(data, assets, baseAssets, chains);
        },
      },
    ],
  });
};

type TheaDepositsReturnType = ReturnType<
  PolkadexChainQuery["fetchTheaDeposits"]
>;
type TheaWithdrawReturnType = ReturnType<
  PolkadexChainQuery["fetchTheaWithdrawals"]
>;
type TheaDepositTransaction = Awaited<TheaDepositsReturnType>;
type TheaWithdrawTransaction = Awaited<TheaWithdrawReturnType>;
const formatResult = (
  value: TheaDepositTransaction | TheaWithdrawTransaction,
  assets: Asset[],
  baseAssets: Asset[],
  chains: Chain[],
  isDeposit = false
) =>
  value?.map((data) => {
    const networkId = GENESIS[data?.networkId ?? 0];
    const assetId = data?.assetId.toString();
    const assetData = assets.find((e) => e?.id?.toString().includes(assetId));
    const assetInfo = baseAssets.find((x) => x?.ticker === assetData?.ticker);

    const asset = {
      ...assetData,
      decimal: assetInfo?.decimal,
    };
    const otherNetwork = chains.find((e) =>
      e.genesis.toString().includes(networkId)
    );

    const polkadexNetwork = chains.find((e) =>
      e.genesis.toString().includes(GENESIS[0])
    );

    return {
      timestamp: Number(data.timestamp),
      amount: toUnit(data.amount, isDeposit ? assetInfo?.decimal ?? 12 : 12),
      asset,
      from: isDeposit ? otherNetwork : polkadexNetwork,
      id: isDeposit ? data.id : data.blockHash,
      to: isDeposit ? polkadexNetwork : otherNetwork,
      status: data.status,
      hash: data.blockHash,
      isDeposit,
    };
  });

export type Transactions = ReturnType<typeof formatResult>;
export type Transaction = Transactions[0];
