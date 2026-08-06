"use client";

import { FilterGroup, Typography } from "@polkadex/ux";
import { Column } from "@tanstack/react-table";
import classNames from "classnames";

interface FacetedFilterProps<TData, TValue> {
  column: Column<TData, TValue> | undefined;
  title?: string;
  withoutBorder?: boolean;
  values: string[];
}
export const FacetedFilter = <TData, TValue>({
  column,
  title,
  values,
  withoutBorder,
}: FacetedFilterProps<TData, TValue>) => {
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  return (
    <FilterGroup>
      {/* eslint-disable-next-line */}
      {/* @ts-ignore */}
      <FilterGroup.Root>
        <FilterGroup.Trigger
          className={classNames(withoutBorder && "border-0")}
        >
          <FilterGroup.Title>
            <FilterGroup.Icon />
            {title}
          </FilterGroup.Title>
          <FilterGroup.Filters maxItems={1}>
            {values
              ?.filter((value) => selectedValues.has(value))
              .map((v) => {
                return (
                  <Typography.Text
                    key={v}
                    size="xs"
                    className="bg-level-1 rounded-md py-1 px-2"
                  >
                    {v}
                  </Typography.Text>
                );
              })}
          </FilterGroup.Filters>
        </FilterGroup.Trigger>
      </FilterGroup.Root>
      {/* eslint-disable-next-line */}
      {/* @ts-ignore */}
      <FilterGroup.Content>
        {values.map((v) => {
          const isSelected = selectedValues.has(v);
          return (
            <FilterGroup.Item
              key={v}
              checked={isSelected}
              onClick={() => {
                if (isSelected) selectedValues.delete(v);
                else selectedValues.add(v);
                column?.setFilterValue(
                  selectedValues.size ? Array.from(selectedValues) : undefined
                );
              }}
            >
              {v}
            </FilterGroup.Item>
          );
        })}
        {!!selectedValues.size && (
          <FilterGroup.Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              column?.setFilterValue(undefined);
            }}
          >
            Clear filter
          </FilterGroup.Button>
        )}
      </FilterGroup.Content>
    </FilterGroup>
  );
};
