"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import { useAccount, useBalance } from "wagmi";

import { useHyperbridgeFees } from "@/lib/hyperbridge/useHyperbridgeFees";
import { useSubstrateNativeBalance } from "@/lib/hyperbridge/useSubstrateNativeBalance";
import { useAllSubstrateBalances } from "@/lib/hyperbridge/useAllSubstrateBalances";
import { useAllEvmTokenBalances } from "@/lib/hyperbridge/useAllEvmTokenBalances";
import {
  BRIDGE_CHAINS,
  BRIDGE_TOKENS,
  getRouteSupportedTokens,
} from "@/config/bridge";
import type {
  BridgeChainConfig,
  BridgeTokenConfig,
  EvmChainConfig,
  SubstrateChainConfig,
} from "@/config/bridge";

// ---------------------------------------------------------------------------
// Static chain / asset definitions - sourced from central config
// ---------------------------------------------------------------------------

export const SEPOLIA_CHAIN = BRIDGE_CHAINS.sepolia;
export const POLKADEX_CHAIN = BRIDGE_CHAINS.polkadex;
export const WETH_ASSET = BRIDGE_TOKENS.weth;

export type BridgeDirection = "evm-to-substrate" | "substrate-to-evm";

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

interface BridgeContextProps {
  direction: BridgeDirection;
  isEvmSource: boolean;
  transferAmount: number;
  setTransferAmount: (amount: number) => void;
  refetchSourceBalance: () => void;
  sourceChain: BridgeChainConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelectSourceChain: (chain: any) => void;
  destinationChain: BridgeChainConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelectDestinationChain: (chain: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sourceAccount: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSourceAccount: (account: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  destinationAccount: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setDestinationAccount: (account: any) => void;
  selectedAsset: BridgeTokenConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelectAsset: (asset: any) => void;
  transferConfigLoading: boolean;
  sourceBalancesLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transferConfig: any;
  selectedAssetBalance: number;
  supportedSourceChains: BridgeChainConfig[];
  supportedDestinationChains: BridgeChainConfig[];
  onSwitchChain: () => void;
  selectedAssetIdPolkadex: string;
  isDestinationPolkadex: boolean;
  destinationPDEXBalance: number;
  isDestinationPDEXBalanceLoading: boolean;
  supportedAssets: BridgeTokenConfig[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sourceBalances: any[];
  // ticker (uppercase) → on-chain assetId, discovered from chain metadata
  substrateAssetIds: Map<string, string>;
}

const BridgeContext = createContext<BridgeContextProps | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function BridgeProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] =
    useState<BridgeDirection>("evm-to-substrate");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evmAccount, setEvmAccount] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [substrateAccount, setSubstrateAccount] = useState<any>(null);
  const [transferAmount, setTransferAmount] = useState(0);
  const [selectedAsset, setSelectedAsset] =
    useState<BridgeTokenConfig>(WETH_ASSET);

  const isEvmSource = direction === "evm-to-substrate";

  const evmChain = BRIDGE_CHAINS.sepolia as EvmChainConfig;
  const substrateChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;

  // Derive source/destination from direction
  const sourceChain = isEvmSource ? SEPOLIA_CHAIN : POLKADEX_CHAIN;
  const destinationChain = isEvmSource ? POLKADEX_CHAIN : SEPOLIA_CHAIN;

  // Supported chains and assets come from config
  const allChains = Object.values(BRIDGE_CHAINS);
  const supportedAssets = useMemo(
    () => getRouteSupportedTokens(SEPOLIA_CHAIN.id, POLKADEX_CHAIN.id),
    []
  );

