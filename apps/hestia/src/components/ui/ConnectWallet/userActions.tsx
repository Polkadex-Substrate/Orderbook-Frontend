import { Interaction } from "@polkadex/ux";
import { ExtensionAccount } from "@polkadex/react-providers";

import { GenericHorizontalCard } from "../ReadyToUse";

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
      </Interaction.Content>
      <Interaction.Footer>
        <Interaction.Close onClick={onClose}>Cancel</Interaction.Close>
      </Interaction.Footer>
    </Interaction>
  );
};
