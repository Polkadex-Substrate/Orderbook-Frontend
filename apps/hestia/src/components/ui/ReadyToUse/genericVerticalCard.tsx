import classNames from "classnames";
import { PropsWithChildren } from "react";
import { Icon, Loading, Typography } from "@polkadex/ux";
import type { IconsProps } from "@polkadex/ux";

export const GenericVerticalCard = ({
  title,
  icon,
  onSelect,
  loading = false,
  checked,
  disabled,
  children,
}: PropsWithChildren<{
  title: string;
  icon: IconsProps;
  onSelect?: () => void;
  checked?: boolean;
  disabled?: boolean;
  loading?: boolean;
}>) => {
  return (
    <div className="flex-1 flex flex-col">
      <Loading.Spinner active={loading}>
        <div
          role="button"
          onClick={disabled || !onSelect ? undefined : onSelect}
          className={classNames(
            disabled
              ? "opacity-50"
              : " hover:bg-level-1 duration-300 transition-colors",
            "relative flex-1 flex flex-col items-center gap-2 px-3 py-7 rounded-md border border-primary"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8">
              <Icon name={icon} />
            </div>
            <Typography.Text appearance="primary">{title}</Typography.Text>
          </div>
          {children}
          <div
            className={classNames(
              "flex items-center justify-center w-4 h-4 rounded-full absolute top-2 right-2",
              checked ? "bg-primary-base" : "bg-level-4"
            )}
          >
            {checked && <Icon name="Check" className="h-8 w-8" />}
          </div>
        </div>
      </Loading.Spinner>
    </div>
  );
};
