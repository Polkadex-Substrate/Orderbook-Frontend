"use client";

import { useState, useEffect } from "react";
import { Button, Checkbox, Modal, Separator, Typography } from "@mitrabook/ux";
import { RiFlaskLine } from "@remixicon/react";

import {
  IS_TESTNET,
  TESTNET_ACK_EVENT,
  TESTNET_ACK_KEY,
} from "@/config/network";

export const TestnetModal = () => {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (IS_TESTNET && !sessionStorage.getItem(TESTNET_ACK_KEY)) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem(TESTNET_ACK_KEY, "1");
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
          <Checkbox.Solid
            id="testnetAcknowledge"
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

          <Button.Solid
            size="md"
            className="w-full"
            disabled={!checked}
            onClick={handleClose}
          >
            Continue to Testnet
          </Button.Solid>
        </div>
      </Modal.Content>
    </Modal>
  );
};
