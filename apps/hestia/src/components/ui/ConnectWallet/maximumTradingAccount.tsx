import {
  Accordion,
  Typography,
  Illustrations,
  Interaction,
} from "@polkadex/ux";
import { MouseEvent } from "react";
import { TradeAccount } from "@orderbook/core/providers/types";

import { RemoveWalletCard } from "../ReadyToUse";

export const MaximumTradingAccount = ({
  browserAccounts,
  tradingAccounts,
  onRemove,
  onClose,
  onRemoveCallback,
}: {
  browserAccounts: TradeAccount[];
  tradingAccounts?: string[];
  onRemove: (e: TradeAccount) => void;
  onClose: (event: MouseEvent<HTMLButtonElement>) => void;
  onRemoveCallback: () => void;
}) => {
  return (
    <Interaction className="gap-10 w-full">
      <Interaction.Content className="flex flex-col gap-6 flex-1">
        <div className="py-6 flex flex-col gap-5 items-center text-center border-b border-primary pb-8">
          <div className="max-w-[8rem]">
            <Illustrations.Error className="max-w-[6rem] w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Typography.Text bold size="xl">
              Maximum 3 trading accounts allowed
            </Typography.Text>
            <Typography.Text appearance="primary">
              Each funding account within the Orderbook can be linked to a
              maximum of 3 distinct trading accounts. Please delete one to
              continue.
            </Typography.Text>
          </div>
        </div>
        <Accordion type="multiple" defaultValue={["accordion1"]}>
          <Accordion.Item value="accordion1">
            <Accordion.Trigger>
              <Typography.Text appearance="secondary" className="mb-3">
                Trading accounts
              </Typography.Text>
            </Accordion.Trigger>
            <Accordion.Content>
              <div className="flex flex-col gap-4">
                {tradingAccounts?.map((v) => {
                  const account = browserAccounts?.find(
                    (acc) => acc.address === v
                  );
                  const tradingAccount = {
                    address: v,
                    meta: {
                      name: "Trading Account",
                    },
                  };
                  return (
                    <RemoveWalletCard
                      key={v}
                      name={account?.meta?.name}
                      address={v}
                      showTooltip={tradingAccounts.length === 1}
                      onClick={() => {
                        onRemove(tradingAccount as TradeAccount);
                        onRemoveCallback();
                      }}
                    />
                  );
                })}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Interaction.Content>
      <Interaction.Footer>
        <Interaction.Close onClick={onClose}>Back</Interaction.Close>
      </Interaction.Footer>
    </Interaction>
  );
};
