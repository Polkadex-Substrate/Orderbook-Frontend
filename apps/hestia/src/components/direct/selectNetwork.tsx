"use client";
import {
  Typography,
  Chain,
  Button,
  Popover,
  Searchable,
  ScrollArea,
} from "@mitrabook/ux";
import { RiArrowDownSLine } from "@remixicon/react";
import { Dispatch, SetStateAction, useState } from "react";
import { useMeasure } from "react-use";

type Network = (typeof fakeNetworks)[0];
export const SelectNetwork = ({
  network,
  setNetwork,
}: {
  network: Network;
  setNetwork: Dispatch<SetStateAction<Network>>;
}) => {
  const [open, setOpen] = useState(false);
  const [ref, bounds] = useMeasure<HTMLButtonElement>();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger ref={ref} superpositionTrigger className="w-full">
        <Button.Outline
          asChild
          type="button"
          appearance="quaternary"
          className="gap-1 px-2 py-7 justify-between w-full cursor-pointer"
        >
          <div>
            <div className="flex items-center gap-2">
              <Chain name={network.name} />
              <Typography.Text size="lg" bold>
                {network.name ?? "Select"}
              </Typography.Text>
            </div>
            <RiArrowDownSLine className="w-4 h-4" />
          </div>
        </Button.Outline>
      </Popover.Trigger>
      <Popover.Content style={{ minWidth: bounds.width }}>
        <Searchable className="bg-level-0">
          <Searchable.Input placeholder="Search network" />
          <Searchable.List className="overflow-hidden">
            <div className="flex gap-2">
              <div className="flex flex-col flex-1">
                <Searchable.Empty className="flex-1 flex items-center justify-center">
                  No result found
                </Searchable.Empty>
                <ScrollArea className="max-h-[280px]">
                  <Searchable.Group heading="Available chains">
                    {fakeNetworks.map((e) => {
                      return (
                        <Searchable.Item
                          key={e.name}
                          value={e.name}
                          className="mb-1 mr-1"
                          onSelect={() => {
                            setNetwork(e);
                            setOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2 rounded-md w-full">
                            <Chain name={e.logo} size="sm" />
                            <Typography.Text>{e.name}</Typography.Text>
                          </div>
                        </Searchable.Item>
                      );
                    })}
                  </Searchable.Group>
                  <ScrollArea.Bar orientation="vertical" />
                </ScrollArea>
              </div>
            </div>
          </Searchable.List>
        </Searchable>
      </Popover.Content>
      <Popover.Overlay />
    </Popover>
  );
};

export const fakeNetworks = [
  {
    name: "Polkadot",
    logo: "Polkadot",
    genesis: "0x003",
    type: "...",
    isTestnet: false,
  },
  {
    name: "Polkadex",
    logo: "Polkadex",
    genesis: "0x001",
    type: "...",
    isTestnet: false,
  },
  {
    name: "AssetHub",
    logo: "AssetHub",
    genesis: "0x002",
    type: "...",
    isTestnet: false,
  },
  {
    name: "Astar",
    logo: "Astar",
    genesis: "0x004",
    type: "...",
    isTestnet: false,
  },
  {
    name: "Phala",
    logo: "Phala",
    genesis: "0x005",
    type: "...",
    isTestnet: false,
  },
  {
    name: "Moonbeam",
    logo: "Moonbeam",
    genesis: "0x006",
    type: "...",
    isTestnet: false,
  },
  {
    name: "Unique",
    logo: "Unique",
    genesis: "0x007",
    type: "...",
    isTestnet: false,
  },
  {
    name: "Interlay",
    logo: "Interlay",
    genesis: "0x008",
    type: "...",
    isTestnet: false,
  },
  {
    name: "Bifrost",
    logo: "Bifrost",
    genesis: "0x009",
    type: "...",
    isTestnet: false,
  },
];
