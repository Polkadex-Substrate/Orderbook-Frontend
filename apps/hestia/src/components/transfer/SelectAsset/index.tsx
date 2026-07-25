import { Button, Checkbox, Modal, Typography, Input } from "@mitrabook/ux";
import { useAssets } from "@orderbook/core/hooks";
import classNames from "classnames";
import { RiCloseLine } from "@remixicon/react";

import { Table } from "./table";

import { FilteredAssetProps } from "@/hooks";

export const SelectAsset = ({
  open,
  onOpenChange,
  selectedAssetId,
  onChangeAsset,
}: {
  open: boolean;
  onOpenChange: () => void;
  selectedAssetId: string;
  onChangeAsset: (e: FilteredAssetProps) => void;
}) => {
  const { assets, loading, filters, onHideZeroBalance, onSearchToken } =
    useAssets();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      placement="top right"
      closeOnClickOutside
      className={classNames(
        "flex flex-col border-primary bg-level-0 border-x w-screen h-screen md:max-w-md overflow-x-hidden overflow-y-auto",
        "top-1/2 right-0 transform -translate-y-1/2" // fix that in polkadex/ux
      )}
    >
      <Modal.Title className="flex justify-between items-center py-4 pl-4">
        <Typography.Text size="lg" bold>
          Assets
        </Typography.Text>
        <Button.Icon
          variant="ghost"
          size="lg"
          appearance="secondary"
          rounded
          onClick={onOpenChange}
        >
          <RiCloseLine className="w-full h-full" />
        </Button.Icon>
      </Modal.Title>
      <Modal.Content className="flex flex-col flex-1">
        <div className="py-2 flex items-center justify-between gap-2 border-b border-primary px-4">
          <Input.Search
            placeholder="Search.."
            value={filters.search}
            onChange={onSearchToken}
            className="max-sm:focus:text-[16px]"
          />
          <div className="flex items-center gap-4">
            <Checkbox.Solid
              id="hideZeroBalances"
              checked={filters.hideZero}
              onCheckedChange={onHideZeroBalance}
            >
              <Checkbox.Label htmlFor="hideZeroBalances">
                Hide 0 balances
              </Checkbox.Label>
            </Checkbox.Solid>
          </div>
        </div>
        <Table
          data={assets}
          loading={loading}
          selectedAssetId={selectedAssetId}
          onChangeAsset={onChangeAsset}
        />
      </Modal.Content>
    </Modal>
  );
};
