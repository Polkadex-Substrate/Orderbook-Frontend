import { RiArrowDownSLine } from "@remixicon/react";
import {
  Button,
  Dropdown,
  Typography,
  Illustrations,
  Interaction,
} from "@polkadex/ux";
import { TradeAccount } from "@orderbook/core/providers/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";

import { TradingAccountCard, GenericHorizontalCard } from "../ReadyToUse";

export const TradingAccountSuccessfull = ({
  tradingAccount,
  onClose,
  onTempBrowserAccount,
  onOpenMnemonic,
  onDownloadJson,
  onDownloadPdf,
  onDownloadJsonCallback,
}: {
  tradingAccount?: TradeAccount;
  onClose: () => void;
  onTempBrowserAccount: (e: TradeAccount) => void;
  onOpenMnemonic: () => void;
  onDownloadJson: (e: TradeAccount) => void;
  onDownloadPdf: () => void;
  onDownloadJsonCallback: () => void;
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { isStoreInGoogleDrive } = useConnectWalletProvider();
  const externalStored = isStoreInGoogleDrive(tradingAccount?.address ?? "");

  return (
    <Interaction className="w-full md:min-w-[24rem] md:max-w-[24rem]">
      <Interaction.Content className="flex flex-col gap-6 flex-1 mb-4">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="max-w-[8rem]">
            <Illustrations.Successfull className="max-w-[6rem] w-full " />
          </div>
          <div className="flex flex-col gap-2">
            <Typography.Text bold size="xl">
              New Trading account created!
            </Typography.Text>
            <Typography.Text appearance="primary">
              You’re set to trade on Orderbook! Transfer funds to your trading
              account to start trading.
            </Typography.Text>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Typography.Text appearance="secondary" size="xs">
            Trading account details
          </Typography.Text>
          <div className="flex flex-col gap-2">
            {tradingAccount && (
              <TradingAccountCard
                account={tradingAccount}
                external={externalStored}
              />
            )}
            <GenericHorizontalCard title="Download file" icon="Download">
              <Dropdown open={open} onOpenChange={setOpen}>
                <Dropdown.Trigger
                  asChild
                  className="[&[data-state=open]>button>svg]:rotate-180"
                >
                  <Button.Solid appearance="secondary" size="sm">
                    Download as
                    <RiArrowDownSLine className="h-3 w-3 ml-1 transition-transform duration-300 text-primary" />
                  </Button.Solid>
                </Dropdown.Trigger>
                <Dropdown.Content>
                  <Dropdown.Item
                    onClick={() => onDownloadPdf?.()}
                    // TODO: Remove these once we enabled functionality to download PDF
                    className="pointer-events-none"
                    disabled
                  >
                    PDF
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={(e) => {
                      setOpen(false);
                      if (!tradingAccount) return;
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        if (tradingAccount.isLocked) tradingAccount.unlock("");
                        onDownloadJson(tradingAccount);
                      } catch (error) {
                        onTempBrowserAccount(tradingAccount);
                        onDownloadJsonCallback();
                      }
                    }}
                  >
                    JSON
                  </Dropdown.Item>
                </Dropdown.Content>
              </Dropdown>
            </GenericHorizontalCard>
            <GenericHorizontalCard title="Mnemonic seed" icon="Mnemonic">
              <Button.Solid
                appearance="secondary"
                size="sm"
                onClick={onOpenMnemonic}
              >
                Show
              </Button.Solid>
            </GenericHorizontalCard>
          </div>
        </div>
      </Interaction.Content>
      <Interaction.Footer>
        <Interaction.Action
          onClick={() => {
            onClose();
            router.push("/send-and-receive");
          }}
        >
          Transfer funds
        </Interaction.Action>
        <Interaction.Close onClick={onClose}>Close</Interaction.Close>
      </Interaction.Footer>
    </Interaction>
  );
};
