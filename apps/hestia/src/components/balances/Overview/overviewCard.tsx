import * as Icons from "@remixicon/react";
import { Typography } from "@mitra/ux";
import Link, { LinkProps } from "next/link";
import React, { HTMLAttributeAnchorTarget, PropsWithChildren } from "react";
interface Props extends LinkProps {
  icon: keyof typeof Icons;
  target?: HTMLAttributeAnchorTarget;
}

export const OverviewCard = ({
  icon,
  target,
  children,
  ...props
}: PropsWithChildren<Props>) => {
  const IconComponent = Icons[icon];
  return (
    <Link
      target={target}
      {...props}
      className="flex-1 flex flex-col gap-2 bg-level-1 p-4 rounded-sm transition-colors duration-300 hover:bg-level-2 group:"
    >
      <IconComponent className="w-4 h-4 text-primary" />
      <Typography.Text>{children}</Typography.Text>
    </Link>
  );
};
