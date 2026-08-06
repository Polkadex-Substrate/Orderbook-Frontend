"use client";

import { Dropdown, Typography } from "@polkadex/ux";
import { DecimalSize } from "@orderbook/core/hooks";
import { parseScientific } from "@orderbook/core/helpers";

import { FilterCard } from "./filterCard";

type Props = {
  selectedDecimal: number;
  decimalSizes: DecimalSize[];
  onChangeDecimal: (v: DecimalSize) => void;
  filterBy: string;
  onChangeFilterBy: (v: string) => void;
};
export const Header = ({
  selectedDecimal,
  decimalSizes,
  onChangeDecimal,
  filterBy,
  onChangeFilterBy,
}: Props) => {
  return (
    <div className="flex items-center justify-between p-2">
      <Typography.Heading
        type="h3"
        className="text-sm font-medium text-primary"
      >
        Orderbook
      </Typography.Heading>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <FilterCard
            icon="Ask"
            active={filterBy === "OrderAsc"}
            action={() => onChangeFilterBy("OrderAsc")}
          />
          <FilterCard
            icon="AskAndBid"
            active={filterBy === "Order"}
            action={() => onChangeFilterBy("Order")}
          />
          <FilterCard
            icon="Bid"
            active={filterBy === "OrderDesc"}
            action={() => onChangeFilterBy("OrderDesc")}
          />
        </div>
        <Dropdown>
          <Dropdown.Trigger className="gap-1 items-center opacity-50 transition-opacity ease-out duration-300 hover:opacity-100 w-full">
            <Typography.Text size="xs">
              {parseScientific(selectedDecimal.toString())}
            </Typography.Text>
            <Dropdown.Icon />
          </Dropdown.Trigger>
          <Dropdown.Content>
            {decimalSizes
              .map((v) => v.size.toString())
              .map((value, i) => (
                <Dropdown.ItemCheckbox
                  key={i}
                  onSelect={() =>
                    onChangeDecimal(
                      decimalSizes.find(
                        (v) => v.size.toString() === value
                      ) as DecimalSize
                    )
                  }
                  checked={selectedDecimal === +value}
                >
                  {parseScientific(value)}
                </Dropdown.ItemCheckbox>
              ))}
          </Dropdown.Content>
        </Dropdown>
      </div>
    </div>
  );
};
