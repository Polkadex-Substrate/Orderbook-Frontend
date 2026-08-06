import { Typography } from "@polkadex/ux";
import classNames from "classnames";
import React from "react";

export const StatusCard = ({ status }: { status: string }) => (
  <div className="flex items-center gap-2">
    <div
      className={classNames(
        "w-1.5 h-1.5 rounded-full",
        statusBgColor[status.toUpperCase() as keyof typeof statusBgColor] ??
          "bg-primary-base"
      )}
    />
    <Typography.Text
      size="sm"
      className="first-letter:capitalize lowercase"
      appearance={
        statusColor[status as keyof typeof statusColor] ?? "bg-primary-base"
      }
    >
      {status}
    </Typography.Text>
  </div>
);

const statusBgColor = {
  PENDING: "bg-level-5",
  CONFIRMED: "bg-success-base",
  FAILED: "bg-danger-base",
  READY: "bg-success-base",
  COMPLETED: "bg-success-base",
} as const;

const statusColor = {
  PENDING: "secondary",
  CONFIRMED: "success",
  FAILED: "danger",
  READY: "success",
  COMPLETED: "success",
} as const;
