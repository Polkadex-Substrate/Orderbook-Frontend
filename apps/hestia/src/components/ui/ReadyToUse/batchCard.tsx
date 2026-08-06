import { Token, Tokens, Typography } from "@mitrabook/ux";
import classNames from "classnames";

type Icon = keyof typeof Tokens;
export const BatchCard = ({
  icons,
  title,
  description,
  maxItems = 2,
}: {
  icons: Icon[];
  title: string;
  description?: string;
  maxItems?: number;
}) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center relative">
        {icons.length > maxItems && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-level-5 border border-primary absolute bottom-0 -right-2">
            <Typography.Text
              size="2xs"
              bold
              className="whitespace-nowrap"
              appearance="primary"
            >
              +{icons.length - maxItems}
            </Typography.Text>
          </div>
        )}
        {icons.length &&
          icons
            .slice(0, maxItems)
            .map((v, i) => (
              <Token
                key={v}
                name={v}
                size="md"
                className={classNames(
                  "p-0.5 rounded-full border border-secondary bg-level-4 shadow-md",
                  i > 0 && "-ml-4"
                )}
              />
            ))}
      </div>
      <div className="flex flex-col text-left gap-0.5">
        <Typography.Text>{title}</Typography.Text>
        {description && (
          <Typography.Text
            appearance="primary"
            size="xs"
            className="whitespace-nowrap"
          >
            {description}
          </Typography.Text>
        )}
      </div>
    </div>
  );
};
