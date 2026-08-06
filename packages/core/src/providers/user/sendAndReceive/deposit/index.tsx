import { UseQueryResult } from "@tanstack/react-query";
import { ExtensionAccount } from "@polkadex/react-providers";
import {
  Chain,
  Asset,
  Thea,
  ChainType,
  getChainConnector,
  AssetAmount,
  TransferConfig,
} from "@polkadex/thea";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { GENESIS } from "@orderbook/core/constants";
import { useTheaBalances, useTheaConfig } from "@orderbook/core/hooks";

import { useConnectWalletProvider } from "../../connectWalletProvider";

export { useDirectDepositProvider } from "./useDirectDeposit";

export const DirectDepositProvider = ({ children }: PropsWithChildren) => {
  const { getAllChains } = useMemo(() => new Thea(), []);
  const [sourceChain, setSourceChain] = useState<Chain | null>(null);
  const [sourceAccount, setSourceAccount] = useState<ExtensionAccount>();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const { selectedWallet } = useConnectWalletProvider();

  const chains = useMemo(() => getAllChains(), [getAllChains]);

  /* Source chain */
  const sourceConnector = useMemo(
    () => sourceChain && getChainConnector(sourceChain.genesis),
    [sourceChain]
  );

  const sourceAccountSelected = useMemo(
    () =>
      sourceAccount ??
      (sourceChain?.type === ChainType.Substrate ? selectedWallet : undefined),
    [sourceAccount, selectedWallet, sourceChain?.type]
  );

  const onSelectSourceChain = (chain: Chain) => {
    if (sourceChain?.type !== chain.type) setSourceAccount(undefined);
    const connector = getChainConnector(chain.genesis);
    const selectedAsset = connector.getSupportedAssets(destinationChain)[0];
    setSourceChain(chain);
    setSelectedAsset(selectedAsset);
  };

  const isSourcePolkadex = useMemo(
    () => !!(sourceChain?.genesis === GENESIS[0]),
    [sourceChain?.genesis]
  );

  /* Destination Chain (which would be Polkadex always) */
  const destinationChain = useMemo(
    () => chains.find((c) => c.genesis === GENESIS[0]) as Chain,
    [chains]
  );

  const destinationAccountSelected = useMemo(
    () => selectedWallet,
    [selectedWallet]
  );

  const destinationConnector = useMemo(
    () => destinationChain && getChainConnector(destinationChain.genesis),
    [destinationChain]
  );

  const destinationAssets = useMemo(
    () => destinationConnector.getAllAssets(),
    [destinationConnector]
  );

  const {
    data: destinationBalances = [],
    isLoading: destinationBalancesLoading,
  } = useTheaBalances({
    connector: destinationConnector,
    sourceAddress: destinationAccountSelected?.address,
    assets: destinationAssets,
    chain: destinationChain.genesis,
  });

  const destinationPDEXBalance = useMemo(
    () =>
      destinationBalances
        ? destinationBalances.find((e) => e.ticker === "PDEX")?.amount ?? 0 // Remove static data
        : 0,
    [destinationBalances]
  );

  const selectedAssetIdDestination = useMemo(
    () =>
      destinationAssets?.find((e) =>
        e.ticker.includes(selectedAsset?.ticker ?? "")
      )?.id,
    [destinationAssets, selectedAsset?.ticker]
  );

  /* Asset */
  const supportedAssets = useMemo(() => {
    if (isSourcePolkadex) {
      return sourceConnector?.getAllAssets() || [];
    }
    return (
      (destinationChain &&
        sourceConnector?.getSupportedAssets(destinationChain)) ||
      []
    );
  }, [destinationChain, isSourcePolkadex, sourceConnector]);

  const onSelectAsset = (asset: Asset) => {
    if (!supportedAssets.some((e) => e.ticker === asset.ticker)) return;
    setSelectedAsset(asset);
  };

  /* Fetch balance for supported assets for source chain */
  const {
    data: sourceBalances = [],
    isLoading: sourceBalancesLoading,
    isFetching: sourceBalancesFetching,
    isSuccess: sourceBalancesSuccess,
    refetch: sourceBalancesRefetch,
  } = useTheaBalances({
    connector: sourceConnector,
    sourceAddress: sourceAccountSelected?.address,
    assets: supportedAssets,
    chain: sourceChain?.genesis,
  });

  /* Fetch transfer config for selected asset & source chain */
  const {
    data: transferConfig,
    isLoading: transferConfigLoading,
    isFetching: transferConfigFetching,
    isSuccess: transferConfigSuccess,
    refetch: refetchTransferConfig,
  } = useTheaConfig({
    connector: isSourcePolkadex ? null : sourceConnector,
    sourceAddress: sourceAccountSelected?.address,
    destinationAddress: destinationAccountSelected?.address,
    selectedAsset,
    destinationChain,
    isDirectDeposit: true,
  });

  const selectedAssetBalance = useMemo(
    () =>
      selectedAsset && sourceBalances
        ? sourceBalances.find((e) => e.ticker === selectedAsset?.ticker)
            ?.amount ?? 0
        : 0,
    [selectedAsset, sourceBalances]
  );

  /* Default Selection Logic  */
  const initialSource = useMemo(() => {
    return chains.find((c) => c.genesis === GENESIS[1]);
  }, [chains]);

  useEffect(() => {
    if (initialSource && !sourceChain) setSourceChain(initialSource);
  }, [initialSource, sourceChain]);

  useEffect(() => {
    if (!selectedAsset && destinationChain && sourceChain && supportedAssets)
      setSelectedAsset(supportedAssets[0]);
  }, [selectedAsset, destinationChain, sourceChain, supportedAssets]);

  return (
    <Provider
      value={{
        chains,

        sourceChain,
        onSelectSourceChain,
        isSourcePolkadex,
        sourceAccount: sourceAccountSelected,
        setSourceAccount,
        destinationAccount: destinationAccountSelected,
        destinationChain,

        supportedAssets,
        selectedAsset,
        onSelectAsset,
        selectedAssetBalance,

        sourceBalances,
        sourceBalancesLoading: sourceBalancesLoading && sourceBalancesFetching,
        sourceBalancesSuccess,
        onRefetchSourceBalances: sourceBalancesRefetch,

        destinationAssets,
        destinationBalances,
        isDestinationBalanceLoading: destinationBalancesLoading,
        selectedAssetIdDestination,
        destinationPDEXBalance,

        transferConfig,
        transferConfigLoading: transferConfigLoading && transferConfigFetching,
        transferConfigSuccess,
        onRefetchTransferConfig: refetchTransferConfig,
      }}
    >
      {children}
    </Provider>
  );
};

