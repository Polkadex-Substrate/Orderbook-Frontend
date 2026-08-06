import { Button, Icon, Popover, Typography } from "@polkadex/ux";
import { Table } from "@tanstack/react-table";
import classNames from "classnames";
import { useMemo } from "react";
import { useWindowSize } from "usehooks-ts";
import { RiMore2Line, RiCloseLine, RiRefreshLine } from "@remixicon/react";
import { Asset, Chain } from "@polkadex/thea";

import { FacetedFilter } from "./facetedFilters";
import { Export } from "./export";

import { Transaction } from "@/hooks";

export const filters = {
  status: ["Completed", "In Progress"],
};

interface FiltersProps<TData> {
  table: Table<TData>;
  assets: Asset[];
  chains: Chain[];
  data: Transaction[];
  refetchingLoading: boolean;
  onRefetch: () => Promise<void>;
  address: string;
}

export const Filters = <TData,>({
  table,
  assets,
  data,
  refetchingLoading,
  onRefetch,
  address,
}: FiltersProps<TData>) => {
  const { width } = useWindowSize();
  const responsiveFilter = useMemo(() => width <= 780, [width]);
  const hasFilters = table.getState().columnFilters.length > 0;

  const availableAssets = useMemo(() => {
    const marketsSet = new Set(assets.map((v) => v.ticker));
    return Array.from(marketsSet);
  }, [assets]);

  return (
    <div className="flex items-center gap-5 justify-between px-4 py-1.5">
      <div
        className={classNames(
          "flex items-center gap-4 flex-1",
          responsiveFilter && "justify-"
        )}
      >
        {responsiveFilter ? (
          <Typography.Text appearance="secondary">Filters</Typography.Text>
        ) : (
          <div className="flex items-center gap-3">
            {table.getColumn("token") && (
              <FacetedFilter
                column={table.getColumn("token")}
                title="Asset"
                values={availableAssets}
              />
            )}
          </div>
        )}
        {!!hasFilters && (
          <Button.Outline
            size="sm"
            appearance="secondary"
            className="gap-2"
            onClick={() => table.resetColumnFilters()}
          >
            <Icon className="w-3 h-3">
              <RiCloseLine className="w-full h-full" />
            </Icon>
            <Typography.Text size="sm">Reset</Typography.Text>
          </Button.Outline>
        )}
      </div>
      <div className="flex-auto flex items-center justify-end gap-2">
        <Export data={data} address={address} />
        <Button.Outline
          onClick={onRefetch}
          appearance="secondary"
          size="sm"
          disabled={refetchingLoading}
          className="gap-1"
        >
          <RiRefreshLine className="w-4 h-4 text-primary" />
          {refetchingLoading && (
            <Typography.Text appearance="primary" size="xs">
              Refetching..
            </Typography.Text>
          )}
        </Button.Outline>
        {responsiveFilter && (
          <Popover>
            <Popover.Trigger className="group">
              <RiMore2Line className="w-6 h-6 text-primary group-hover:text-current transition-colors duration-300" />
            </Popover.Trigger>
            <Popover.Content className="flex flex-col gap-3 p-2">
              {table.getColumn("token") && (
                <FacetedFilter
                  column={table.getColumn("token")}
                  title="Asset"
                  values={availableAssets}
                />
              )}
            </Popover.Content>
          </Popover>
        )}
      </div>
    </div>
  );
};
