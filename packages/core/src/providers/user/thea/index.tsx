"use client";

import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getChainConnector,
  Thea,
  Chain,
  Asset,
  AssetAmount,
  BaseChainAdapter,
  TransferConfig,
  ChainType,
} from "@polkadex/thea";
import { defaultConfig } from "@orderbook/core/config";
import { ExtensionAccount } from "@polkadex/react-providers";
import { useTheaBalances, useTheaConfig } from "@orderbook/core/hooks";
import { isIdentical } from "@orderbook/core/helpers";
import { GENESIS } from "@orderbook/core/constants";
import { UseQueryResult } from "@tanstack/react-query";

import { useConnectWalletProvider } from "../connectWalletProvider";
const {
  disabledTheaChains,
  defaultTheaDestinationChain,
  defaultTheaSourceChain,
} = defaultConfig;
export type GenericStatus = "error" | "idle" | "success" | "loading";

export { useTheaProvider } from "./useThea";
export const TheaProvider = ({
  initialAssetTicker,
  initialSourceName,
  initialDestinationName,
  children,
}: PropsWithChildren<{
  initialAssetTicker: string | null;
  initialSourceName: string | null;
  initialDestinationName: string | null;
}>) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [sourceChain, setSourceChain] = useState<Chain | null>(null);
  const [destinationChain, setDestinationChain] = useState<Chain | null>(null);
  const [sourceAccount, setSourceAccount] = useState<ExtensionAccount>();
  const [destinationAccount, setDestinationAccount] =
    useState<ExtensionAccount>();
  const { selectedWallet } = useConnectWalletProvider();

  const { getAllChains } = useMemo(() => new Thea(), []);

  const chains = useMemo(
    () =>
      getAllChains()?.filter((e) => !disabledTheaChains.includes(e.genesis)),
    [getAllChains]
  );

  /** Source Chain  **/
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

  const supportedDestinationChains = useMemo(() => {
    return sourceConnector?.getDestinationChains() || [];
  }, [sourceConnector]);

  const onSelectSourceChain = (chain: Chain) => {
    if (sourceChain?.type !== chain.type) setSourceAccount(undefined);
    const connector = getChainConnector(chain.genesis);
    const destChain = connector.getDestinationChains()[0];
    const selectedAsset = connector.getSupportedAssets(destChain)[0];
    setSourceChain(chain);
    setDestinationChain(destChain);
    setSelectedAsset(selectedAsset);
  };

  /* Destination Chain */
  const destinationConnector = useMemo(
    () => destinationChain && getChainConnector(destinationChain.genesis),
    [destinationChain]
  );

  const destinationAccountSelected = useMemo(
    () =>
      destinationAccount ??
      (destinationChain?.type === ChainType.Substrate
        ? selectedWallet
        : undefined),
    [destinationAccount, selectedWallet, destinationChain?.type]
  );

  const onSelectDestinationChain = (chain: Chain) => {
    if (
      !sourceConnector
        ?.getDestinationChains()
        .some((e) => e.genesis === chain.genesis)
    )
      return;
    if (destinationChain?.type !== chain.type) setDestinationAccount(undefined);
    const selectedAsset = sourceConnector.getSupportedAssets(chain)[0];
    setDestinationChain(chain);
    setSelectedAsset(selectedAsset);
  };

  /* Asset */
  const supportedAssets = useMemo(
    () =>
      (destinationChain &&
        sourceConnector?.getSupportedAssets(destinationChain)) ||
      [],
    [destinationChain, sourceConnector]
  );

  const onSelectAsset = (asset: Asset) => {
    if (!supportedAssets.some((e) => e.ticker === asset.ticker)) return;
    setSelectedAsset(asset);
  };

  /* Switch Chain */
  const onSwitchChain = () => {
    if (!destinationChain || !sourceChain) return;
    const source = destinationChain;
    const destination = sourceChain;
    setSourceChain(source);
    setDestinationChain(destination);
    const connector = getChainConnector(source.genesis);
    const supportedAssets = connector.getSupportedAssets(destination);
    const asset =
      supportedAssets.find((a) => a.ticker === selectedAsset?.ticker) ??
      supportedAssets[0];
    setSelectedAsset(asset);

    // Swap wallets if chain type is different
    if (source.type !== destination.type) {
      setSourceAccount(undefined);
      setDestinationAccount(undefined);
    }
  };

  /* Polkadex */
  const isSourcePolkadex = useMemo(
    () => !!(sourceChain?.genesis === GENESIS[0]),
    [sourceChain?.genesis]
  );

  const isDestinationPolkadex = useMemo(
    () => !!(destinationChain?.genesis === GENESIS[0]),
    [destinationChain?.genesis]
  );

  const polkadexConnector = useMemo(
    () => destinationChain && getChainConnector(GENESIS[0]),
    [destinationChain]
  );

  const polkadexAssets = useMemo(
    () => polkadexConnector?.getAllAssets() || [],
    [polkadexConnector]
  );

  const {
    data: polkadexDestinationBalances = [],
    isLoading: isPolkadexDestinationBalancesLoading,
  } = useTheaBalances({
    connector: polkadexConnector,
    sourceAddress: destinationAccountSelected?.address,
    assets: polkadexAssets,
    chain: GENESIS[0],
  });

  const destinationPDEXBalance = useMemo(
    () =>
      polkadexDestinationBalances
        ? polkadexDestinationBalances.find((e) => e.ticker === "PDEX")
            ?.amount ?? 0 // Remove static data
        : 0,
    [polkadexDestinationBalances]
  );

  const selectedAssetIdPolkadex = useMemo(
    () =>
      polkadexAssets?.find((e) =>
        e.ticker.includes(selectedAsset?.ticker ?? "")
      )?.id,
    [polkadexAssets, selectedAsset?.ticker]
  );

  /* Default Selection Logic  */
  const initialSource = useMemo(() => {
    if (chains) {
      return !!initialSourceName && initialSourceName !== initialDestinationName
        ? isIdentical(chains, initialSourceName, "name")
        : isIdentical(chains, defaultTheaSourceChain, "name");
    }
  }, [initialSourceName, chains, initialDestinationName]);

  const initialDestination = useMemo(() => {
    if (chains) {
      const defaultChain =
        initialSourceName !== defaultTheaDestinationChain
          ? isIdentical(chains, defaultTheaDestinationChain, "name")
          : undefined;

      return !!initialDestinationName &&
        initialSourceName !== initialDestinationName
        ? isIdentical(chains, initialDestinationName, "name")
        : defaultChain;
    }
  }, [chains, initialDestinationName, initialSourceName]);

  const initialAsset = useMemo(() => {
    if (supportedAssets) {
      const asset =
        initialAssetTicker &&
        isIdentical(supportedAssets, initialAssetTicker, "ticker");
      return asset || supportedAssets[0];
    }
  }, [initialAssetTicker, supportedAssets]);

  useEffect(() => {
    if (initialSource && !sourceChain) setSourceChain(initialSource);
  }, [initialSource, sourceChain]);

  useEffect(() => {
    if (!destinationChain && sourceChain && supportedDestinationChains)
      setDestinationChain(initialDestination || supportedDestinationChains[0]);
  }, [
    initialDestination,
    destinationChain,
    supportedDestinationChains,
    sourceChain,
  ]);

  useEffect(() => {
    if (!selectedAsset && destinationChain && sourceChain && supportedAssets)
      setSelectedAsset(initialAsset || supportedAssets[0]);
  }, [
    initialAsset,
    selectedAsset,
    destinationChain,
    sourceChain,
    supportedAssets,
  ]);

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
    connector: sourceConnector,
    destinationAddress: destinationAccountSelected?.address,
    sourceAddress: sourceAccountSelected?.address,
    selectedAsset,
    destinationChain,
  });

  const selectedAssetBalance = useMemo(
    () =>
      selectedAsset && sourceBalances
        ? sourceBalances.find((e) => e.ticker === selectedAsset?.ticker)
            ?.amount ?? 0
        : 0,
    [selectedAsset, sourceBalances]
  );

  return (
    <Provider
      value={{
        supportedSourceChains: chains,
        sourceConnector,
        destinationConnector,

        sourceAccount: sourceAccountSelected,
        setSourceAccount,
        destinationAccount: destinationAccountSelected,
        setDestinationAccount,

        sourceChain,
        onSelectSourceChain,
        destinationChain,
        onSelectDestinationChain,
        supportedDestinationChains,
        onSwitchChain,

        supportedAssets,
        selectedAsset,
        onSelectAsset,
        selectedAssetBalance,

        sourceBalances,
        sourceBalancesLoading: sourceBalancesLoading && sourceBalancesFetching,
        sourceBalancesSuccess,
        onRefetchSourceBalances: sourceBalancesRefetch,

        transferConfig,
        transferConfigLoading: transferConfigLoading && transferConfigFetching,
        transferConfigSuccess,
        onRefetchTransferConfig: refetchTransferConfig,

        destinationPDEXBalance,
        isDestinationPDEXBalanceLoading: isPolkadexDestinationBalancesLoading,
        isSourcePolkadex,
        isDestinationPolkadex,
        polkadexAssets,
        selectedAssetIdPolkadex,
      }}
    >
      {children}
    </Provider>
  );
};

