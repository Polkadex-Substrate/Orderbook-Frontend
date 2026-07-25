import { Typography } from "@mitra/ux";
import Link from "next/link";

export const MarketCard = ({
  pair,
  market,
  change,
  price,
  positive = false,
}: {
  pair: string;
  market: string;
  change: number;
  price: number;
  positive?: boolean;
}) => {
  const marketChange = `${positive ? "+" : "-"} ${change} %`;
  const marketName = `${pair}/${market}`;
  return (
    <Link
      href={`/trading/${marketName.replace("/", "")}`}
      className="flex gap-2 ml-2"
    >
      <Typography.Text size="xs" bold>
        {marketName}
      </Typography.Text>
      <Typography.Text
        bold
        size="xs"
        appearance={positive ? "success" : "danger"}
        className="whitespace-nowrap"
      >
        {marketChange}
      </Typography.Text>
      <Typography.Text size="xs" bold appearance="secondary">
        {price}
      </Typography.Text>
    </Link>
  );
};
