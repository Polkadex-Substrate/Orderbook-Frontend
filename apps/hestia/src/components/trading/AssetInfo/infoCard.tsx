import { PropsWithChildren } from "react";
import { Typography } from "@mitra/ux";

export const InfoCard = ({
  label,
  children,
}: PropsWithChildren<{
  label: string;
}>) => {
  const isString = typeof children === "string";
  return (
    <div className="flex items-center justify-between gap-3">
      <Typography.Text appearance="primary">{label}</Typography.Text>
      {isString ? (
        <Typography.Text className="text-right">{children}</Typography.Text>
      ) : (
        children
      )}
    </div>
  );
};