type State = {
  sourceConnector: BaseChainAdapter | null;
  destinationConnector: BaseChainAdapter | null;

  sourceAccount?: ExtensionAccount;
  setSourceAccount: Dispatch<SetStateAction<ExtensionAccount | undefined>>;
  supportedSourceChains: Chain[];
  supportedDestinationChains: Chain[];

  destinationAccount?: ExtensionAccount;
  setDestinationAccount: Dispatch<SetStateAction<ExtensionAccount | undefined>>;

  destinationChain: Chain | null;
  onSelectDestinationChain: (chain: Chain) => void;
  sourceChain: Chain | null;
  onSelectSourceChain: (chain: Chain) => void;
  onSwitchChain: () => void;

  supportedAssets: Asset[];
  polkadexAssets: Asset[];

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

  destinationPDEXBalance: number;
  isDestinationPDEXBalanceLoading: boolean;
  isSourcePolkadex: boolean;
  isDestinationPolkadex: boolean;
  selectedAssetIdPolkadex?: string;
};
export const Context = createContext<State>({
  sourceConnector: null,
  destinationConnector: null,

  sourceAccount: undefined,
  setSourceAccount: () => {},
  destinationAccount: undefined,
  setDestinationAccount: () => {},

  destinationChain: null,
  onSelectDestinationChain: () => {},
  sourceChain: null,
  onSelectSourceChain: () => {},
  supportedSourceChains: [],
  supportedDestinationChains: [],
  onSwitchChain: () => {},

  supportedAssets: [],
  polkadexAssets: [],

  selectedAsset: null,
  onSelectAsset: () => {},
  selectedAssetBalance: 0,

  sourceBalances: [],
  sourceBalancesLoading: false,
  sourceBalancesSuccess: false,

  transferConfig: undefined,
  transferConfigLoading: false,
  transferConfigSuccess: false,

  destinationPDEXBalance: 0,
  isDestinationPDEXBalanceLoading: false,
  isSourcePolkadex: false,
  isDestinationPolkadex: false,
});

const Provider = ({ value, children }: PropsWithChildren<{ value: State }>) => {
  return <Context.Provider value={value}>{children}</Context.Provider>;
};
