import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { Button, Typography } from "@mitrabook/ux";
import { useMemo } from "react";

import {
  OrderSide,
  connectLabel,
  connectStep,
  sideLabel,
  sideTone,
} from "./connectAccount.logic";

/**
 * The call to action shown in an order form that cannot place an order yet.
 *
 * Takes `side` because without it the Limit and Market forms rendered TWO
 * identical grey buttons side by side, and the only thing that ever tells buy
 * from sell is the final Buy/Sell button, which is absent in this exact state.
 * A first-time user could not tell which half of the screen was which, and the
 * ambiguity was invisible to anyone already connected.
 *
 * The side is carried by the label, not the button fill. See
 * connectAccount.logic.ts for why colouring this button green and red would
 * trade one bug for a worse one.
 */
const ConnectAccount = ({
  side,
  ticker,
}: {
  /** Omitted by the mobile bar, which is one control for both directions. */
  side?: OrderSide;
  ticker?: string | null;
}) => {
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();
  const {
    onToogleConnectTrading,
    onToogleConnectExtension,
    onToogleFundWallet,
  } = useSettingsProvider();
  const { mainProxiesAccounts } = useConnectWalletProvider();

  const step = useMemo(
    () =>
      connectStep({
        hasMainAddress: !!mainAddress,
        proxyCount: mainProxiesAccounts.length,
      }),
    [mainAddress, mainProxiesAccounts.length]
  );

  const onClick = () => {
    if (step === "fund") return onToogleFundWallet(true);
    if (step === "funding-account") return onToogleConnectExtension(true);
    return onToogleConnectTrading(true);
  };

  const label = sideLabel(side, ticker);

  return (
    <div className="flex flex-col gap-1.5">
      {/* The side indicator. Present in every connection state, which is the
          point: the panel must be identifiable before it is usable. Absent when
          there is no side, rather than defaulted to one. */}
      {label && side && (
        <Typography.Text
          size="xs"
          bold
          className={
            sideTone(side) === "success"
              ? "text-success-base"
              : "text-danger-base"
          }
        >
          {label}
        </Typography.Text>
      )}
      <Button.Solid type="button" appearance="secondary" onClick={onClick}>
        {connectLabel(step)}
      </Button.Solid>
    </div>
  );
};

export default ConnectAccount;
