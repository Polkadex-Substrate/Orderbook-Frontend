"use client";

import { Interactable, useInteractableProvider } from "@polkadex/ux";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { MINIMUM_PDEX_REQUIRED } from "@orderbook/core/constants";
import { Fragment, useCallback } from "react";

import { NewUser } from "../ConnectWallet/newUser";
import { NewTradingAccount } from "../ConnectWallet/newTradingAccount";
import { InsufficientBalance } from "../ConnectWallet/insufficientBalance";

import { InteractableProps } from ".";

export const ConnectNewUser = ({ onClose, onNext }: InteractableProps) => {
  return (
    <Interactable>
      <Interactable.Trigger>
        <TriggerComponent onClose={onClose} onNext={onNext} />
      </Interactable.Trigger>
      <Interactable.Content>
        <CardsComponent />
      </Interactable.Content>
    </Interactable>
  );
};

const TriggerComponent = ({ onClose, onNext }: InteractableProps) => {
  const { setPage } = useInteractableProvider();
  const { walletBalance } = useConnectWalletProvider();
  const { onResetExtension, onResetWallet } = useConnectWalletProvider();

  const onBack = useCallback(() => {
    onResetWallet?.();
    onResetExtension?.();
    onNext("Connect");
  }, [onResetWallet, onResetExtension, onNext]);

  return (
    <NewUser
      onContinue={() =>
        setPage(
          (walletBalance ?? 0) >= MINIMUM_PDEX_REQUIRED
            ? "NewTradingAccount"
            : "InsufficientBalance"
        )
      }
      walletBalance={walletBalance || 0}
      onReadMore={() =>
        window.open(
          "https://docs.polkadex.trade/orderbookPolkadexFAQHowToTradeStep3",
          "_blank",
          "noopener, noreferrer"
        )
      }
      onBack={onBack}
      onClose={onClose}
    />
  );
};

const CardsComponent = () => {
  const { setPage, onReset } = useInteractableProvider();
  const {
    selectedWallet,
    onRegisterTradeAccount,
    registerStatus,
    registerError,
    selectedExtension,
    walletBalance,
    onConnectGoogleDrive,
    connectGoogleDriveLoading,
    gDriveReady,
  } = useConnectWalletProvider();

  return (
    <Fragment>
      <Interactable.Card pageName="NewTradingAccount">
        <NewTradingAccount
          onCreateAccount={onRegisterTradeAccount}
          loading={registerStatus === "loading"}
          fundWalletPresent={!!Object.keys(selectedWallet ?? {})?.length}
          errorTitle="Error"
          errorMessage={(registerError as Error)?.message ?? registerError}
          selectedExtension={selectedExtension}
          onCreateCallback={() => setPage("TradingAccountSuccessfull")}
          onClose={onReset}
          onConnectGDrive={onConnectGoogleDrive}
          connectGDriveLoading={connectGoogleDriveLoading}
          gDriveReady={gDriveReady}
        />
      </Interactable.Card>
      <Interactable.Card pageName="InsufficientBalance">
        <InsufficientBalance balance={walletBalance} onClose={onReset} />
      </Interactable.Card>
    </Fragment>
  );
};
