import { Typography, TokenAppearance, Token } from "@polkadex/ux";
import classNames from "classnames";

import { CrossChainTxStatus } from "@orderbook/core/index";

const STATUS_CONFIG: Record<
  CrossChainTxStatus,
  { dot: string; text: string; appearance: "success" | "attention" | "danger" }
> = {
  COMPLETED: { dot: "bg-success-base", text: "Completed", appearance: "success" },
  PENDING: { dot: "bg-attention-base", text: "Pending", appearance: "attention" },
  TIMEDOUT: { dot: "bg-danger-base", text: "Timed Out", appearance: "danger" },
};

export const TokenInfo = ({
  ticker = "",
  status,
  amount,
}: {
  ticker?: string;
  status: CrossChainTxStatus;
  amount: string;
}) => {
  const { dot, text, appearance } = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

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
          <div className={classNames("w-1.5 h-1.5 rounded-full", dot)} />
          <Typography.Text appearance={appearance} size="xs">
            {text}
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};
