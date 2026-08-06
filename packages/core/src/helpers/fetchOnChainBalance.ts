import { ApiPromise } from "@polkadot/api";
import BigNumber from "bignumber.js";
import { UNIT_BN } from "@orderbook/core/constants";

import { isAssetPDEX } from "./isAssetPDEX";

export const fetchOnChainBalance = async (
  api: ApiPromise,
  assetId: string,
  address: string
): Promise<number> => {
  if (!api.isConnected) {
    return 0;
  }
  if (isAssetPDEX(assetId)) {
    const res = await api.query.system.account(address);
    const balanceJson: BalanceJson = res.toJSON() as BalanceJson;
    return new BigNumber(
      balanceJson?.data?.free - balanceJson?.data?.frozen || 0
    )
      .dividedBy(UNIT_BN)
      .toNumber();
  } else {
    const res = await api.query.assets.account(assetId, address);
    const asset = await api.query.assets.metadata(assetId);
    const balanceJson: any = res.toJSON();
    return new BigNumber(balanceJson?.balance || "0")
      .dividedBy(new BigNumber(Math.pow(10, asset.toJSON().decimals as number)))
      .toNumber();
  }
};

export const fetchOnChainBalances = async (
  api: ApiPromise,
  assetIds: string[],
  address: string
): Promise<Map<string, number>> => {
  const rawRes = assetIds.map((id) => fetchOnChainBalance(api, id, address));
  const res = await Promise.all(rawRes);

  const balances = new Map<string, number>();
  res.forEach((item, index) => {
    balances.set(assetIds[index], item);
  });

  return balances;
};

export type BalanceJson = {
  consumers: number;
  data: DataObj;
  nonce: number;
  providers: number;
  sufficients: number;
};

export type DataObj = {
  flags: string;
  free: number;
  frozen: number;
  reserved: number;
};
