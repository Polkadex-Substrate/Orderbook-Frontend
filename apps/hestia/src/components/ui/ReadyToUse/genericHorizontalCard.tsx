import { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import { Icon, Loading, Typography } from "@polkadex/ux";
import type { IconsProps } from "@polkadex/ux";
import classNames from "classnames";

import { ErrorMessage } from ".";

import Badge from "@/components/ui/Temp/badge";

interface GenericHorizontalCardProps extends ComponentPropsWithoutRef<"div"> {
  title: string;
  icon: IconsProps;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
  label?: string;
}
export const GenericHorizontalCard = ({
  title,
  icon,
  children,
  loading,
  error,
  disabled,
  label,
  ...props
}: PropsWithChildren<GenericHorizontalCardProps>) => {
  const isStringType = typeof children === "string";

  return (
    <Loading.Spinner active={!!loading}>
      <div
        {...props}
        role="button"
        className={classNames(
          "flex flex-col gap-3 group cursor-pointer",
          disabled && "opacity-40 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between p-2.5 rounded-md border border-primary group-hover:bg-level-1 duration-300 transition-colors">
          <div className="flex items-center gap-2">
            <Icon
              name={icon}
              className="text-primary group-hover:text-current transition-colors duration-300 w-6 h-6"
            />
            <Typography.Text
              appearance="primary"
              className="group-hover:text-current transition-colors duration-300"
            >
              {title}
            </Typography.Text>
            {label && (
              <Badge>
                <Typography.Text size="2xs" className="px-0.5">
                  {label}
                </Typography.Text>
              </Badge>
            )}
          </div>
          {isStringType ? (
            <div className="bg-secondary-base text-sm px-2 py-1 rounded-sm">
              {children}
            </div>
          ) : (
            children
          )}
        </div>
        {error && !loading && <ErrorMessage>{error}</ErrorMessage>}
      </div>
    </Loading.Spinner>
  );
};
