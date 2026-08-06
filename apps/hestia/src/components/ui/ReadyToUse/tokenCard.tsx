import { Token, Typography, TokenAppearance } from "@polkadex/ux";
import { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";
import { useWindowSize } from "usehooks-ts";

interface Props extends ComponentProps<"div"> {
  icon: string;
  ticker: string;
  tokenName: string;
}
export const TokenCard = ({
  icon,
  ticker,
  tokenName,
  className,
  ...props
}: Props) => {
  const { width } = useWindowSize();
  return (
    <div className={twMerge("flex items-center gap-3", className)} {...props}>
      <Token
        name={icon}
        size={width <= 600 ? "xs" : "md"}
        className="p-0.5 rounded-full border border-primary max-sm:w-5 max-sm:h-5"
        appearance={icon as TokenAppearance}
      />
      <div className="flex flex-col gap-0.5">
        <Typography.Text>{ticker}</Typography.Text>
        <Typography.Text
          appearance="primary"
          size="xs"
          className="whitespace-nowrap lowercase first-letter:uppercase max-sm:hidden"
        >
          {tokenName}
        </Typography.Text>
      </div>
    </div>
  );
};
