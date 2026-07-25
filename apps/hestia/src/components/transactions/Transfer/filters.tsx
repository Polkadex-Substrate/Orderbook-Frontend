import { Button, Icon, Popover, Typography } from "@mitra/ux";
import { Table } from "@tanstack/react-table";
import classNames from "classnames";
import { useMemo } from "react";
import { useWindowSize } from "usehooks-ts";
import { RiMore2Line, RiCloseLine } from "@remixicon/react";

import { FacetedFilter } from "../facetedFilters";

import { Export } from "./export";

export const filters = {
  from: ["Trading -> Funding", "Funding -> Trading", "Funding -> Funding"],
};

interface FiltersProps<TData> {
  table: Table<TData>;
  availableTokens: string[];
}

export const Filters = <TData,>({
  availableTokens,
  table,
}: FiltersProps<TData>) => {
  const { width } = useWindowSize();
  const responsiveFilter = useMemo(() => width <= 600, [width]);
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
            <Popover>
              <Popover.Trigger className="group">
                <RiMore2Line className="w-6 h-6 text-primary group-hover:text-current transition-colors duration-300" />
              </Popover.Trigger>
              <Popover.Content className="flex flex-col gap-3 p-2">
                {table.getColumn("token") && (
                  <FacetedFilter
                    column={table.getColumn("token")}
                    title="Token"
                    values={availableTokens}
                    withoutBorder
                  />
                )}
                {table.getColumn("wallets") && (
                  <FacetedFilter
                    column={table.getColumn("wallets")}
                    title="From/To"
                    values={filters.from}
                    withoutBorder
                  />
                )}
              </Popover.Content>
            </Popover>
          </>
        ) : (
          <div className="flex items-center gap-3">
            {table.getColumn("token") && (
              <FacetedFilter
                column={table.getColumn("token")}
                title="Token"
                values={availableTokens}
              />
            )}
            {table.getColumn("wallets") && (
              <FacetedFilter
                column={table.getColumn("wallets")}
                title="From/To"
                values={filters.from}
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
      <div className="flex-auto flex items-center justify-end">
        <Export table={table} />
      </div>
    </div>
  );
};
