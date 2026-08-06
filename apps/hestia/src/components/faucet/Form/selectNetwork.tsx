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

/**
 * Polkadex is the default: it is the network this faucet exists to serve, it
 * offers all 9 tokens (Sepolia offers 7), and its address autofills from the
 * connected profile. Starting on "Select network" made every visit begin with a
 * mandatory click that had one obvious answer.
 */
export const DEFAULT_FAUCET_NETWORK = FAUCET_NETWORKS[0];

/**
 * Persisted so the choice survives a reload and a successful claim. A Sepolia
 * user would otherwise be reset to Polkadex on every single request.
 *
 * Stored by id rather than as the whole object, so renaming a network or
 * changing its icon does not resurrect a stale copy from localStorage.
 */
export const FAUCET_NETWORK_STORAGE_KEY = "faucet_network";

/** Resolve a stored id back to a network, ignoring anything unrecognised. */
export const findFaucetNetwork = (
  id?: string | null
): FaucetNetwork | undefined => FAUCET_NETWORKS.find((n) => n.id === id);

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
