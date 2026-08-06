import { ComponentProps } from "react";
import { Typography } from "@polkadex/ux";
import { RiErrorWarningLine } from "@remixicon/react";
import classNames from "classnames";
import { twMerge } from "tailwind-merge";

interface Props extends ComponentProps<"div"> {
  withIcon?: boolean;
}
export const ErrorMessage = ({
  children,
  withIcon = true,
  className,
  ...props
}: Props) => {
  return (
    <div
      className={twMerge(classNames("flex items-center gap-1"), className)}
      {...props}
    >
      {withIcon && <RiErrorWarningLine className="text-danger-base w-4 h-4" />}
      <Typography.Paragraph className="text-danger-base" size="sm">
        {children}
      </Typography.Paragraph>
    </div>
  );
};
