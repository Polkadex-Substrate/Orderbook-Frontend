import { Token, Tokens, Typography, tokenAppearance } from "@mitra/ux";
export const MarketCard = ({
  icon,
  marketName,
  pairIcon,
}: {
  icon: keyof typeof Tokens;
  marketName: string;
  pairIcon: keyof typeof Tokens;
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <div className="w-10 h-10 p-1.5 rounded-full bg-level-0 border border-secondary z-[1]">
          <Token name={icon} />
        </div>
        <div className="-ml-2">
          <Token
            appearance={pairIcon as keyof typeof tokenAppearance}
            name={pairIcon}
            size="sm"
            className="rounded-full"
          />
        </div>
      </div>
      <Typography.Text size="sm">{marketName}</Typography.Text>
    </div>
  );
};
