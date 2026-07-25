"use client";

import { ExtensionAccount } from "@mitra/react-providers";
import {
  Typography,
  AccountCard,
  Illustrations,
  Interaction,
  Accordion,
} from "@mitra/ux";
import { ExtensionsArray } from "@polkadot-cloud/assets/extensions";

export const FundAccount = ({
  extensionAccounts,
  onClose,
  isPresent,
  selectdAccount,
  selectedExtension,
}: {
  extensionAccounts: ExtensionAccount[];
  selectdAccount: ExtensionAccount;
  onClose: () => void;
  isPresent: boolean;
  selectedExtension?: (typeof ExtensionsArray)[0];
}) => {
  return (
    <Interaction className="gap-10 w-full">
      <Interaction.Content className="flex flex-col gap-6 flex-1">
        {isPresent ? (
          <>
            <div className="py-6 flex flex-col gap-5 items-center text-center border-b border-primary pb-8">
              <div className="max-w-[8rem]">
                <Illustrations.Successfull className="max-w-[6rem] w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <Typography.Text bold size="xl">
                  Connected
                </Typography.Text>
                <Typography.Text appearance="primary">
                  Excellent! You can now perform actions that require signing,
                  such as transferring funds and managing your trading account.
                </Typography.Text>
              </div>
            </div>
            <AccountCard.Inverted
              name={selectdAccount.name}
              address={selectdAccount.address}
            />
          </>
        ) : (
          <>
            <div className="py-6 flex flex-col gap-5 items-center text-center border-b border-primary pb-8">
              <div className="max-w-[8rem]">
                <Illustrations.Error className="max-w-[6rem] w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <Typography.Text bold size="xl">
                  Funding account not found here
                </Typography.Text>
                <Typography.Text appearance="primary">
                  Are you sure your wallet was here? Check{" "}
                  {selectedExtension?.title} to ensure your wallet is visible
                  and try once more.
                </Typography.Text>
              </div>
            </div>
            <Accordion type="single" defaultValue="accordion1">
              <Accordion.Item value="accordion1">
                <Accordion.Trigger>
                  <Typography.Text appearance="secondary">
                    Wallets in this extension
                  </Typography.Text>
                </Accordion.Trigger>
                <Accordion.Content>
                  <div className="flex flex-col gap-3">
                    {extensionAccounts?.map((value, i) => (
                      <AccountCard
                        key={i}
                        name={value.name}
                        address={value.address}
                      />
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </>
        )}
      </Interaction.Content>
      <Interaction.Footer>
        <Interaction.Close onClick={onClose}>
          {isPresent ? "Close" : "Connect other wallet"}
        </Interaction.Close>
      </Interaction.Footer>
    </Interaction>
  );
};
