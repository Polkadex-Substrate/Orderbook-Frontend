import { PropsWithChildren } from "react";
import { Typography } from "@mitra/ux";

export const GenericInfoCard = ({
  label,
  children,
}: PropsWithChildren<{
  label: string;
}>) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <Typography.Text appearance="primary">{label}</Typography.Text>
      <Typography.Text>{children}</Typography.Text>
    </div>
  );
};
