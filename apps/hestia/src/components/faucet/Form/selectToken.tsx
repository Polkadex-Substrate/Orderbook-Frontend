"use client";

import { Typography, Token, TokenAppearance, Button, Dropdown } from "@polkadex/ux";
import { RiArrowDownSLine } from "@remixicon/react";
import { PropsWithChildren } from "react";
import { useMeasure } from "react-use";

export type FaucetToken = {
  id: string;
  ticker: string;
  name: string;
};

const SelectToken = ({
  selected,
  children,
}: PropsWithChildren<{
  selected?: FaucetToken;
}>) => {
  const [ref, bounds] = useMeasure<HTMLButtonElement>();

  return (
    <Dropdown>
      <Dropdown.Trigger asChild ref={ref}>
        <Button.Outline
          asChild
          type="button"
          appearance="quaternary"
          className="gap-1 px-3 py-7 justify-between w-full cursor-pointer"
        >
          <div>
            <div className="flex items-center gap-2">
              {selected ? (
                <Token
                  name={selected.ticker}
                  size="md"
                  appearance={selected.id as TokenAppearance}
                  className="rounded-full border border-primary"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-level-5" />
              )}
              <Typography.Text size="lg" bold>
                {selected?.ticker ?? "Select token"}
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

const TokenCard = ({
  token,
  onSelect,
}: {
  token: FaucetToken;
  onSelect: (token: FaucetToken) => void;
}) => {
  return (
    <Dropdown.Item onSelect={() => onSelect(token)}>
      <div className="flex items-center gap-3 rounded-md w-full">
        <Token
          name={token.ticker}
          size="sm"
          appearance={token.id as TokenAppearance}
          className="rounded-full border border-primary"
        />
        <div className="flex flex-col">
          <Typography.Text bold>{token.ticker}</Typography.Text>
          <Typography.Text size="xs" appearance="primary">
            {token.name}
          </Typography.Text>
        </div>
      </div>
    </Dropdown.Item>
  );
};

SelectToken.Card = TokenCard;
export { SelectToken };
