import { Typography } from "@mitra/ux";
import { PropsWithChildren } from "react";

export const ResponsiveCard = ({
  children,
  label,
}: PropsWithChildren<{ label: string }>) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <Typography.Text appearance="primary">{label}</Typography.Text>
      <Typography.Text>{children}</Typography.Text>
    </div>
  );
};
