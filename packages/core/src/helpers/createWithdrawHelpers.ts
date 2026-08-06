import { ApiPromise } from "@polkadot/api";
import { getNonce } from "@orderbook/core/helpers/getNonce";
import {
  Chain,
  ChainType,
  getDirectWithdrawalMultilocation,
} from "@polkadex/thea";

import { GENESIS } from "../constants";

type WithdrawPayload = {
  asset: string | "PDEX";
  amount: string | number;
};

export const createWithdrawSigningPayload = (
  payload: WithdrawPayload,
  api: ApiPromise,
  isExtensionSigner: boolean
) => {
  if (isExtensionSigner) {
    return {
      asset_id: { asset: payload.asset },
      amount: payload.amount,
      timestamp: getNonce(),
      destination_network: null,
    };
  }
  const data = {
    asset_id:
      payload.asset === "PDEX" ? { polkadex: null } : { asset: payload.asset },
    amount: payload.amount,
    timestamp: getNonce(),
    destination_network: null,
  };
  return data;
};

export const createDirectWithdrawSigningPayload = (
  api: ApiPromise,
  payload: WithdrawPayload,
  isExtensionSigner: boolean,
  destinationAccount: string,
  destinationChain: Chain
): [object, object] => {
  const accountId =
    destinationChain.type === ChainType.Substrate
      ? api.createType("AccountId32", destinationAccount)
      : api.createType("AccountId20", destinationAccount);

  const timestamp = getNonce();

  const isDestinationPolkadex = destinationChain.genesis === GENESIS[0];

  const destinationNetworkSign = getDirectWithdrawalMultilocation(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    accountId,
    destinationChain,
    "sign"
  );

  const destinationNetworkSend = getDirectWithdrawalMultilocation(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    accountId,
    destinationChain,
    "send"
  );

  if (isExtensionSigner) {
    const res = {
      asset_id: { asset: payload.asset },
      amount: payload.amount,
      timestamp,
      destination_network: null,
    };

    return [
      {
        ...res,
        destination_network: isDestinationPolkadex
          ? null
          : { Polkadot: [destinationNetworkSign, null] },
      },
      {
        ...res,
        destination_network: isDestinationPolkadex
          ? null
          : { Polkadot: [destinationNetworkSend, null] },
      },
    ];
  }
  const res = {
    asset_id:
      payload.asset === "PDEX" ? { polkadex: null } : { asset: payload.asset },
    amount: payload.amount,
    timestamp,
    destination_network: null,
  };
  return [
    {
      ...res,
      destination_network: isDestinationPolkadex
        ? null
        : { Polkadot: [destinationNetworkSign, null] },
    },
    {
      ...res,
      destination_network: isDestinationPolkadex
        ? null
        : { Polkadot: [destinationNetworkSend, null] },
    },
  ];
};
