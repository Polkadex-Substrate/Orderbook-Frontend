import { Typography } from "@mitra/ux";
import classNames from "classnames";
import { ComponentPropsWithoutRef, Fragment, PropsWithChildren } from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";

import { Icons } from "..";

type Props = {
  title: string;
  description?: string;
  icon?: keyof typeof Icons;
  disabled?: boolean;
  bold?: boolean;
};
type CardProps = ComponentPropsWithoutRef<"a"> & Props;

export const FundHorizontalCard = ({
  disabled,
  title,
  description,
  children,
  href,
  icon,
  bold = true,
  className,
  ...props
}: PropsWithChildren<CardProps>) => {
  if (href)
    return (
      <Link
        href={href}
        className={twMerge(
          classNames(
            "flex items-center gap-4 p-4 hover:bg-level-1 transition-colors duration-200",
            disabled && "pointer-events-none opacity-40"
          ),
          className
        )}
        {...props}
      >
        <Content
          bold={bold}
          title={title}
          description={description}
          icon={icon}
        >
          {children}
        </Content>
      </Link>
    );
  return (
    <div
      className={twMerge(
        classNames(
          "flex items-center gap-4 p-4 hover:bg-level-1 transition-colors duration-200"
        ),
        className
      )}
    >
      <Content title={title} description={description} icon={icon}>
        {children}
      </Content>
    </div>
  );
};

const Content = ({
  title,
  description,
  icon,
  bold,
  children,
}: PropsWithChildren<Props>) => {
  const IconComponent = Icons[icon ?? "Bridge"];

  return (
    <Fragment>
      <div className="grid place-content-center min-w-[28px] min-h-[28px] w-7 h-7 rounded-md bg-level-2">
        <IconComponent className="w-4 h-4 text-primary" />
      </div>
      <div className="flex flex-col gap-1">
        <Typography.Text bold={bold}>{title}</Typography.Text>
        <div className="flex flex-col gap-2">
          {description && (
            <Typography.Text appearance="primary">
              {description}
            </Typography.Text>
          )}
          {children}
        </div>
      </div>
    </Fragment>
  );
};
