import { Typography, typeofChildren } from "@mitra/ux";
import { PropsWithChildren } from "react";

export const ResponsiveCard = ({
  children,
  label,
}: PropsWithChildren<{ label: string }>) => {
  const isString = typeofChildren(children);
  return (
    <div className="flex items-center justify-between gap-2">
      <Typography.Text appearance="primary">{label}</Typography.Text>
      {isString ? <Typography.Text>{children}</Typography.Text> : children}
    </div>
  );
};
