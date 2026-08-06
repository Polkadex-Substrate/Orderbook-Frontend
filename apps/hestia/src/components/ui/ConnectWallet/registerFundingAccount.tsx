import { useMemo, useState } from "react";
import { ExtensionAccount } from "@polkadex/react-providers";
import {
  AddProxyAccountArgs,
  useCall,
  useTransactionFeeModal,
} from "@orderbook/core/hooks";

import { ConfirmTransaction } from "./confirmTransaction";

export const RegisterFundingAccount = ({
  onCreateAccount,
  loading,
  onClose,
  fundWallet,
}: {
  onCreateAccount: (value: AddProxyAccountArgs) => Promise<void>;
  loading: boolean;
  onClose: () => void;
  fundWallet?: ExtensionAccount;
}) => {
  const { onAddProxyAccountOcex } = useCall();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(!open);
    onClose();
  };

  const { tokenFee, setTokenFee } = useTransactionFeeModal();

  const proxyAccount = useMemo(
    () => fundWallet?.address as string,
    [fundWallet?.address]
  );

  if (!open) return <></>;
  return (
    <ConfirmTransaction
      action={async () => {
        await onCreateAccount({
          isExtensionProxy: true,
          selectedWallet: fundWallet,
          tokenFeeId: tokenFee?.id,
        });
        handleClose();
      }}
      actionLoading={!!loading}
      extrinsicFn={() => onAddProxyAccountOcex([proxyAccount])}
      sender={proxyAccount}
      tokenFee={tokenFee}
      setTokenFee={setTokenFee}
      openFeeModal={open}
      setOpenFeeModal={handleClose}
    />
  );
};
