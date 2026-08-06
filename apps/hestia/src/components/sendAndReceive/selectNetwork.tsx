"use client";
import { Chain as ChainType } from "@polkadex/thea";
import {
  Typography,
  Chain,
  Button,
  Popover,
  Searchable,
  ScrollArea,
} from "@polkadex/ux";
import { RiArrowDownSLine } from "@remixicon/react";
import { useState } from "react";
import { useMeasure } from "react-use";

export const SelectNetwork = ({
  allChains,
  selectedChain,
  onSelectChain,
}: {
  allChains: ChainType[];
  selectedChain: ChainType | null;
  onSelectChain: (chain: ChainType) => void;
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
              <Chain name={selectedChain?.name || ""} />
              <Typography.Text size="lg" bold>
                {selectedChain?.name ?? "Select"}
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
                    {allChains.map((e) => {
                      return (
                        <Searchable.Item
                          key={e.name}
                          value={e.name}
                          className="mb-1 mr-1"
                          onSelect={() => {
                            onSelectChain(e);
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
