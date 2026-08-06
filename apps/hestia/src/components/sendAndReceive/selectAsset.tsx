"use client";

import {
  Typography,
  Button,
  Token,
  Popover,
  Searchable,
  ScrollArea,
  TokenCard,
  TokenAppearance,
} from "@polkadex/ux";
import { Asset, AssetAmount, Chain } from "@polkadex/thea";
import { Fragment, useState } from "react";
import { RiArrowDownSLine } from "@remixicon/react";

import { formatAmount } from "@/helpers";

export const SelectAsset = ({
  width,
  sourceChain,
  supportedAssets,
  selectedAsset,
  onSelectAsset,
  sourceBalances,
  sourceBalancesLoading,
}: {
  width: number;
  sourceChain: Chain | null;
  supportedAssets: Asset[];
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
  sourceBalances: AssetAmount[];
  sourceBalancesLoading: boolean;
}) => {
  const [open, setOpen] = useState(false);

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
            <Button.Outline
              type="button"
              appearance="secondary"
              className="gap-1 px-2 justify-between h-full border-0 border-r"
              onClick={() => setOpen(true)}
            >
              <div className="flex items-center gap-2 px-2">
                {selectedAsset ? (
                  <Token
                    name={selectedAsset.ticker}
                    size="md"
                    appearance={selectedAsset.ticker as TokenAppearance}
                    className="rounded-full border border-primary"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-level-5" />
                )}
                <Typography.Text size="md">
                  {selectedAsset ? selectedAsset.ticker : "Select token"}
                </Typography.Text>
              </div>
              <RiArrowDownSLine className="w-4 h-4" />
            </Button.Outline>
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
                    {supportedAssets.map((e) => {
                      const balance =
                        sourceBalances?.find((x) => x.ticker === e.ticker)
                          ?.amount ?? 0;

                      return (
                        <Searchable.Item
                          key={e.ticker}
                          value={e.ticker}
                          className="mb-1 mr-1"
                          onSelect={() => {
                            onSelectAsset(e);
                            setOpen(false);
                          }}
                        >
                          <div className="flex-1 [&_span]:!normal-case">
                            <TokenCard
                              key={e.id}
                              icon={e.ticker as TokenAppearance}
                              ticker={e.ticker}
                              tokenName={sourceChain?.name || ""}
                              balance={formatAmount(balance)}
                              loading={sourceBalancesLoading}
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
