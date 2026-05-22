"use client";
import { Typography, Chain, Button, Dropdown } from "@polkadex/ux";
import { RiArrowDownSLine } from "@remixicon/react";
import { PropsWithChildren, useState } from "react";
import { useMeasure } from "react-use";

const SelectNetwork = ({
  name = "",
  icon = "",
  children,
}: PropsWithChildren<{
  name?: string;
  icon?: string;
}>) => {
  const [state, setState] = useState(false);
  const [ref, bounds] = useMeasure<HTMLButtonElement>();
  return (
    <Dropdown>
      <Dropdown.Trigger asChild ref={ref}>
        <Button.Outline
          asChild
          type="button"
          appearance="quaternary"
          className="gap-1 px-2 py-7 justify-between w-full cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setState(!state);
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Chain name={icon} />
              <Typography.Text size="lg" bold>
                {name ?? "Select"}
              </Typography.Text>
            </div>
            <RiArrowDownSLine className="w-4 h-4" />
          </div>
        </Button.Outline>
      </Dropdown.Trigger>
      <Dropdown.Content
        className="max-h-[250px] hover:overflow-auto overflow-hidden"
        style={{ minWidth: bounds.width + 20 }}
        sideOffset={0}
      >
        {children}
      </Dropdown.Content>
    </Dropdown>
  );
};

export const Card = ({
  icon,
  value,
  onSelect,
}: {
  icon: string;
  value: string;
  onSelect: () => void;
}) => {
  return (
    <Dropdown.Item onSelect={onSelect}>
      <div className="flex items-center gap-2 rounded-md w-full">
        <Chain name={icon} size="sm" />
        <Typography.Text>{value}</Typography.Text>
      </div>
    </Dropdown.Item>
  );
};

SelectNetwork.Card = Card;
export { SelectNetwork };