  // sourceAccount / destinationAccount are aliases based on direction
  const sourceAccount = isEvmSource ? evmAccount : substrateAccount;
  const destinationAccount = isEvmSource ? substrateAccount : evmAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setSourceAccount = (account: any) => {
    if (isEvmSource) setEvmAccount(account);
    else setSubstrateAccount(account);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setDestinationAccount = (account: any) => {
    if (isEvmSource) setSubstrateAccount(account);
    else setEvmAccount(account);
  };

  // Swap direction - accounts stay assigned to their wallet type
  const onSwitchChain = () => {
    setDirection((prev) =>
      prev === "evm-to-substrate" ? "substrate-to-evm" : "evm-to-substrate"
    );
  };

  // Sync wagmi connected EVM wallet → evmAccount
  const { address, isConnected, connector } = useAccount();
  useEffect(() => {
    if (isConnected && address) {
      setEvmAccount({ address, name: connector?.name ?? "Connected Wallet" });
    } else {
      setEvmAccount(null);
    }
  }, [isConnected, address, connector?.name]);

  // ── Balances (EVM side) ───────────────────────────────────────────────────
  const evmAddress = evmAccount?.address;

  const { data: ethBalanceData, refetch: refetchEthBalance } = useBalance({
    address: evmAddress as `0x${string}` | undefined,
    chainId: evmChain.chainId,
  });
  const ethBalance = ethBalanceData
    ? Number(ethBalanceData.value) / 10 ** ethBalanceData.decimals
    : 0;

  // ERC-20 specs for all non-WETH EVM tokens (WETH uses native ETH balance)
  const evmTokenSpecs = useMemo(
    () =>
      supportedAssets
        .filter((t) => t.ticker !== "WETH" && !!t.chains.sepolia?.address)
        .map((t) => ({
          ticker: t.ticker,
          tokenAddress: t.chains.sepolia!.address as `0x${string}`,
          decimals: t.decimals,
        })),
    [supportedAssets]
  );

  const {
    balances: evmAllTokenBalances,
    isLoading: evmAllTokensLoading,
    refetch: refetchEvmTokenBalance,
  } = useAllEvmTokenBalances(evmAddress, evmTokenSpecs, {
    rpcUrl: evmChain.rpcUrl,
  });

  // ── Balances (Substrate side) ─────────────────────────────────────────────
  const substrateAddress = substrateAccount?.address;

  const substrateTokenSpecs = useMemo(
    () =>
      supportedAssets.map((t) => ({ ticker: t.ticker, decimals: t.decimals })),
    [supportedAssets]
  );

  const {
    balances: substrateAllBalances,
    assetIds: substrateAssetIds,
    isLoading: substrateBalancesLoading,
    refetch: refetchSubstrateBalances,
  } = useAllSubstrateBalances(substrateAddress, substrateTokenSpecs, {
    wsUrl: substrateChain.wsUrl,
  });

  const { balance: pdexBalance, isLoading: pdexBalanceLoading } =
    useSubstrateNativeBalance(substrateAddress, {
      wsUrl: substrateChain.wsUrl,
      decimals: substrateChain.nativeCurrency.decimals,
    });

  const selectedAssetBalance = useMemo(() => {
    if (isEvmSource) {
      // WETH uses native ETH balance; all other tokens use ERC-20 balance
      return selectedAsset.ticker === "WETH"
        ? ethBalance
        : (evmAllTokenBalances.get(selectedAsset.ticker) ?? 0);
    }
    return substrateAllBalances.get(selectedAsset.ticker) ?? 0;
  }, [
    isEvmSource,
    selectedAsset.ticker,
    ethBalance,
    evmAllTokenBalances,
    substrateAllBalances,
  ]);

  const sourceBalancesLoading = useMemo(
    () => (isEvmSource ? evmAllTokensLoading : substrateBalancesLoading),
    [isEvmSource, evmAllTokensLoading, substrateBalancesLoading]
  );

  // All token balances for the token selector dropdown
  const sourceBalances = useMemo(
    () =>
      supportedAssets.map((t) => ({
        ticker: t.ticker,
        amount: isEvmSource
          ? t.ticker === "WETH"
            ? ethBalance
            : (evmAllTokenBalances.get(t.ticker) ?? 0)
          : (substrateAllBalances.get(t.ticker) ?? 0),
      })),
    [
      isEvmSource,
      supportedAssets,
      ethBalance,
      evmAllTokenBalances,
      substrateAllBalances,
    ]
  );

  // ── Fees ──────────────────────────────────────────────────────────────────
  const { fees, loading: feeLoading } = useHyperbridgeFees({
    amount: isEvmSource ? transferAmount : 0,
    recipientAddress: isEvmSource ? destinationAccount?.address : undefined,
    assetTicker: selectedAsset.ticker,
    hftAddress: selectedAsset.chains[evmChain.id]?.hftAddress,
    enabled: isEvmSource,
    sourceChainConfig: evmChain,
    destChainConfig: substrateChain,
  });

  const transferConfig = useMemo(
    () => ({
      destinationFee: {
        ticker: isEvmSource
          ? fees.ticker
          : substrateChain.nativeCurrency.symbol,
        amount: isEvmSource ? fees.destinationFee : 0,
      },
      sourceFee: {
        ticker: isEvmSource
          ? fees.ticker
          : substrateChain.nativeCurrency.symbol,
        amount: isEvmSource ? fees.sourceFee : 0,
      },
      sourceFeeBalance: isEvmSource
        ? { ticker: evmChain.nativeCurrency.symbol, amount: ethBalance }
        : { ticker: substrateChain.nativeCurrency.symbol, amount: pdexBalance },
      sourceFeeExistential: {
        ticker: isEvmSource
          ? evmChain.nativeCurrency.symbol
          : substrateChain.nativeCurrency.symbol,
        amount: 0,
      },
      max: { amount: selectedAssetBalance },
      min: { amount: 0.0001 },
    }),
    [
      fees,
      selectedAssetBalance,
      ethBalance,
      pdexBalance,
      isEvmSource,
      evmChain,
      substrateChain,
    ]
  );

  const onSelectSourceChain = () => {};
  const onSelectDestinationChain = () => {};
  const onSelectAsset = (asset: BridgeTokenConfig) => setSelectedAsset(asset);

  const refetchSourceBalance = useCallback(() => {
    refetchEthBalance();
    refetchEvmTokenBalance();
    refetchSubstrateBalances();
  }, [refetchEthBalance, refetchEvmTokenBalance, refetchSubstrateBalances]);

  return (
    <BridgeContext.Provider
      value={{
        direction,
        isEvmSource,
        sourceChain,
        onSelectSourceChain,
        destinationChain,
        onSelectDestinationChain,
        sourceAccount,
        setSourceAccount,
        destinationAccount,
        setDestinationAccount,
        selectedAsset,
        onSelectAsset,
        transferConfigLoading: feeLoading,
        sourceBalancesLoading,
        transferConfig,
        selectedAssetBalance,
        supportedSourceChains: allChains,
        supportedDestinationChains: allChains,
        onSwitchChain,
        // Empty string when the on-chain assetId isn't known (yet) - usePool
        // gates its quote query on `!!asset`, so this cleanly disables the
        // auto-swap quote instead of sending a fake id ("weth-id") that the
        // runtime rejects with: Could not parse 'AssetId'.
        selectedAssetIdPolkadex:
          selectedAsset.chains.polkadex?.assetId ??
          substrateAssetIds.get(selectedAsset.ticker.toUpperCase()) ??
          "",
        isDestinationPolkadex: isEvmSource,
        // substrateAccount is the destination account exactly when isEvmSource
        // (evm-to-substrate direction), which is the only direction this is used.
        destinationPDEXBalance: pdexBalance,
        isDestinationPDEXBalanceLoading: pdexBalanceLoading,
        supportedAssets,
        sourceBalances,
        substrateAssetIds,
        transferAmount,
        setTransferAmount,
        refetchSourceBalance,
      }}
    >
      {children}
    </BridgeContext.Provider>
  );
}

export function useBridgeProvider() {
  const context = useContext(BridgeContext);
  if (!context)
    throw new Error("useBridgeProvider must be used within BridgeProvider");
  return context;
}
