// TODO: Refactor unlock - Remove unnecesary states
import { MarketBase } from "@orderbook/core/utils/orderbookService";
import { Dropdown, Modal, PopConfirm, Typography } from "@mitrabook/ux";
import React, { Fragment, useEffect, useMemo, useState } from "react";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";

import { UnlockAccount } from "./unlockAccount";

export const CancelAllOrdersAction = ({
  onCancel,
  markets,
}: {
  onCancel: (id: string) => Promise<void>;
  markets: MarketBase[];
}) => {
  const orders = useMemo(() => {
    const uniqueMarkets = new Set(
      markets.map((market) => JSON.stringify(market))
    );
    return Array.from(
      uniqueMarkets,
      (market) => JSON.parse(market) as MarketBase
    );
  }, [markets]);

  const [state, setState] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [orderPayload, setOrderPayload] = useState<string>("");
  const { selectedTradingAccount } = useConnectWalletProvider();
  const { onHandleInfo } = useSettingsProvider();

  /*
   * Same two defects as the single-order cancel, worse here: the confirm sits
   * inside a PopConfirm inside a Dropdown, so accepting it tears down TWO Radix
   * layers in the gesture that used to open the unlock modal. When the modal
   * lost that race, Cancel All silently did nothing (Bug 10). Toast first, so
   * the locked state is announced even if the modal loses; defer the open one
   * macrotask so the teardown finishes first. See OpenOrders/index.tsx.
   */
  const onCancelAllOrders = async (payload: string) => {
    if (selectedTradingAccount?.account?.isLocked) {
      onHandleInfo?.(
        "Your trading account is locked",
        "Enter your password to cancel these orders."
      );
      setOrderPayload(payload);
      setTimeout(() => setShowPassword(true), 0);
    } else {
      await onCancel(payload);
    }
  };

  useEffect(() => {
    return () => setOrderPayload("");
  }, []);

  return (
    <Fragment>
      <Modal open={showPassword} onOpenChange={setShowPassword}>
        <Modal.Content>
          <UnlockAccount
            onClose={() => setShowPassword(false)}
            onAction={async () => await onCancel(orderPayload)}
            tempBrowserAccount={selectedTradingAccount?.account}
          />
        </Modal.Content>
      </Modal>
      <Dropdown open={state} onOpenChange={setState}>
        <Dropdown.Trigger className="whitespace-nowrap gap-1">
          <Typography.Text appearance="danger" size="xs">
            Cancel All
          </Typography.Text>
          <Dropdown.Icon className="text-danger-base w-3 h-3" />
        </Dropdown.Trigger>
        <Dropdown.Content>
          {orders?.map((e) => {
            const ordersLen = markets.filter((val) => val.id === e.id).length;
            return (
              <Dropdown.Item asChild key={e.id}>
                <PopConfirm>
                  <PopConfirm.Trigger className="p-2 duration-200 transition-colors hover:bg-level-2 w-full">
                    {e.name}
                  </PopConfirm.Trigger>
                  <PopConfirm.Content className="max-w-[350px]">
                    <PopConfirm.Title>Cancel all orders</PopConfirm.Title>
                    <PopConfirm.Description>
                      <Typography.Paragraph size="sm" appearance="primary">
                        Are you sure you want to cancel all orders
                        <Typography.Text> ({ordersLen}) </Typography.Text> in
                        the
                        <Typography.Text> {e.name} </Typography.Text>market?
                      </Typography.Paragraph>
                    </PopConfirm.Description>
                    <PopConfirm.Close>No</PopConfirm.Close>
                    <PopConfirm.Button
                      appearance="danger"
                      onClick={async () => {
                        await onCancelAllOrders(e.id);
                        setState(false);
                      }}
                    >
                      Yes cancel
                    </PopConfirm.Button>
                  </PopConfirm.Content>
                </PopConfirm>
              </Dropdown.Item>
            );
          })}
        </Dropdown.Content>
      </Dropdown>
    </Fragment>
  );
};
