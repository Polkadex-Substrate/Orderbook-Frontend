"use client";

import { getChainFromTicker } from "@orderbook/core/helpers";
import { Button, Dropdown, Icons, Typography } from "@polkadex/ux";
import Link from "next/link";
import { PropsWithChildren } from "react";

export const Balance = ({
  baseTicker,
  children,
}: PropsWithChildren<{ baseTicker: string }>) => {
  const chainName = getChainFromTicker(baseTicker);
  return (
    <div className=" self-end flex items-center gap-1">
      <Typography.Text size="xs">
        {children} {baseTicker}
      </Typography.Text>
      <Typography.Text size="xs" appearance="primary">
        Available
      </Typography.Text>
      <Dropdown>
        <Dropdown.Trigger asChild>
          <Button.Icon size="2xs" onClick={() => window.alert("...")}>
            <Icons.Exchange />
          </Button.Icon>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item>
            <Typography.Text asChild size="sm">
              <Link
                href={{
                  pathname: "/bridge",
                  query: {
                    from: "Polkadex",
                    to: chainName,
                    asset: baseTicker,
                  },
                }}
              >
                Withdraw
              </Link>
            </Typography.Text>
          </Dropdown.Item>
          <Dropdown.Item>
            <Typography.Text asChild size="sm">
              <Link
                href={{
                  pathname: "/bridge",
                  query: {
                    from: chainName,
                    to: "Polkadex",
                    asset: baseTicker,
                  },
                }}
              >
                Deposit
              </Link>
            </Typography.Text>
          </Dropdown.Item>
          <Dropdown.Item>
            <Typography.Text asChild size="sm">
              <Link href={`/transfer/${baseTicker}`}>Transfer</Link>
            </Typography.Text>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown>
    </div>
  );
};
