"use client";

import {
  Typography,
  Button,
  Token,
  Popover,
  Searchable,
  ScrollArea,
  TokenCard,
} from "@mitrabook/ux";
import { Fragment, useState } from "react";
import { RiArrowDownSLine } from "@remixicon/react";

export const SelectAsset = ({ width }: { width: number }) => {
  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState(fakeAssets[0]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger superpositionTrigger>
        <Button.Outline
          asChild
          type="button"
          appearance="secondary"
          className="gap-1 px-2 justify-between h-full"
        >
          <Fragment>
            <div className="flex items-center gap-2">
              <Token
                name={asset.ticker}
                size="md"
                appearance={asset.ticker}
                className="rounded-full border border-primary"
              />

              <Typography.Text size="md">{asset.ticker}</Typography.Text>
            </div>
            <RiArrowDownSLine className="w-4 h-4" />
          </Fragment>
        </Button.Outline>
      </Popover.Trigger>
      <Popover.Content style={{ minWidth: width }} side="bottom" align="start">
        <Searchable className="bg-level-0">
          <Searchable.Input placeholder="Search asset" />
          <Searchable.List className="overflow-hidden">
            <div className="flex gap-2">
              <div className="flex flex-col flex-1">
                <Searchable.Empty className="flex-1 flex items-center justify-center">
                  No result found
                </Searchable.Empty>
                <ScrollArea className="max-h-[280px]">
                  <Searchable.Group heading="Available assets">
                    {fakeAssets.map((e) => {
                      return (
                        <Searchable.Item
                          key={e.ticker}
                          value={e.ticker}
                          className="mb-1 mr-1"
                          onSelect={() => {
                            setAsset(e);
                            setOpen(false);
                          }}
                        >
                          <div className="flex-1 [&_span]:!normal-case">
                            <TokenCard
                              key={e.id}
                              icon={e.ticker}
                              ticker={e.ticker}
                              balance={0}
                              tokenName={e.name}
                            />
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

const fakeAssets = [
  {
    id: "1",
    ticker: "DOT",
    logo: "DOT",
    name: "Polkadot",
    decimal: 12,
  },
  {
    id: "2",
    ticker: "PDEX",
    logo: "PDEX",
    name: "Polkadex",
    decimal: 12,
  },
  {
    id: "3",
    ticker: "USDT",
    logo: "USDT",
    name: "Tether",
    decimal: 12,
  },
];
