import { useEffect, useState, useRef } from "react";
import { TokenGateway, EvmChain, SubstrateChain } from "@hyperbridge/sdk";
import { keccak256, toHex, pad, parseEther, formatEther } from "viem";
import { BRIDGE_CHAINS } from "@/config/bridge";
import type { EvmChainConfig, SubstrateChainConfig } from "@/config/bridge";

export interface FeeEstimate {
  sourceFee: number;
  destinationFee: number;
  ticker: string;
}

const DEFAULT_FEES: FeeEstimate = { sourceFee: 0, destinationFee: 0, ticker: "ETH" };

const defaultSourceChain = BRIDGE_CHAINS.sepolia as EvmChainConfig;
const defaultDestChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;

export function useHyperbridgeFees({
  amount,
  recipientAddress,
  assetTicker,
  enabled = true,
  sourceChainConfig,
  destChainConfig,
}: {
  amount: number;
  recipientAddress?: string;
  assetTicker: string;
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore — SDK constructors are typed as private but are public at runtime
        const sourceChain = new EvmChain({
          chainId: srcChain.chainId,
          rpcUrl: srcChain.rpcUrl,
          host: srcChain.ismpHost,
          consensusStateId: srcChain.consensusStateId,
        });

        // @ts-ignore
        const destChain = new SubstrateChain({
          stateMachineId: dstChain.stateMachineId,
          wsUrl: dstChain.wsUrl,
          hasher: dstChain.hasher,
          consensusStateId: dstChain.consensusStateId,
        });

        const tokenGateway = new TokenGateway({
          source: sourceChain,
          dest: destChain,
        });

        const assetId = keccak256(toHex(assetTicker));
        const recipientPadded = pad(recipientAddress as `0x${string}`, { size: 32 });

        const { totalNativeCost } = await tokenGateway.quoteNative({
          amount: parseEther(amount.toString()),
          assetId,
          redeem: true,
          to: recipientPadded,
          dest: dstChain.stateMachineId,
          timeout: BigInt(3600),
          data: "0x",
        });

        setFees({
          sourceFee: parseFloat(formatEther(totalNativeCost)),
          destinationFee: 0,
          ticker: srcChain.nativeCurrency.symbol,
        });
      } catch (e: any) {
        console.error("Fee estimation failed:", e);
        setError(e?.message ?? "Fee estimation failed");
        setFees(DEFAULT_FEES);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [amount, recipientAddress, assetTicker, srcChain, dstChain]);

  return { fees, loading, error };
}
