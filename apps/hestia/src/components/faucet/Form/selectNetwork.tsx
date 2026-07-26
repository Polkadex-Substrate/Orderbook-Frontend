"use client";

import { Typography, Chain, Button, Dropdown } from "@mitrabook/ux";
import { RiArrowDownSLine } from "@remixicon/react";
import { useMeasure } from "react-use";

export type FaucetNetwork = {
  id: "polkadex" | "sepolia";
  name: string;
  chainIcon: string;
};

export const FAUCET_NETWORKS: FaucetNetwork[] = [
  { id: "polkadex", name: "Polkadex Testnet", chainIcon: "Polkadex" },
  { id: "sepolia", name: "Sepolia Testnet", chainIcon: "Ethereum" },
];

export const SelectNetwork = ({
  selected,
  onSelect,
  open,
  onOpenChange,
}: {
  selected?: FaucetNetwork;
  onSelect: (network: FaucetNetwork) => void;
  /** Controlled-open pair, so the form's primary button can open this. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [ref, bounds] = useMeasure<HTMLButtonElement>();

  return (
    <Dropdown open={open} onOpenChange={onOpenChange}>
      <Dropdown.Trigger asChild ref={ref}>
        <Button.Outline
          asChild
          type="button"
          appearance="quaternary"
          className="gap-1 px-3 py-7 justify-between w-full cursor-pointer"
        >
          <div>
            <div className="flex items-center gap-2">
              {selected ? (
                <Chain name={selected.chainIcon} size="sm" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-level-5" />
              )}
              <Typography.Text size="lg" bold>
                {selected?.name ?? "Select network"}
              </Typography.Text>
            </div>
            <RiArrowDownSLine className="w-4 h-4" />
          </div>
        </Button.Outline>
      </Dropdown.Trigger>
      <Dropdown.Content
        className="max-h-[250px] hover:overflow-auto overflow-hidden"
        style={{ minWidth: bounds.width + 20 }}
        sideOffset={0}
      >
        {FAUCET_NETWORKS.map((network) => (
          <Dropdown.Item key={network.id} onSelect={() => onSelect(network)}>
            <div className="flex items-center gap-2 rounded-md w-full">
              <Chain name={network.chainIcon} size="sm" />
              <Typography.Text>{network.name}</Typography.Text>
            </div>
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );
};
