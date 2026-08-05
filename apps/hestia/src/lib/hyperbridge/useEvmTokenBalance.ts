/**
 * useEvmTokenBalance
 *
 * Generic hook to fetch an ERC-20 token balance on any EVM chain.
 * Address resolution order:
 *  1. If `address` is a valid EVM address (0x + 40 hex chars), use it directly.
 *  2. Otherwise (e.g. a Substrate ss58 address), call `window.ethereum.eth_accounts`
 *     to discover the active EVM account - covers wallets like Enkrypt that expose
 *     both a Polkadot and an EVM account via different interfaces.
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { createPublicClient, http, formatUnits, isAddress } from "viem";
import { sepolia } from "viem/chains";

import { BRIDGE_CHAINS, BRIDGE_TOKENS } from "@/config/bridge";
import type { EvmChainConfig } from "@/config/bridge";

const ERC20_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const defaultEvmChain = BRIDGE_CHAINS.sepolia as EvmChainConfig;
const defaultToken = BRIDGE_TOKENS.weth;

interface UseEvmTokenBalanceOptions {
  tokenAddress?: `0x${string}`;
  rpcUrl?: string;
  decimals?: number;
}

interface UseEvmTokenBalanceResult {
  balance: number;
  isLoading: boolean;
  refetch: () => void;
}

export function useEvmTokenBalance(
  address?: string,
  options?: UseEvmTokenBalanceOptions
): UseEvmTokenBalanceResult {
  const tokenAddress =
    options?.tokenAddress ??
    (defaultToken.chains.sepolia?.address as `0x${string}`);
  const rpcUrl = options?.rpcUrl ?? defaultEvmChain.rpcUrl;
  const decimals = options?.decimals ?? defaultToken.decimals;

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl),
      }),
    [rpcUrl]
  );

  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (address === undefined) {
      setBalance(0);
      return;
    }

    setIsLoading(true);
    try {
      let evmAddress: `0x${string}` | undefined;

      if (isAddress(address)) {
        evmAddress = address as `0x${string}`;
      } else {
        // Substrate ss58 address - try window.ethereum (Enkrypt EVM account)
        if (typeof window !== "undefined") {
          const injected = (window as any).ethereum;
          if (injected) {
            try {
              const accounts: string[] = await injected.request({
                method: "eth_accounts",
              });
              const first = accounts?.[0];
              if (first && isAddress(first))
                evmAddress = first as `0x${string}`;
            } catch {
              // Extension present but not authorised - ignore
            }
          }
        }
      }

      if (!evmAddress) {
        setBalance(0);
        return;
      }

      const raw = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [evmAddress],
      });

      setBalance(parseFloat(formatUnits(raw, decimals)));
    } catch (err) {
      console.error("[useEvmTokenBalance] Failed to fetch balance:", err);
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, tokenAddress, decimals]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, isLoading, refetch: fetchBalance };
}

// The useWethBalance alias that used to live here is gone. It was kept for
// "existing imports", but there were none - it and the useWethBalance.ts
// re-export shim were both dead. Call useEvmTokenBalance directly; its Sepolia
// and WETH defaults come from config/bridge.ts.
