"use client";

/**
 * Consent-gated auto-move of trading funds before a bridge-out.
 *
 * THE PROBLEM
 * The bridge spends from the FUNDING account only, but users keep most balance
 * in the TRADING account. A bridge-out for more than the funding balance was a
 * dead end ("Insufficient balance") even when funding + trading easily covered
 * it - the user had to know to visit the Transfer page, withdraw, wait, come
 * back. This modal collapses that into one consented flow.
 *
 * WHY THIS IS A MODAL AND NOT AUTOMATIC
 * Moving funds out of the trading account is not free of consequences: those
 * funds stop backing open orders the moment the engine debits them. So nothing
 * moves until the user has seen, in one sentence, exactly how much will leave
 * trading - and the flow never moves MORE than the stated shortfall.
 *
 * WHY THERE IS A WAITING STEP
 * Trading-to-funding is not a synchronous transfer. It is an engine withdrawal:
 * a signed payload debits the trading balance, the engine batches it into a
 * snapshot, and the funds land in the funding account "in a few minutes"
 * (sometimes via an explicit on-chain claim - see the pending hint below). We
 * poll the funding balance and unblock the transfer when it arrives. The bridge
 * signature stays with the user: when funds land, the Transfer button becomes
 * active through the normal validation path - this flow never signs the bridge
 * transaction on the user's behalf.
 */

import { Button, Interaction, Loading, Modal, Typography } from "@mitrabook/ux";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWithdraw } from "@orderbook/core/hooks";
import { formatDisplay } from "@orderbook/format";

import { useBridgeProvider } from "./BridgeProvider";
// The decision logic lives in moveFromTrading.logic.ts, where it is unit
// tested. This file is deliberately only wiring and rendering.
import {
  MoveStep,
  canResetOnClose,
  hasFundingArrived,
  withdrawalAmount,
} from "./moveFromTrading.logic";

/** Poll the funding balance at the same cadence the engine credits at. */
const POLL_MS = 12_000;
/** After this long, keep polling but tell the user how to claim manually. */
const SLOW_HINT_MS = 3 * 60_000;

