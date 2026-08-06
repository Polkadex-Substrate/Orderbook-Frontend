/**
 * This hook manages state and actions related to:
 * - Asset selection
 * - Asset modal
 * - Deposit/withdrawal interaction
 * - Toggle switch between deposit between Polkadex accounts
 */

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { filterBlockedAssets } from "@orderbook/core/helpers";
import { useAssets, useFunds } from "@orderbook/core/hooks";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { BalanceFormatter } from "@orderbook/format";
import { Asset } from "@orderbook/core/utils/orderbookService";

export interface FilteredAssetProps extends Asset {
  free_balance?: string;
  onChainBalance?: string;
}

const types = ["deposit", "withdraw", "transfer"];
export type SwitchType = "deposit" | "withdraw" | "transfer";

const onChangeState = (onCallback: Dispatch<SetStateAction<boolean>>) => {
  onCallback((prevValue) => !prevValue);
};

export function useTransfer() {
  const toHuman = BalanceFormatter.toHuman;
  const { assets: list } = useAssets();
  const { balances, loading } = useFunds();
  const { push } = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const typeParams = searchParams?.get("type");
  const [assetsInteraction, setAssetsInteraction] = useState(false);
  const [switchEnable, setSwitchEnable] = useState(false);

  const isValidParams = useMemo(
    () => types.includes(typeParams?.toLowerCase() ?? ""),
    [typeParams]
  );

  const [type, setType] = useState<SwitchType>(
    isValidParams ? (typeParams as SwitchType) : "deposit"
  );

  const onAssetsInteraction = (callback?: () => void) => {
    if (typeof callback === "function" && callback) callback();
    onChangeState(setAssetsInteraction);
  };
  const onChangeAsset = (asset: FilteredAssetProps) => {
    push(`/transfer/${asset.ticker}` + "?" + createQueryString("type", type));
    onAssetsInteraction();
  };

  const filteredNonBlockedAssets = useMemo(
    () =>
      filterBlockedAssets(list)?.map((e) => {
        const tokenBalance = balances?.find((value) => value.asset.id === e.id);
        const free_balance =
          String(tokenBalance?.free) === "0"
            ? "0.00"
            : String(tokenBalance?.free) || "0.00";

        const onChainBalance =
          tokenBalance?.onChainBalance === "0"
            ? "0.00"
            : tokenBalance?.onChainBalance || "0.00";

        return {
          ...e,
          free_balance: toHuman(Number(free_balance), 8, "en"),
          onChainBalance: toHuman(Number(onChainBalance), 8, "en"),
        } as FilteredAssetProps;
      }),
    [list, balances, toHuman]
  );

  /* Select default asset */
  const selectedAsset = useMemo(() => {
    const foundAsset = filteredNonBlockedAssets?.find(
      ({ ticker }) => ticker === params?.id
    );

    return foundAsset ?? filteredNonBlockedAssets?.[0];
  }, [filteredNonBlockedAssets, params?.id]);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  return {
    loading,
    assetsInteraction,
    onAssetsInteraction,
    onChangeAsset,
    onChangeType: (v: SwitchType) => setType(v),
    type,
    selectedAsset,
    switchEnable,
    onDisableSwitch: (v = false) => setSwitchEnable(v),
    createQueryString,
  };
}
