import { Button, Icon, Popover, Typography } from "@mitra/ux";
import { Table } from "@tanstack/react-table";
import classNames from "classnames";
import { useMemo } from "react";
import { useWindowSize } from "usehooks-ts";
import { RiMore2Line, RiCloseLine, RiRefreshLine } from "@remixicon/react";

import { FacetedFilter } from "./facetedFilters";
import { Export } from "./export";

export const filters = {
  status: ["Completed", "In Progress"],
};

interface FiltersProps<TData> {
  table: Table<TData>;
  assets: any;
  chains: any;
  data: any[];
  refetchingLoading: boolean;
  onRefetch: () => Promise<void>;
  address: string;
}

export const Filters = <TData,>({
  table,
  assets,
  chains,
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

  const availableChains = useMemo(() => {
    const marketsSet = new Set(chains.map((v) => v.name));
    return Array.from(marketsSet);
  }, [chains]);

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
            {table.getColumn("source") && (
              <FacetedFilter
                column={table.getColumn("source")}
                title="Chain"
                values={availableChains}
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
              {table.getColumn("source") && (
                <FacetedFilter
                  column={table.getColumn("source")}
                  title="Chain"
                  values={availableChains}
                />
              )}
            </Popover.Content>
          </Popover>
        )}
      </div>
    </div>
  );
};
