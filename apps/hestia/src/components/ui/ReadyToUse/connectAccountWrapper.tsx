import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { Button, GenericMessage } from "@mitrabook/ux";

export const ConnectAccountWrapper = ({
  funding = false,
  compact = false,
}: {
  funding?: boolean;
  /** Slim horizontal bar instead of the tall illustration — for panels that
   *  shouldn't spend hundreds of pixels on an unconnected state. */
  compact?: boolean;
}) => {
  const {
    onToogleConnectTrading,
    onToogleConnectExtension,
    onToogleFundWallet,
  } = useSettingsProvider();
  const { mainProxiesAccounts, selectedWallet } = useConnectWalletProvider();

  if (compact) {
    const needsFunds =
      !!selectedWallet?.address && mainProxiesAccounts.length === 0;
    const title = needsFunds
      ? "Please get some funds in your account to get started."
      : funding
        ? "Please connect your Funding account."
        : "Please connect your Trading account.";
    const actionLabel = needsFunds
      ? "Fund Account"
      : funding
        ? "Connect Funding Account"
        : "Connect Trading Account";
    const onAction = needsFunds
      ? () => onToogleFundWallet()
      : funding
        ? () => onToogleConnectExtension()
        : () => onToogleConnectTrading();
    return (
      <div className="flex items-center justify-center gap-4 bg-level-0 px-4 py-4">
        <span className="text-sm opacity-80">{title}</span>
        <Button.Solid size="sm" onClick={onAction}>
          {actionLabel}
        </Button.Solid>
      </div>
    );
  }

  if (selectedWallet?.address && mainProxiesAccounts.length === 0) {
    return (
      <GenericMessage
        title="Please get some funds in your account to get started."
        illustration="ConnectAccount"
        className="bg-level-0"
      >
        <Button.Solid onClick={() => onToogleFundWallet()}>
          Fund Account
        </Button.Solid>
      </GenericMessage>
    );
  }

  return (
    <>
      {funding ? (
        <GenericMessage
          title="Please Connect your Funding account."
          illustration="ConnectAccount"
          className="bg-level-0"
        >
          <Button.Solid onClick={() => onToogleConnectExtension()}>
            Connect Funding Account
          </Button.Solid>
        </GenericMessage>
      ) : (
        <GenericMessage
          title="Please Connect your Trading account."
          illustration="ConnectAccount"
          className="bg-level-0"
        >
          <Button.Solid onClick={() => onToogleConnectTrading()}>
            Connect Trading Account
          </Button.Solid>
        </GenericMessage>
      )}
    </>
  );
};
