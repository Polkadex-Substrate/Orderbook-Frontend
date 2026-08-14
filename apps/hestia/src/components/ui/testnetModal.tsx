"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Checkbox, Modal, Separator, Typography } from "@mitrabook/ux";
import { RiFlaskLine, RiRefreshLine } from "@remixicon/react";
import * as Sentry from "@sentry/nextjs";

import {
  IS_TESTNET,
  TESTNET_ACK_EVENT,
  TESTNET_ACK_KEY,
} from "@/config/network";
import {
  blockedMessage,
  canProceed,
  shouldShowTestnetNotice,
  showEscapeHatch,
  stallReport,
} from "@/components/ui/testnetGate";

/*
 * A reviewer reported this notice sometimes "gets stuck loading in the
 * background with a spinner", and that when it does the checkbox cannot be
 * ticked, leaving no way to continue.
 *
 * The trigger is still being investigated. What is fixed here is the reason a
 * transient hiccup became a DEAD END: the only route forward was a button
 * disabled on a checkbox, so a click that failed to register produced a greyed
 * out button, no feedback, and no exit. See testnetGate.ts for the rules and the
 * reasoning; this component only renders them.
 *
 * Consent is unchanged. The tick is still required.
 */
export const TestnetModal = () => {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [openedForMs, setOpenedForMs] = useState(0);
  const stallReported = useRef(false);

  useEffect(() => {
    let acked = false;
    try {
      acked = !!sessionStorage.getItem(TESTNET_ACK_KEY);
    } catch {
      // Private-mode Safari can throw here. Treat it as not acknowledged: the
      // notice showing twice is harmless, a consent gate crashing the page it
      // gates is not.
    }
    if (shouldShowTestnetNotice(IS_TESTNET, acked)) setOpen(true);
  }, []);

  // Tick while the notice is open, so the escape hatch can appear without
  // needing the user to successfully interact with anything first.
  useEffect(() => {
    if (!open) return;
    const startedAt = Date.now();
    const id = setInterval(() => setOpenedForMs(Date.now() - startedAt), 1_000);
    return () => clearInterval(id);
  }, [open]);

  const state = { checked, openedForMs, attempted };

  // Make an unclickable checkbox visible in Sentry. Being unable to click is not
  // an exception, so nothing here would ever have been reported otherwise.
  useEffect(() => {
    if (!open) return;
    const report = stallReport(
      state,
      typeof document === "undefined" ? "unknown" : document.readyState,
      stallReported.current
    );
    if (!report) return;
    stallReported.current = true;
    Sentry.captureMessage(report.message, {
      level: "warning",
      extra: {
        documentReadyState: report.documentReadyState,
        openedForMs: report.openedForMs,
      },
    });
  }, [open, checked, openedForMs, attempted]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (!canProceed(state)) {
      setAttempted(true);
      return;
    }
    try {
      sessionStorage.setItem(TESTNET_ACK_KEY, "1");
    } catch {
      // See above. Failing to persist means the notice reappears next load,
      // which is preferable to trapping the user here.
    }
    setOpen(false);
    // Let the product tour know the viewport is clear. Without this it would
    // run behind the backdrop and highlight nothing visible.
    window.dispatchEvent(new Event(TESTNET_ACK_EVENT));
  };

  return (
    <Modal
      open={open}
      onOpenChange={() => {}}
      placement="center"
      className="flex flex-col border-primary bg-level-0 border w-full max-w-[480px]"
    >
      <Modal.Content className="flex flex-col gap-5 p-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-level-1 border border-primary">
            <RiFlaskLine className="w-7 h-7 text-primary-hover" />
          </div>
          <div className="flex flex-col gap-1">
            <Typography.Heading size="xl">
              Testnet Environment
            </Typography.Heading>
            <Typography.Text appearance="primary" size="sm">
              You are using a testnet version of Polkadex Orderbook
            </Typography.Text>
          </div>
        </div>

        <Separator.Horizontal />

        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            <li className="flex gap-2">
              <Typography.Text size="sm" className="shrink-0">
                ⚠️
              </Typography.Text>
              <Typography.Text size="sm" appearance="primary">
                All assets and transactions on this network are{" "}
                <Typography.Text size="sm" appearance="base" bold>
                  for testing purposes only
                </Typography.Text>{" "}
                and have no real monetary value.
              </Typography.Text>
            </li>
            <li className="flex gap-2">
              <Typography.Text size="sm" className="shrink-0">
                🚫
              </Typography.Text>
              <Typography.Text size="sm" appearance="primary">
                Do not send real funds to any testnet address.
              </Typography.Text>
            </li>
            <li className="flex gap-2">
              <Typography.Text size="sm" className="shrink-0">
                👛
              </Typography.Text>
              <Typography.Text size="sm" appearance="primary">
                Create a{" "}
                <Typography.Text size="sm" appearance="base" bold>
                  new wallet
                </Typography.Text>{" "}
                dedicated to this testnet and use the{" "}
                <Typography.Text size="sm" appearance="base" bold>
                  Faucet
                </Typography.Text>{" "}
                to receive test funds.
              </Typography.Text>
            </li>
            <li className="flex gap-2">
              <Typography.Text size="sm" className="shrink-0">
                🔬
              </Typography.Text>
              <Typography.Text size="sm" appearance="primary">
                Testnet data may be reset at any time without prior notice.
              </Typography.Text>
            </li>
          </ul>
        </div>

        <Separator.Horizontal />

        <div className="flex flex-col gap-4">
          {/* autoFocus is the pointer-independent escape route. If something is
              intercepting POINTER events - the most likely cause of the reported
              stall - the keyboard still reaches this control, so Space then
              Enter gets the user through. */}
          <Checkbox.Solid
            id="testnetAcknowledge"
            autoFocus
            checked={checked}
            onCheckedChange={() => setChecked((v) => !v)}
            className="shrink-0"
          >
            <Checkbox.Label
              size="xs"
              appearance="primary"
              htmlFor="testnetAcknowledge"
            >
              I understand that this is a testnet environment and all activity
              here has no real-world value.
            </Checkbox.Label>
          </Checkbox.Solid>

          {/* NOT `disabled={!checked}`. That was the dead end: a click that
              failed to register left a greyed-out button and no explanation.
              The button is always live and refuses with a reason instead. */}
          <Button.Solid size="md" className="w-full" onClick={handleClose}>
            Continue to Testnet
          </Button.Solid>

          {blockedMessage(state) && (
            <Typography.Text
              size="xs"
              appearance="primary"
              role="alert"
              className="text-center text-danger-base"
            >
              {blockedMessage(state)}
            </Typography.Text>
          )}

          {/* Last resort, and shown without requiring a successful interaction,
              because the reported failure is that interactions do not land. */}
          {showEscapeHatch(state) && (
            <div className="flex flex-col gap-2 items-center">
              <Typography.Text size="xs" appearance="primary">
                Not responding? The page may not have finished loading.
              </Typography.Text>
              <Button.Outline
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RiRefreshLine className="w-3 h-3 mr-1 inline-block" />
                Reload page
              </Button.Outline>
            </div>
          )}
        </div>
      </Modal.Content>
    </Modal>
  );
};
