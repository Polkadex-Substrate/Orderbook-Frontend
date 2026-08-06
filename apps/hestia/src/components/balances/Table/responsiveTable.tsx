import { Button, Drawer, Tokens } from "@polkadex/ux";
import { Dispatch, SetStateAction } from "react";
import { AssetsProps } from "@orderbook/core/hooks";
import Link from "next/link";
import { getChainFromTicker } from "@orderbook/core/helpers";

import { ResponsiveCard, TokenCard } from "@/components/ui/ReadyToUse";
export const ResponsiveTable = ({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  data: AssetsProps | null;
}) => {
  if (!data) return null;
  const { ticker, onChainBalance, free_balance, inOrdersBalance } = data;
  const chainName = getChainFromTicker(ticker);

  return (
    <Drawer
      closeOnClickOutside
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      <Drawer.Content className="flex flex-col gap-4 p-4">
        <ResponsiveCard label="Asset">
          <TokenCard
            tokenName={chainName}
            ticker={ticker}
            icon={ticker as keyof typeof Tokens}
          />
        </ResponsiveCard>
        <ResponsiveCard label="Funding account">
          {onChainBalance}
        </ResponsiveCard>
        <ResponsiveCard label="Trading account">{free_balance}</ResponsiveCard>
        <ResponsiveCard label="In orders">{inOrdersBalance}</ResponsiveCard>
      </Drawer.Content>
      <Drawer.Footer className="flex flex-col gap-2 p-4">
        <Button.Solid asChild>
          <Link href={`/transfer/${ticker}?type=transfer`}>Transfer</Link>
        </Button.Solid>
        <Button.Solid appearance="secondary" asChild>
          <Link
            href={{
              pathname: "/send-and-receive",
              query: {
                type: "withdraw",
              },
            }}
          >
            Withdraw
          </Link>
        </Button.Solid>
        <Button.Solid appearance="secondary" asChild>
          <Link
            href={{
              pathname: "/send-and-receive",
            }}
          >
            Deposit
          </Link>
        </Button.Solid>
      </Drawer.Footer>
    </Drawer>
  );
};
