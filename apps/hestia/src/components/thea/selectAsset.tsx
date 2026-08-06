"use client";

import {
  Interaction,
  Modal,
  Searchable,
  Skeleton,
  TokenAppearance,
  TokenCard,
} from "@polkadex/ux";
import { SetStateAction, Dispatch, useCallback, ComponentProps } from "react";
import classNames from "classnames";
import { twMerge } from "tailwind-merge";
import { useTheaProvider } from "@orderbook/core/providers";

import { formatAmount } from "@/helpers";

export const SelectAsset = ({
  open,
  onOpenChange,
  loading,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  loading?: boolean;
}) => {
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const {
    supportedAssets,
    onSelectAsset,
    sourceBalances,
    sourceBalancesLoading,
    sourceChain,
  } = useTheaProvider();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      closeOnClickOutside
      placement="center left"
      className="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
    >
      <Modal.Content>
        <Interaction className="w-full sm:min-w-[24rem] sm:max-w-[24rem] rounded-md">
          <Interaction.Title onClose={{ onClick: () => onOpenChange(false) }}>
            Select a token
          </Interaction.Title>
          <Interaction.Content withPadding={false} className="px-3">
            {loading ? (
              <SkeletonCollection />
            ) : (
              <Searchable className="bg-transparent p-0 border-none gap-4">
                <div className="px-3">
                  <Searchable.Input placeholder="Search by name or ticker" />
                </div>
                <Searchable.List className="scrollbar-hide">
                  <Searchable.Empty className="flex-1 flex items-center justify-center">
                    No result found
                  </Searchable.Empty>
                  <Searchable.Group
                    heading="Assets"
                    className="[&_[cmdk-group-heading]]:px-3"
                  >
                    {supportedAssets?.map((e, i) => {
                      const balance =
                        sourceBalances?.find((x) => x.ticker === e.ticker)
                          ?.amount ?? 0;

                      return (
                        <Searchable.Item
                          key={i}
                          value={e.ticker}
                          className="p-3"
                          onSelect={() => {
                            onSelectAsset(e);
                            onOpenChange(false);
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
                </Searchable.List>
              </Searchable>
            )}
          </Interaction.Content>
          <Interaction.Footer className="border-t border-primary">
            <Interaction.Close onClick={handleClose}>Close</Interaction.Close>
          </Interaction.Footer>
        </Interaction>
      </Modal.Content>
    </Modal>
  );
};

interface SkeletonCollectionProps extends ComponentProps<typeof Skeleton> {
  rows?: number;
}

const SkeletonCollection = ({
  rows = 5,
  className,
  ...props
}: SkeletonCollectionProps) => {
  return (
    <div className="flex-1 flex flex-col gap-3 p-3">
      {new Array(rows).fill("").map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton
            loading
            className={twMerge(
              classNames("h-14 max-w-14 flex-auto rounded-full"),
              className
            )}
            {...props}
          />
          <div className="flex flex-1 justify-between">
            <div className="flex flex-col flex-1 gap-2">
              <Skeleton
                loading
                className={twMerge(classNames("h-14 max-w-32"), className)}
                {...props}
              />
              <Skeleton
                loading
                className={twMerge(classNames("h-14 max-w-20"), className)}
                {...props}
              />
            </div>
            <Skeleton
              loading
              className={twMerge(
                classNames("h-5 max-w-12 self-center"),
                className
              )}
              {...props}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
