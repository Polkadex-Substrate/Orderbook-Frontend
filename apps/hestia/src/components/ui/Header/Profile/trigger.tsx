import { HoverCard, Icons, Typography } from "@polkadex/ux";
import { RiArrowDownSLine } from "@remixicon/react";
import classNames from "classnames";

export const Trigger = ({
  extensionAccountPresent,
  browserAccountName,
  browserAccountPresent,
  extensionAccountName,
  responsive,
}: {
  extensionAccountName: string;
  browserAccountName: string;
  browserAccountPresent: boolean;
  extensionAccountPresent: boolean;
  responsive?: boolean;
}) => {
  const extensionAccount = extensionAccountPresent
    ? extensionAccountName
    : "Wallet not present";

  const browserAccount = browserAccountPresent
    ? `Trading account (${browserAccountName})`
    : "No trading account";

  return (
    <div
      className={classNames(
        "flex items-center  hover:bg-level-1 duration-300 transition-colors",
        responsive ? "w-full" : "border-x border-primary pr-1"
      )}
    >
      <div className="flex items-center justify-center px-2">
        <Icons.Avatar className="w-6 h-6" />
      </div>
      <div
        className={classNames(
          "flex flex-col w-full h-full text-left",
          !browserAccountPresent && "py-2.5"
        )}
      >
        <HoverCard>
          <HoverCard.Trigger>
            <Typography.Text
              size="xs"
              bold
              appearance="primary"
              className="mr-1"
            >
              {extensionAccount}
            </Typography.Text>
          </HoverCard.Trigger>
        </HoverCard>
        {browserAccountPresent && (
          <div
            className={classNames(
              "flex items-center justify-between gap-2 p-1 bg-level-2 rounded-sm w-full",
              responsive && "mb-2"
            )}
          >
            <Typography.Text size="xs" bold className="whitespace-nowrap">
              {browserAccount}
            </Typography.Text>
            <RiArrowDownSLine className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
};
