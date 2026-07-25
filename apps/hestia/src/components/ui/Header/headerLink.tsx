import { Url } from "next/dist/shared/lib/router/router";
import Link from "next/link";
import { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { Accordion, Dropdown, Typography } from "@mitrabook/ux";
import classNames from "classnames";

interface DropdownProps {
  items: {
    href: string;
    label: string;
    svg?: ReactNode;
  }[];
}

const AccordionMenu = ({
  items,
  children,
}: PropsWithChildren<DropdownProps>) => (
  <Accordion type="multiple">
    <Accordion.Item value={children?.toString() ?? ""}>
      <Accordion.Trigger>
        <Typography.Text size="lg" bold>
          {children as string}
        </Typography.Text>
        <Accordion.Icon />
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="flex flex-col gap-3 mt-1">
          {items.map(({ href, label, svg }, i) => (
            <Typography.Text
              key={i}
              appearance="primary"
              size="md"
              asChild
              className={classNames(
                "py-0.5 duration-200 transition-colors hover:text-textBase",
                i === 0 && "mt-2"
              )}
            >
              <Link
                href={href}
                target="_blank"
                className="w-full flex items-center gap-2"
              >
                {svg}
                {label}
              </Link>
            </Typography.Text>
          ))}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion>
);

interface SingleProps extends ComponentProps<"a"> {
  size?: "lg" | "sm";
  disabled?: boolean;
}
const Single = ({
  href,
  size = "sm",
  disabled = false,
  children,
}: PropsWithChildren<SingleProps>) => {
  const largeText = size === "lg";
  return (
    <Typography.Text
      asChild
      size={size}
      bold={largeText}
      appearance={largeText ? "base" : "primary"}
      className={classNames(
        !disabled &&
          "transition-colors ease-out duration-300 hover:text-primary-base",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <Link href={disabled ? "#" : (href as Url)}>{children}</Link>
    </Typography.Text>
  );
};

const DropdownMenu = ({
  items,
  children,
}: PropsWithChildren<DropdownProps>) => (
  <Dropdown>
    <Dropdown.Trigger className="gap-2 items-center inline-flex opacity-50 transition-opacity ease-out duration-300 hover:opacity-100 w-full">
      <Typography.Text className="text-sm whitespace-nowrap">
        {children as string}
      </Typography.Text>
      <Dropdown.Icon />
    </Dropdown.Trigger>
    <Dropdown.Content>
      {items.map(({ href, label, svg }, i) => (
        <Dropdown.Item key={i}>
          <Link
            href={href}
            target="_blank"
            className="text-left flex items-center gap-2 text-sm w-full"
          >
            {svg}
            {label}
          </Link>
        </Dropdown.Item>
      ))}
    </Dropdown.Content>
  </Dropdown>
);
export const HeaderLink = {
  Accordion: AccordionMenu,
  Dropdown: DropdownMenu,
  Single,
};
