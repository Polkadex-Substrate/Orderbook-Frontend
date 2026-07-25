"use client";

import { Icons, Skeleton, Typography } from "@mitrabook/ux";
import { PropsWithChildren } from "react";
export const InlineAccountCard = ({
  icon,
  children,
  loading,
}: PropsWithChildren<{
  icon?: string;
  loading?: boolean;
}>) => {
  const IconComponent = Icons[icon as keyof typeof Icons] ?? Icons.Wallet;
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex items-center justify-center bg-level-2 w-6 h-6 rounded-md">
        <IconComponent className="w-3 h-3 text-primary" />
      </div>
      <Skeleton loading={loading} className="h-auto max-w-20">
        <Typography.Text>{children}</Typography.Text>
      </Skeleton>
    </div>
  );
};
