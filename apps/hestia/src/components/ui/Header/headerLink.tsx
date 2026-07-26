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
      // Enabled links use textBase (#FFFFFF) rather than the muted #8B909A.
      // Primary nav is the app's main wayfinding: it was rendering dimmer than
      // the body copy it sits above, which reads as disabled. Genuinely
      // disabled items keep the muted colour AND the opacity below, so the
      // enabled/disabled distinction gets clearer, not weaker.
      appearance={disabled ? "primary" : "base"}
      className={classNames(
        // Tailwind sizes are rem-based, so the root-font scaling in
        // globals.scss already grows these on wide screens. It is not enough
        // on its own: nav links start at the smallest step (text-sm), so they
        // stay the smallest thing on a 4K display even after scaling. This
        // moves them up a step at the same 1680px threshold the root scaling
        // uses, so there is a single breakpoint to reason about.
        "min-[1680px]:text-base",
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
    {/* opacity-50 put these well below the plain links beside them, so the
        same menu bar had two different text brightnesses for no reason. */}
    <Dropdown.Trigger className="gap-2 items-center inline-flex opacity-80 transition-opacity ease-out duration-300 hover:opacity-100 w-full">
      {/* Matches Single above so the dropdown triggers do not end up smaller
          than the plain links sitting beside them. */}
      <Typography.Text className="text-sm min-[1680px]:text-base whitespace-nowrap">
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
            className="text-left flex items-center gap-2 text-sm min-[1680px]:text-base w-full"
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
