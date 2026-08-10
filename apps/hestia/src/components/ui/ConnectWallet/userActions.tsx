import { Interaction } from "@mitrabook/ux";
import { ExtensionAccount } from "@aksumite/react-providers";

import { GenericHorizontalCard } from "../ReadyToUse";

import { FillSoundToggle } from "./fillSoundToggle";

export const UserActions = ({
  onClose,
  onCreateTradingAccount,
  onImportTradingAccount,
  onTradingAccountList,
  fundWalletIsPresent,
  registeredProxies,
  fundWallet,
}: {
  onClose: () => void;
  onCreateTradingAccount: (isExtensionProxy: boolean) => void;
  onImportTradingAccount: () => void;
  onTradingAccountList: () => void;
  fundWalletIsPresent: boolean;
  registeredProxies: string[];
  fundWallet?: ExtensionAccount;
}) => {
  return (
    <Interaction className="w-full">
      <Interaction.Title onClose={{ onClick: onClose }}>
        Options
      </Interaction.Title>
      <Interaction.Content className="flex flex-col gap-2 flex-1">
        {registeredProxies.length > 0 &&
          !registeredProxies.includes(fundWallet?.address as string) && (
            <GenericHorizontalCard
              title="Register funding account"
              icon="Wallet"
              label="NEW"
              onClick={() => onCreateTradingAccount(true)}
            />
          )}
        {fundWalletIsPresent && (
          <GenericHorizontalCard
            title="Create new trading account"
            icon="Plus"
            onClick={() => onCreateTradingAccount(false)}
          />
        )}
        <GenericHorizontalCard
          title="Import trading account"
          icon="Recover"
          onClick={onImportTradingAccount}
        />
        <GenericHorizontalCard
          title={`Registered trading accounts (${registeredProxies.length})`}
          icon="History"
          onClick={onTradingAccountList}
        />

        {/* Preferences sit below the account actions, separated, because they are
            a different kind of thing: everything above navigates somewhere, this
            changes a setting in place. */}
        <div className="mt-1 border-t border-primary pt-3">
          <FillSoundToggle />
        </div>
      </Interaction.Content>
      <Interaction.Footer>
        <Interaction.Close onClick={onClose}>Cancel</Interaction.Close>
      </Interaction.Footer>
    </Interaction>
  );
};
