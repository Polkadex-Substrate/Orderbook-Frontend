import {
  RiArrowLeftRightLine,
  RiInformationLine,
  RiShutDownLine,
  RiSettings3Fill,
} from "@remixicon/react";
import { ExtensionAccount } from "@polkadex/react-providers";
import { Button, Typography, PopConfirm } from "@polkadex/ux";

import { AccountCard } from "../ReadyToUse";

export const Profile = ({
  tradingAccounts,
  onLogout,
  onActions,
  fundWalletPresent,
  fundWallet,
  onSwitch,
  onConnectWallet,
}: {
  tradingAccounts: string[];
  onLogout: () => void;
  onSwitch: () => void;
  onActions: () => void;
  fundWalletPresent?: boolean;
  fundWallet?: ExtensionAccount;
  onConnectWallet: () => void;
}) => {
  return (
    <div className="flex flex-col flex-1 md:w-[23rem] bg-backgroundBase rounded-sm max-sm:w-[90vw]">
      <div className="flex flex-col gap-6 p-4 bg-level-0">
        <div className="flex items-center justify-between">
          <Typography.Text appearance="secondary" size="sm">
            Funding account
          </Typography.Text>
          <PopConfirm>
            <PopConfirm.Trigger asChild>
              <Button.Icon size="sm" variant="light" appearance="danger">
                <RiShutDownLine className="w-full h-full" />
              </Button.Icon>
            </PopConfirm.Trigger>
            <PopConfirm.Content>
              <PopConfirm.Title>Logout</PopConfirm.Title>
              <PopConfirm.Description>
                Are you sure you want to disconnect your account?
              </PopConfirm.Description>
              <PopConfirm.Close>Cancel</PopConfirm.Close>
              <PopConfirm.Button onClick={onLogout}>Logout</PopConfirm.Button>
            </PopConfirm.Content>
          </PopConfirm>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <AccountCard
              name={fundWallet?.name ?? "Wallet not present"}
              address={fundWallet?.address ?? "0x0000000000000"}
              source={fundWallet?.source}
              hoverable={false}
              present={fundWalletPresent}
              addressLength={8}
              largeText
            >
              <Button.Solid
                appearance="secondary"
                size="sm"
                className="flex items-center gap-1"
                onClick={onSwitch}
              >
                <RiArrowLeftRightLine
                  name="Exchange"
                  className="w-3 h-3 text-primary"
                />
                Switch
              </Button.Solid>
            </AccountCard>
          </div>
          {!fundWalletPresent && (
            <div className="flex flex-col gap-2">
              <Button.Solid
                appearance="tertiary"
                className="bg-level-1"
                onClick={onConnectWallet}
              >
                Connect Wallet
              </Button.Solid>
              <div className="flex items-center gap-2">
                <RiInformationLine className="w-6 h-6 text-attention-base" />
                <Typography.Paragraph
                  appearance="primary"
                  className=" whitespace-normal"
                  size="xs"
                >
                  <span className="text-attention-base">(Optional)</span> Your
                  funding account is only required for signing transactions and
                  account management.
                </Typography.Paragraph>
              </div>
            </div>
          )}
        </div>
      </div>
      {tradingAccounts.length > 0 && (
        <div className="flex flex-col gap-6 p-4 bg-level-0">
          <Button.Solid
            size="md"
            appearance="secondary"
            className="flex gap-2 items-center bg-level-1 text-primary"
            onClick={onActions}
          >
            <RiSettings3Fill className="w-4 h-4" />
            Options
          </Button.Solid>
        </div>
      )}
    </div>
  );
};
