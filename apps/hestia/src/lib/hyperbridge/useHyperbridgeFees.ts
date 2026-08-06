import { useEffect, useState, useRef } from "react";
import { createPublicClient, parseEther, formatEther, toHex } from "viem";
import { sepolia } from "viem/chains";

import { rpcTransport } from "./rpcTransport";

import { BRIDGE_CHAINS, BRIDGE_TOKENS } from "@/config/bridge";
import type { EvmChainConfig, SubstrateChainConfig } from "@/config/bridge";

export interface FeeEstimate {
  sourceFee: number;
  destinationFee: number;
  ticker: string;
}

const DEFAULT_FEES: FeeEstimate = {
  sourceFee: 0,
  destinationFee: 0,
  ticker: "ETH",
};

const defaultSourceChain = BRIDGE_CHAINS.sepolia as EvmChainConfig;
const defaultDestChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;
const _wethToken = BRIDGE_TOKENS.weth;

export function useHyperbridgeFees({
  amount,
  recipientAddress,
  assetTicker,
  hftAddress: externalHftAddress,
  enabled = true,
  sourceChainConfig,
  destChainConfig,
}: {
  amount: number;
  recipientAddress?: string;
  assetTicker: string;
  hftAddress?: string;
  enabled?: boolean;
  sourceChainConfig?: EvmChainConfig;
  destChainConfig?: SubstrateChainConfig;
}) {
  const srcChain = sourceChainConfig ?? defaultSourceChain;
  const dstChain = destChainConfig ?? defaultDestChain;

  const [fees, setFees] = useState<FeeEstimate>(DEFAULT_FEES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!enabled || !amount || amount <= 0 || !recipientAddress) {
      setFees(DEFAULT_FEES);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const hftAddress =
          externalHftAddress ?? _wethToken.chains[srcChain.id]?.hftAddress;
        if (!hftAddress) {
          throw new Error(
            `No HFT address configured for ${assetTicker}. ` +
              "Obtain the WrappedHFT contract address from the Hyperbridge team."
          );
        }

        const publicClient = createPublicClient({
          chain: sepolia,
          transport: rpcTransport(srcChain.rpcUrl),
        });

        const amountWei = parseEther(amount.toString());
        const destBytes = toHex(dstChain.stateMachineId);

        const sendParams = {
          dest: destBytes,
          to: recipientAddress as `0x${string}`,
          amount: amountWei,
          timeout: BigInt(3600),
          relayerFee: 0n,
          data: "0x" as `0x${string}`,
        } as const;

        // quote() may revert if the destination chain isn't configured yet.
        // Treat that as 0 native fee (same behaviour as the SDK).
        // The SDK ABI marks quote() nonpayable; use an inline view ABI so
        // viem's readContract accepts it.
        const QUOTE_ABI = [
          {
            type: "function",
            name: "quote",
            stateMutability: "view",
            inputs: [
              {
                name: "params",
                type: "tuple",
                components: [
                  { name: "dest", type: "bytes" },
                  { name: "to", type: "bytes" },
                  { name: "amount", type: "uint256" },
                  { name: "timeout", type: "uint64" },
                  { name: "relayerFee", type: "uint256" },
                  { name: "data", type: "bytes" },
                ],
              },
            ],
            outputs: [{ name: "", type: "uint256" }],
          },
        ] as const;

        let nativeValue = 0n;
        try {
          nativeValue = (await publicClient.readContract({
            address: hftAddress as `0x${string}`,
            abi: QUOTE_ABI,
            functionName: "quote",
            args: [sendParams],
          })) as bigint;
        } catch {
          console.warn(
            "quote() reverted - destination may not be configured yet in HFT contract."
          );
        }

        setFees({
          sourceFee: parseFloat(formatEther(nativeValue)),
          destinationFee: 0,
          ticker: srcChain.nativeCurrency.symbol,
        });
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Fee estimation failed";
        console.error("Fee estimation failed:", e);
        setError(message);
        setFees(DEFAULT_FEES);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [amount, recipientAddress, assetTicker, srcChain, dstChain, enabled]);

  return { fees, loading, error };
}
