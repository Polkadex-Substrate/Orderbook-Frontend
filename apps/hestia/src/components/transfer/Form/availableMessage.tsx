"use client";

import { RiInformation2Line } from "@remixicon/react";
import { Icon, Typography } from "@mitrabook/ux";

export const AvailableMessage = () => {
  return (
    <div className="flex gap-2 flex-1">
      <Icon size="xs" className="bg-info-base rounded-md">
        <RiInformation2Line className="w-full h-full" />
      </Icon>
      <Typography.Text className="self-center whitespace-nowrap">
        All trading accounts
      </Typography.Text>
    </div>
  );
};
