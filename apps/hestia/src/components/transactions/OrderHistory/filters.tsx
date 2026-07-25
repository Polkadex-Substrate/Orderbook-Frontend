import { Button, Icon, Popover, Typography } from "@mitra/ux";
import { Table } from "@tanstack/react-table";
import classNames from "classnames";
import { useMemo } from "react";
import { useWindowSize } from "usehooks-ts";
import { RiMore2Line, RiCloseLine } from "@remixicon/react";

import { FacetedFilter } from "../facetedFilters";

import { Export } from "./export";

export const filters = {
  type: ["LIMIT/BUY", "LIMIT/SELL", "MARKET/BUY", "MARKET/SELL"],
  status: ["CLOSED", "CANCELLED"],
};

interface FiltersProps<TData> {
  table: Table<TData>;
  availablePairs: string[];
}

export const Filters = <TData,>({
  availablePairs,
  table,
}: FiltersProps<TData>) => {
  const { width } = useWindowSize();
  const responsiveFilter = useMemo(() => width <= 780, [width]);
  const hasFilters = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center gap-5 justify-between px-4 py-1.5">
      <div
        className={classNames(
          "flex items-center gap-4 flex-1",
          responsiveFilter && "justify-"
        )}
      >
        {responsiveFilter ? (
          <>
            <Typography.Text appearance="secondary">Filters</Typography.Text>
          </>
        ) : (
          <div className="flex items-center gap-3">
            {table.getColumn("pair") && (
              <FacetedFilter
                column={table.getColumn("pair")}
                title="Pair"
                values={availablePairs}
              />
            )}
            {table.getColumn("type") && (
              <FacetedFilter
                column={table.getColumn("type")}
                title="Type"
                values={filters.type}
              />
            )}
            {table.getColumn("status") && (
              <FacetedFilter
                column={table.getColumn("status")}
                title="Status"
                values={filters.status}
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
        <Export />
        {responsiveFilter && (
          <Popover>
            <Popover.Trigger className="group">
              <RiMore2Line className="w-6 h-6 text-primary group-hover:text-current transition-colors duration-300" />
            </Popover.Trigger>
            <Popover.Content className="flex flex-col gap-3 p-2">
              {table.getColumn("pair") && (
                <FacetedFilter
                  column={table.getColumn("pair")}
                  title="Pair"
                  values={availablePairs}
                  withoutBorder
                />
              )}
              {table.getColumn("type") && (
                <FacetedFilter
                  column={table.getColumn("type")}
                  title="Type"
                  values={filters.type}
                  withoutBorder
                />
              )}
              {table.getColumn("status") && (
                <FacetedFilter
                  column={table.getColumn("status")}
                  title="Status"
                  values={filters.status}
                  withoutBorder
                />
              )}
            </Popover.Content>
          </Popover>
        )}
      </div>
    </div>
  );
};
