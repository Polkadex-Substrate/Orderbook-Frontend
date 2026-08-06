"use client";

import { Button, Dropdown, Icons, Typography } from "@polkadex/ux";
import Link from "next/link";
import { PropsWithChildren } from "react";

export const Balance = ({
  baseTicker,
  children,
}: PropsWithChildren<{ baseTicker: string }>) => {
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
                  pathname: "/send-and-receive",
                  query: {
                    type: "withdraw",
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
                  pathname: "/send-and-receive",
                }}
              >
                Deposit
              </Link>
            </Typography.Text>
          </Dropdown.Item>
          <Dropdown.Item>
            <Typography.Text asChild size="sm">
              <Link href={`/transfer/${baseTicker}?type=transfer`}>
                Transfer
              </Link>
            </Typography.Text>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown>
    </div>
  );
};
