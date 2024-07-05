import { Chain, HoverCard, Typography } from "@polkadex/ux";
import { RiInformationFill } from "@remixicon/react";

export const NetworkCard = ({
  name = "",
  isPolkadotEcosystem,
}: {
  name?: string;
  isPolkadotEcosystem?: boolean;
}) => {
  if (isPolkadotEcosystem)
    return (
      <div className="flex items-center gap-2">
        <Chain name={name} size="2xs" className="max-sm:hidden" />
        <Typography.Text size="sm">{name}</Typography.Text>
      </div>
    );
  return (
    <HoverCard>
      <HoverCard.Trigger>
        <div className="flex items-center gap-2">
          <Chain size="2xs" name={name} className="max-sm:hidden" />
          <div className="flex items-center gap-1">
            <Typography.Text size="sm">{name}</Typography.Text>
            <RiInformationFill className="w-2.5 h-2.5 text-actionInput max-sm:hidden" />
          </div>
        </div>
      </HoverCard.Trigger>
      <HoverCard.Content>Parachain within Polkadot ecosystem</HoverCard.Content>
    </HoverCard>
  );
};
