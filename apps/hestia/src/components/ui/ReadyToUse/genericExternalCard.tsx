import { PropsWithChildren } from "react";
import { Icon, Typography } from "@mitrabook/ux";
import classNames from "classnames";

import { Icons } from "..";

export const GenericExternalCard = ({
  icon,
  href,
  disabled,
  title,
  onClick,
  children,
  ...props
}: PropsWithChildren<{
  icon?: keyof typeof Icons;
  href?: string;
  title: string;
  disabled?: boolean;
  onClick?: () => void;
}>) => {
  const IconComponent = Icons[icon ?? "Bridge"];

  const isString = typeof children === "string";
  const Comp = isString ? "div" : "a";

  const customProps = !isString && {
    href,
    target: "_blank",
    rel: "noreferrer",
  };

  const otherProps = onClick && {
    onClick,
  };
  return (
    <Comp
      className={classNames(
        "group flex items-center justify-between gap-2 rounded-md px-3 py-1.5 border border-primary hover:bg-level-1 duration-300 transition-colors cursor-pointer",
        disabled && "opacity-50 pointer-events-none"
      )}
      {...otherProps}
      {...customProps}
      {...props}
    >
      <div className="flex items-center gap-3">
        <div className="grid place-content-center w-7 h-7 rounded-md bg-level-1">
          <IconComponent className="w-4 h-4 text-primary" />
        </div>
        {title && (
          <Typography.Text
            appearance="primary"
            className="group-hover:text-current duration-300 transition-colors"
          >
            {title}
          </Typography.Text>
        )}
      </div>
      {children || (
        <Icon
          name="Export"
          className="w-3 h-3 text-secondary group-hover:text-current duration-300 transition-colors"
        />
      )}
    </Comp>
  );
};
