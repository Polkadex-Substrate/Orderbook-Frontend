import { Chain, Typography } from "@polkadex/ux";

// Maps the full chain name (as stored in the BE) to the Chain icon identifier
// understood by @polkadex/ux — same values used in the bridge and faucet configs.
const CHAIN_ICON: Record<string, string> = {
  "Sepolia Testnet": "Ethereum",
  "Polkadex Testnet": "Polkadex",
};

export const NetworkCard = ({
  name = "",
}: {
  name?: string;
}) => {
  const iconName = CHAIN_ICON[name] ?? name;
  return (
    <div className="flex items-center gap-2">
      <Chain name={iconName} size="2xs" className="max-sm:hidden" />
      <Typography.Text size="sm">{name}</Typography.Text>
    </div>
  );
};
