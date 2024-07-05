import React, { Dispatch, SetStateAction } from "react";
import { Button, Modal, Typography } from "@polkadex/ux";
import { RiCloseLine } from "@remixicon/react";
import Link from "next/link";

import { FundHorizontalCard } from "../ReadyToUse/fundHorizontalCard";

export const FundWalletModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      placement="top right"
      closeOnClickOutside
      className="flex flex-col border-primary bg-level-0 border-x w-screen min-h-webKit md:max-w-md overflow-x-hidden overflow-y-auto"
    >
      <Modal.Title className="flex justify-between items-center py-4 pl-4">
        <Typography.Text size="lg" bold>
          Fund Account
        </Typography.Text>
        <Button.Icon
          variant="ghost"
          size="lg"
          appearance="secondary"
          rounded
          onClick={() => onOpenChange(false)}
        >
          <RiCloseLine className="h-full w-full" />
        </Button.Icon>
      </Modal.Title>
      <Modal.Content className="flex flex-col flex-1 gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-4">
            <Typography.Text appearance="secondary">
              I have crypto assets on another network
            </Typography.Text>
            <span className="bg-primary-base px-1 py-0.5 rounded-sm text-xs font-medium">
              Step 1
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <FundHorizontalCard
              icon="Bridge"
              title="Deposit to Orderbook"
              description="Deposit your crypto assets to Polkadex Orderbook and vice versa."
              href={"/send-and-receive"}
              onClick={() => onOpenChange(false)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-4">
            <Typography.Text appearance="secondary">
              I have crypto assets on Polkadex
            </Typography.Text>
          </div>
          <div className="flex flex-col gap-2">
            <FundHorizontalCard
              icon="TransferToTrading"
              title="Transfer to another Funding account"
              description="Move funds from your funding account to another funding account."
              href="/transfer/PDEX?type=transfer"
              onClick={() => onOpenChange(false)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-4">
            <Typography.Text appearance="secondary">
              I have crypto assets on CEXs
            </Typography.Text>
          </div>
          <div className="flex flex-col gap-2">
            <FundHorizontalCard
              icon="CexOnRamp"
              title="CEX On-Ramp"
              description="Transfer from Kucoin or Gate.io via cede.store"
              href="/cexOnRamp"
              target="_blank"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="px-4">
            <Typography.Text appearance="secondary">
              I don&apos;t have crypto assets yet
            </Typography.Text>
          </div>
          <div className="flex flex-col gap-2">
            <FundHorizontalCard
              disabled
              icon="FreeCoin"
              title="Get 1 PDEX for free"
              description="Complete some tasks and get 1 free PDEX"
              href="/"
            />
            <FundHorizontalCard
              icon="CreditCard"
              title="Credit card"
              description="Buy PDEX with our credit card partner Simplex"
              href="https://buy.simplex.com"
              target="_blank"
            />
            <FundHorizontalCard
              icon="CentralizedExchange"
              title="Centralized exchanges"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Button.Solid
                  appearance="secondary"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <Link
                    href="https://www.kucoin.com/trade/PDEX-USDT"
                    target="_blank"
                  >
                    Kucoin
                  </Link>
                </Button.Solid>
                <Button.Solid
                  appearance="secondary"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <Link
                    href="https://www.gate.io/trade/PDEX_USDT"
                    target="_blank"
                  >
                    Gate.io
                  </Link>
                </Button.Solid>
                <Button.Solid
                  appearance="secondary"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <Link
                    href="https://ascendex.com/en/cashtrade-spottrading/usdt/pdex"
                    target="_blank"
                  >
                    AscendEX
                  </Link>
                </Button.Solid>
                <Button.Solid
                  appearance="secondary"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <Link
                    href="https://coindcx.com/trade/PDEXINR"
                    target="_blank"
                  >
                    CoinDCX
                  </Link>
                </Button.Solid>
              </div>
            </FundHorizontalCard>
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
};
