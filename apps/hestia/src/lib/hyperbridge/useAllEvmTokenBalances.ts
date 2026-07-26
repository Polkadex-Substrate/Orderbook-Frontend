import { useState, useCallback, useEffect, useMemo } from "react";
import { createPublicClient, http, formatUnits, isAddress } from "viem";
import { sepolia } from "viem/chains";

import { BRIDGE_CHAINS } from "@/config/bridge";
import type { EvmChainConfig } from "@/config/bridge";

const defaultEvmChain = BRIDGE_CHAINS.sepolia as EvmChainConfig;

const ERC20_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type EvmTokenSpec = {
  ticker: string;
  tokenAddress: `0x${string}`;
  decimals: number;
};

/**
 * Fetches ERC-20 balances for all given EVM tokens in parallel.
 * WETH (native ETH on bridge) is intentionally excluded - pass only ERC-20 tokens.
 */
export function useAllEvmTokenBalances(
  address?: string,
  tokens?: EvmTokenSpec[],
  options?: { rpcUrl?: string }
) {
  const rpcUrl = options?.rpcUrl ?? defaultEvmChain.rpcUrl;
  const tokensKey = tokens?.map((t) => t.ticker).join(",") ?? "";

  const publicClient = useMemo(
    () => createPublicClient({ chain: sepolia, transport: http(rpcUrl) }),
    [rpcUrl]
  );

  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    const evmAddr =
      address && isAddress(address) ? (address as `0x${string}`) : undefined;
    if (!evmAddr || !tokens?.length) {
      setBalances(new Map());
      return;
    }

    setIsLoading(true);
    const result = new Map<string, number>();
    try {
      await Promise.all(
        (tokens ?? []).map(async ({ ticker, tokenAddress, decimals }) => {
          try {
            const raw = await publicClient.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [evmAddr],
            });
            result.set(ticker, parseFloat(formatUnits(raw, decimals)));
          } catch {
            result.set(ticker, 0);
          }
        })
      );
    } finally {
      setBalances(result);
      setIsLoading(false);
    }
    // tokensKey is a stable string proxy for the tokens array - intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, publicClient, tokensKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { balances, isLoading, refetch: fetchAll };
}