export const MoveFromTradingModal = ({
  open,
  onOpenChange,
  amountNeeded,
  ticker,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Total funding balance required for the bridge transfer. */
  amountNeeded: number;
  ticker: string;
}) => {
  const {
    selectedAssetBalance, // funding side, live - refetch updates it
    tradingFreeBalance,
    selectedAssetIdPolkadex,
    refetchSourceBalance,
  } = useBridgeProvider();
  const { mutateAsync: withdraw } = useWithdraw();

  const [step, setStep] = useState<MoveStep>("consent");
  const [error, setError] = useState("");
  const [slow, setSlow] = useState(false);

  // The shortfall is FROZEN at the moment of consent. Recomputing it live would
  // let the number the user agreed to drift between reading and signing.
  const [consentedAmount, setConsentedAmount] = useState(0);
  const startedAt = useRef(0);

  const shortfall = withdrawalAmount(
    Math.max(amountNeeded - selectedAssetBalance, 0)
  );

  const reset = useCallback(() => {
    setStep("consent");
    setError("");
    setSlow(false);
  }, []);

  const close = useCallback(
    (o: boolean) => {
      // While a withdrawal is settling, closing hides the modal but must not
      // reset it: the withdrawal exists whether or not the dialog is visible.
      if (!o && canResetOnClose(step)) reset();
      onOpenChange(o);
    },
    [step, reset, onOpenChange]
  );

  const onConsent = useCallback(async () => {
    setConsentedAmount(shortfall);
    setStep("withdrawing");
    try {
      await withdraw({ asset: selectedAssetIdPolkadex, amount: shortfall });
      startedAt.current = Date.now();
      setStep("waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdrawal failed");
      setStep("error");
    }
  }, [shortfall, withdraw, selectedAssetIdPolkadex]);

  // Poll while waiting; resolve when the funding balance covers the need.
  useEffect(() => {
    if (step !== "waiting") return;

    const id = setInterval(() => {
      refetchSourceBalance();
      if (Date.now() - startedAt.current > SLOW_HINT_MS) setSlow(true);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [step, refetchSourceBalance]);

  useEffect(() => {
    if (
      step === "waiting" &&
      hasFundingArrived(selectedAssetBalance, amountNeeded)
    ) {
      setStep("done");
    }
  }, [step, selectedAssetBalance, amountNeeded]);

  const fmt = (v: number) => formatDisplay(v, { thousandsSep: "," });

  return (
    <Modal
      open={open}
      onOpenChange={close}
      placement="center left"
      className="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
    >
      <Modal.Content>
        <Interaction className="w-full gap-3 md:min-w-[24rem] md:max-w-[24rem]">
          <Interaction.Title onClose={{ onClick: () => close(false) }}>
            Move funds from Trading Account
          </Interaction.Title>
          <Interaction.Content className="flex flex-col gap-4 p-4">
            {step === "consent" && (
              <>
                <Typography.Text>
                  Your Funding Account has {fmt(selectedAssetBalance)} {ticker},
                  but this transfer needs {fmt(amountNeeded)} {ticker}.
                </Typography.Text>
                <Typography.Text>
                  We can move{" "}
                  <span className="text-primary-base font-semibold">
                    {fmt(shortfall)} {ticker}
                  </span>{" "}
                  from your Trading Account (available:{" "}
                  {fmt(tradingFreeBalance)} {ticker}) to your Funding Account
                  first. Only this amount will be moved.
                </Typography.Text>
                <Typography.Text appearance="primary" size="sm">
                  This is a withdrawal through the orderbook engine: you will
                  sign it now, and the funds typically arrive in a few minutes.
                  Once moved, they no longer back any open orders. The bridge
                  transfer itself is a separate step you confirm afterwards.
                </Typography.Text>
              </>
            )}

            {step === "withdrawing" && (
              <Loading.Spinner active>
                <Typography.Text>
                  Waiting for your signature to withdraw {fmt(consentedAmount)}{" "}
                  {ticker} from the Trading Account...
                </Typography.Text>
              </Loading.Spinner>
            )}

            {step === "waiting" && (
              <Loading.Spinner active>
                <div className="flex flex-col gap-2">
                  <Typography.Text>
                    Withdrawal submitted. Waiting for {fmt(consentedAmount)}{" "}
                    {ticker} to arrive in your Funding Account - this usually
                    takes a few minutes. You can close this window; the transfer
                    button will unlock when the funds land.
                  </Typography.Text>
                  {slow && (
                    <Typography.Text appearance="primary" size="sm">
                      Taking longer than usual? Some withdrawals need a manual
                      claim: check{" "}
                      <Link
                        href={`/transfer/${ticker}`}
                        className="text-primary-base underline"
                        target="_blank"
                      >
                        Transfer &gt; Ready to Claim
                      </Link>
                      . This window will keep watching either way.
                    </Typography.Text>
                  )}
                </div>
              </Loading.Spinner>
            )}

            {step === "done" && (
              <Typography.Text>
                Funds moved. Your Funding Account now covers the transfer -
                review the amounts and press Transfer to continue. Nothing has
                been bridged yet.
              </Typography.Text>
            )}

            {step === "error" && (
              <>
                <Typography.Text className="text-danger-base">
                  {error}
                </Typography.Text>
                <Typography.Text appearance="primary" size="sm">
                  Nothing was moved. You can retry, or transfer a smaller amount
                  that fits your Funding Account balance.
                </Typography.Text>
              </>
            )}
          </Interaction.Content>
          <Interaction.Footer className="flex flex-col gap-2 p-4">
            {step === "consent" && (
              <>
                <Button.Solid onClick={onConsent}>
                  Move {fmt(shortfall)} {ticker} to Funding
                </Button.Solid>
                <Button.Solid
                  appearance="secondary"
                  onClick={() => close(false)}
                >
                  Cancel
                </Button.Solid>
              </>
            )}
            {(step === "waiting" || step === "withdrawing") && (
              <Button.Solid appearance="secondary" onClick={() => close(false)}>
                Hide window
              </Button.Solid>
            )}
            {step === "done" && (
              <Button.Solid onClick={() => close(false)}>
                Back to transfer
              </Button.Solid>
            )}
            {step === "error" && (
              <Button.Solid onClick={reset}>Try again</Button.Solid>
            )}
          </Interaction.Footer>
        </Interaction>
      </Modal.Content>
    </Modal>
  );
};
