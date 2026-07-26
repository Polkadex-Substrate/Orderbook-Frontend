"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDeposit, useFunds } from "@orderbook/core/hooks";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";

type Phase = "idle" | "depositing" | "crediting";

/** How long to wait for the engine to credit a deposit before giving up.
 *  Deposits are on-chain extrinsics the engine ingests asynchronously, so
 *  the trading balance lags tx inclusion by a few blocks. */
const CREDIT_TIMEOUT_MS = 90_000;

/**
 * One-click "move & trade": when an order needs more than the trading
 * account's free balance but the funding account can cover the shortfall,
 * deposit exactly the shortfall and run the queued action (placing the
 * order) once the engine credits it.
 *
 * The wait is reactive, not polled: `available` comes from useFunds via the
 * balances websocket, so the effect below fires the queued action on the
 * exact render where the balance crosses the target.
 */
export function useMoveAndTrade({
  assetId,
  required,
  available,
}: {
  /** On-chain asset id ("PDEX" or the numeric id string). */
  assetId?: string;
  /** Human units the order needs in the trading account. */
  required: number;
  /** Human units currently free in the trading account. */
  available: number;
}) {
  const { balances } = useFunds();
  const { selectedWallet } = useConnectWalletProvider();
  const { onHandleInfo } = useSettingsProvider();
  const { mutateAsync: deposit } = useDeposit();
  const [phase, setPhase] = useState<Phase>("idle");
  const pending = useRef<{
    target: number;
    run: () => Promise<void>;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const fundingAvailable = useMemo(() => {
    const b = balances?.find((x) => x.asset?.id?.toString() === assetId);
    return Number(
      (b as unknown as { onChainBalance?: string })?.onChainBalance ?? 0
    );
  }, [balances, assetId]);

  const shortfall = Math.max(required - available, 0);
  // Quantise to 8dp. Two reasons, and the second one bites hard:
  //  1. it is the UI's display precision, so the number shown on the button
  //     is exactly the number deposited;
  //  2. the deposit path multiplies this by 10^12 to reach chain units. A raw
  //     float (0.1 + 0.2 -> 0.30000000000000004) leaves a fractional part
  //     there, and Compact<u128> rejects it outright. Number(toFixed(8))
  //     collapses the binary noise, because BigNumber reads a number's
  //     decimal string rather than its binary value.
  const q8 = (n: number) => Number(n.toFixed(8));
  const moveAmount = q8(
    Math.min(
      // +1e-8 covers a rounding remainder that would leave us a hair short.
      Math.ceil(shortfall * 1e8) / 1e8 + 1e-8,
      fundingAvailable
    )
  );

  const canMoveAndTrade =
    !!selectedWallet &&
    !!assetId &&
    required > 0 &&
    shortfall > 0 &&
    fundingAvailable >= shortfall;

  // Reactive wait: run the queued action when the credited balance arrives.
  useEffect(() => {
    if (phase !== "crediting" || !pending.current) return;
    if (available + 1e-9 >= pending.current.target) {
      const p = pending.current;
      pending.current = null;
      clearTimeout(p.timer);
      setPhase("idle");
      p.run().catch(() => {
        // order placement surfaces its own error toast
      });
    }
  }, [available, phase]);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current.timer);
    },
    []
  );

  const moveAndTrade = useCallback(
    async (run: () => Promise<void>) => {
      if (!selectedWallet || !assetId || phase !== "idle") return;
      setPhase("depositing");
      try {
        const asset: Record<string, string | null> =
          assetId === "PDEX" ? { polkadex: null } : { asset: assetId };
        await deposit({ asset, amount: moveAmount, account: selectedWallet });
        // useDeposit surfaces its own error toast and rethrows on failure,
        // so reaching here means the extrinsic was included.
        setPhase("crediting");
        pending.current = {
          target: required,
          run,
          timer: setTimeout(() => {
            pending.current = null;
            setPhase("idle");
            onHandleInfo?.(
              "Funds were deposited but the trading balance hasn't updated yet. " +
                "Place the order manually once it does."
            );
          }, CREDIT_TIMEOUT_MS),
        };
      } catch {
        // error toast already shown by useDeposit
        setPhase("idle");
      }
    },
    [
      selectedWallet,
      assetId,
      phase,
      deposit,
      moveAmount,
      required,
      onHandleInfo,
    ]
  );

  return { canMoveAndTrade, moveAmount, phase, moveAndTrade, fundingAvailable };
}
