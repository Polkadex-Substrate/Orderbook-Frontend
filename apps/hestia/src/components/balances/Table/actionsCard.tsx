import { RiMore2Line } from "@remixicon/react";
import { Button, Dropdown, Typography } from "@mitrabook/ux";
import Link, { LinkProps } from "next/link";

export const ActionsCard = ({
  withdrawLink,
  depositLink,
  tradeLink,
  transferLink,
  hideButton,
}: {
  withdrawLink: LinkProps["href"];
  depositLink: LinkProps["href"];
  tradeLink: LinkProps["href"];
  transferLink: LinkProps["href"];
  hideButton?: boolean;
}) => (
  <div className="flex items-center justify-end gap-2">
    {hideButton ? (
      <Button.Solid asChild size="xs" appearance="secondary">
        <Link href={transferLink}>Transfer</Link>
      </Button.Solid>
    ) : (
      <Button.Solid asChild size="xs" appearance="secondary">
        <Link href={tradeLink}>Trade</Link>
      </Button.Solid>
    )}
    <Dropdown>
      <Dropdown.Trigger className="group">
        <RiMore2Line className="w-6 h-6 text-primary group-hover:text-current transition-colors duration-300" />
      </Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.Item>
          <Typography.Text asChild size="sm">
            <Link href={withdrawLink} target="_blank">
              Withdraw
            </Link>
          </Typography.Text>
        </Dropdown.Item>
        <Dropdown.Item>
          <Typography.Text asChild size="sm">
            <Link href={depositLink} target="_blank">
              Deposit
            </Link>
          </Typography.Text>
        </Dropdown.Item>
        {!hideButton && (
          <Dropdown.Item>
            <Typography.Text asChild size="sm">
              <Link href={transferLink}>Transfer</Link>
            </Typography.Text>
          </Dropdown.Item>
        )}
      </Dropdown.Content>
    </Dropdown>
  </div>
);
