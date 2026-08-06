import { ComponentProps } from "react";
import { HoverCard, Typography, typeofChildren } from "@polkadex/ux";
import classNames from "classnames";
import { twMerge } from "tailwind-merge";
import { RiInformationFill } from "@remixicon/react";

interface Props extends ComponentProps<"div"> {
  label: string;
  tooltip?: string;
  defaultOpen?: boolean;
}
export const GenericHorizontalItem = ({
  label,
  tooltip,
  defaultOpen,
  children,
  className,
  ...props
}: Props) => {
  const isString = typeofChildren(children);
  return (
    <div
      className={twMerge(
        classNames(
          "flex items-cneter justify-between gap-2 px-3 py-3 whitespace-nowrap"
        ),
        className
      )}
      {...props}
    >
      {tooltip ? (
        <HoverCard defaultOpen={defaultOpen}>
          <HoverCard.Trigger>
            <div className="flex items-center gap-1">
              <RiInformationFill className="w-3 h-3 text-actionInput" />
              <Typography.Text appearance="primary">{label}</Typography.Text>
            </div>
          </HoverCard.Trigger>
          <HoverCard.Content className="max-w-[300px] p-4" side="left">
            <Typography.Paragraph
              size="sm"
              appearance="primary"
              className="leading-5"
            >
              {tooltip}
            </Typography.Paragraph>
          </HoverCard.Content>
        </HoverCard>
      ) : (
        <Typography.Text appearance="primary">{label}</Typography.Text>
      )}
      {isString ? <Typography.Text>{children}</Typography.Text> : children}
    </div>
  );
};
