"use client";

import { Interactable, useInteractableProvider } from "@polkadex/ux";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { Fragment, useCallback } from "react";

import { TradingAccountSuccessfull } from "../ConnectWallet/tradingAccountSuccessfull";
import { TradingAccountMnemonic } from "../ConnectWallet/tradingAccountMnemonic";
import { UnlockAccount } from "../ReadyToUse/unlockAccount";

export const CreatedAccountSuccess = ({ onClose }: { onClose: () => void }) => {
  return (
    <Interactable>
      <Interactable.Trigger>
        <TriggerComponent onClose={onClose} />
      </Interactable.Trigger>
      <Interactable.Content>
        <CardsComponent />
      </Interactable.Content>
    </Interactable>
  );
};

const TriggerComponent = ({ onClose }: { onClose: () => void }) => {
  const {
    onResetTempMnemonic,
    onExportTradeAccount,
    selectedTradingAccount,
    onSetTempTrading,
  } = useConnectWalletProvider();

  const handleClose = useCallback(() => {
    onResetTempMnemonic?.();
    onClose();
  }, [onResetTempMnemonic, onClose]);

  const { setPage } = useInteractableProvider();
  return (
    <TradingAccountSuccessfull
      tradingAccount={selectedTradingAccount?.account}
      onClose={handleClose}
      onTempBrowserAccount={(e) => onSetTempTrading?.(e)}
      onOpenMnemonic={() => setPage("TradingAccountMnemonic")}
      onDownloadPdf={() => {}}
      onDownloadJson={(e) => onExportTradeAccount?.({ account: e })}
      onDownloadJsonCallback={() => setPage("UnlockBrowserAccount")}
    />
  );
};

const CardsComponent = () => {
  const {
    tempMnemonic,
    onExportTradeAccount,
    tempTrading,
    onResetTempTrading,
  } = useConnectWalletProvider();

  const { onReset } = useInteractableProvider();
  return (
    <Fragment>
      <Interactable.Card pageName="TradingAccountMnemonic">
        <TradingAccountMnemonic
          onClose={onReset}
          mnemonic={tempMnemonic?.split(" ") ?? []}
        />
      </Interactable.Card>
      <Interactable.Card pageName="UnlockBrowserAccount">
        <UnlockAccount
          tempBrowserAccount={tempTrading}
          onClose={onReset}
          onAction={(account, password) =>
            onExportTradeAccount({ account, password })
          }
          onResetTempBrowserAccount={onResetTempTrading}
        />
      </Interactable.Card>
    </Fragment>
  );
};
