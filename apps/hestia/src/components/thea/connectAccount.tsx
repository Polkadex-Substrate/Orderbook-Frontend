"use client";

import {
  Interactable,
  Modal,
  useInteractableProvider,
  ConnectWallet,
  ExtensionAccounts,
} from "@polkadex/ux";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import {
  ExtensionAccount,
  useExtensionAccounts,
  useExtensions,
} from "@polkadex/react-providers";
import { ExtensionsArray } from "@polkadot-cloud/assets/extensions";

type Extension = (typeof ExtensionsArray)[0] | null;

export const ConnectAccount = ({
  open,
  onOpenChange,
  setAccount,
  evm = false,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  setAccount?: (e: ExtensionAccount) => void;
  evm?: boolean;
}) => {
  const [extension, setExtension] = useState<Extension>(null);

  const handleClose = () => onOpenChange(false);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      closeOnClickOutside
      placement="center left"
      className="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
    >
      <Modal.Content>
        <Interactable>
          <TriggerCompontent
            onClose={handleClose}
            setExtension={setExtension}
            evm={evm}
          />
          <ContentCompontent
            extension={extension}
            setAccount={setAccount}
            setExtension={setExtension}
            onClose={handleClose}
            evm={evm}
          />
        </Interactable>
      </Modal.Content>
    </Modal>
  );
};

const TriggerCompontent = ({
  evm,
  onClose,
  setExtension,
}: {
  evm: boolean;
  onClose: () => void;
  setExtension: Dispatch<SetStateAction<Extension>>;
}) => {
  const { setPage } = useInteractableProvider();
  const { extensionsStatus } = useExtensions();

  return (
    <Interactable.Trigger>
      <ConnectWallet
        installedExtensions={extensionsStatus}
        onBack={onClose}
        onConnectProvider={(e) => setExtension(e)}
        onConnectCallback={() => setPage("accounts")}
        showChains={false}
        showTerms={false}
        showFooterClose
        showEvmExtensions={evm}
      />
    </Interactable.Trigger>
  );
};

const ContentCompontent = ({
  onClose,
  setExtension,
  setAccount,
  extension,
  evm,
}: {
  evm: boolean;
  onClose: () => void;
  setExtension: Dispatch<SetStateAction<Extension>>;
  extension: Extension;
  setAccount?: (e: ExtensionAccount) => void;
}) => {
  const { onReset } = useInteractableProvider();
  const { connectExtensionAccounts, extensionAccounts } =
    useExtensionAccounts();

  const sourceId = useMemo(() => extension?.id, [extension?.id]);

  const walletsFiltered = useMemo(
    () =>
      !!extensionAccounts && !!sourceId
        ? extensionAccounts.filter(
            (e) =>
              e.source === sourceId &&
              (evm ? e.type === "ethereum" : e.type === "sr25519")
          )
        : [],
    [extensionAccounts, sourceId, evm]
  );
  return (
    <Interactable.Content className="[&>div>div]:h-full">
      <Interactable.Card pageName="accounts">
        <ExtensionAccounts
          key="ConnectFundingWallets"
          extensionAccounts={walletsFiltered}
          onSelectExtensionAccount={(e) => {
            setAccount?.(e);
            onClose();
          }}
          onClose={() => {
            setExtension(null);
            onReset();
          }}
          onPermission={async () =>
            await connectExtensionAccounts(sourceId as string)
          }
          extensionName={extension?.title}
          extensionIcon={extension?.id}
        />
      </Interactable.Card>
    </Interactable.Content>
  );
};
