import { Skeleton, Typography } from "@mitrabook/ux";
import classNames from "classnames";
import React, { PropsWithChildren } from "react";

export const OverviewCard = ({
  label,
  side = "vertical",
  children,
  loading = false,
}: PropsWithChildren<{
  label: string;
  side?: "horizontal" | "vertical";
  loading?: boolean;
}>) => {
  const isString = typeof children === "string";
  return (
    <div
      className={classNames(
        "flex",
        side === "horizontal"
          ? "justify-between items-center gap-4 flex-row-reverse"
          : "flex-col gap-1"
      )}
    >
      <Skeleton loading={loading} className="flex-none w-24 h-4 max-w-32">
        {isString ? (
          <Typography.Text bold>{children}</Typography.Text>
        ) : (
          children
        )}
      </Skeleton>
      <Typography.Text appearance="primary" size="sm">
        {label}
      </Typography.Text>
    </div>
  );
};
