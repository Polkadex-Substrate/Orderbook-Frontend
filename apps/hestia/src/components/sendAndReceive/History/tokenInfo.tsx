import { Typography, TokenAppearance, Token } from "@polkadex/ux";
import classNames from "classnames";

export const TokenInfo = ({
  ticker = "",
  ready,
  amount,
}: {
  ticker?: string;
  ready: boolean;
  amount: string;
}) => {
  return (
    <div className="flex items-center gap-3">
      <Token
        name={ticker}
        size="md"
        className="p-0.5 rounded-full border border-primary max-sm:hidden"
        appearance={ticker as TokenAppearance}
      />
      <div className="flex flex-col">
        <Typography.Text size="sm">
          {amount} {ticker}
        </Typography.Text>
        <div className="flex items-center gap-1">
          <div
            className={classNames(
              "w-1.5 h-1.5 rounded-full",
              ready ? "bg-success-base" : "bg-attention-base"
            )}
          />
          <Typography.Text
            appearance={ready ? "success" : "attention"}
            size="xs"
          >
            {ready ? "Completed" : "Pending"}
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};