type State = {
  chains: Chain[];

  sourceChain: Chain | null;
  onSelectSourceChain: (chain: Chain) => void;
  isSourcePolkadex: boolean;
  sourceAccount?: ExtensionAccount;
  setSourceAccount: Dispatch<SetStateAction<ExtensionAccount | undefined>>;

  destinationChain: Chain;
  destinationAccount?: ExtensionAccount;

  supportedAssets: Asset[];
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  selectedAssetBalance: number;

  sourceBalances: AssetAmount[];
  sourceBalancesLoading: boolean;
  sourceBalancesSuccess: boolean;
  onRefetchSourceBalances?: UseQueryResult["refetch"];

  transferConfig: TransferConfig | undefined;
  transferConfigLoading: boolean;
  transferConfigSuccess: boolean;
  onRefetchTransferConfig?: UseQueryResult["refetch"];

  destinationAssets: Asset[];
  destinationBalances: AssetAmount[];
  isDestinationBalanceLoading: boolean;
  selectedAssetIdDestination?: string;
  destinationPDEXBalance: number;
};

const Context = createContext<State>({
  chains: [],

  sourceChain: null,
  onSelectSourceChain: () => {},
  isSourcePolkadex: false,
  sourceAccount: undefined,
  setSourceAccount: () => {},

  destinationChain: {} as Chain,

  supportedAssets: [],
  selectedAsset: null,
  onSelectAsset: () => {},
  selectedAssetBalance: 0,

  sourceBalances: [],
  sourceBalancesLoading: false,
  sourceBalancesSuccess: false,

  transferConfig: undefined,
  transferConfigLoading: false,
  transferConfigSuccess: false,

  destinationAssets: [],
  destinationBalances: [],
  isDestinationBalanceLoading: false,
  destinationPDEXBalance: 0,
});

const Provider = ({ value, children }: PropsWithChildren<{ value: State }>) => {
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const DepositContext = Context;
