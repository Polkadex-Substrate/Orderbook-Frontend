"use client";

import { Interactable, Modal, useInteractableProvider } from "@mitrabook/ux";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { Dispatch, Fragment, SetStateAction } from "react";

import { Connect } from "./connect";
import { ConnectNewUser } from "./connectNewUser";
import { ConnectExistingUser } from "./connectExistingUser";
import { CreatedAccountSuccess } from "./createdAccountSuccess";

export type InteractableProps = {
  onClose: () => void;
  onNext: Dispatch<SetStateAction<string>>;
};

export const ConnectWalletInteraction = () => {
  const { connectExtension, onToogleConnectExtension } = useSettingsProvider();
  const onClose = () => onToogleConnectExtension(false);

  return (
    <Modal
      open={!!connectExtension}
      onOpenChange={onToogleConnectExtension}
      closeOnClickOutside
      placement="center left"
      className="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
    >
      <Modal.Content>
        <Interactable defaultPage="Connect">
          <Interactable.Content>
            <ContentCompontent onClose={onClose} />
          </Interactable.Content>
        </Interactable>
      </Modal.Content>
    </Modal>
  );
};

const ContentCompontent = ({ onClose }: { onClose: () => void }) => {
  const { setPage } = useInteractableProvider();
  return (
    <Fragment>
      <Interactable.Card pageName="Connect">
        <Connect onClose={onClose} onNext={setPage} />
      </Interactable.Card>
      <Interactable.Card pageName="NewUser">
        <ConnectNewUser onClose={onClose} onNext={setPage} />
      </Interactable.Card>
      <Interactable.Card pageName="TradingAccountSuccessfull">
        <CreatedAccountSuccess onClose={onClose} />
      </Interactable.Card>
      <Interactable.Card pageName="ExistingUser">
        <ConnectExistingUser onClose={onClose} onNext={setPage} />
      </Interactable.Card>
    </Fragment>
  );
};
