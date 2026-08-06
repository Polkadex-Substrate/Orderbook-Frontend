import { Typography } from "@polkadex/ux";
import { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

interface Props extends ComponentProps<"div"> {
  fiatAmount?: string;
}
export const AmountCard = ({ fiatAmount, children, className }: Props) => (
  <div className={twMerge("flex flex-col", className)}>
    <Typography.Text>{children}</Typography.Text>
    {fiatAmount && (
      <Typography.Text appearance="secondary" size="xs">
        ≈ ${fiatAmount}
      </Typography.Text>
    )}
  </div>
);
