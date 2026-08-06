import * as Icons from "@remixicon/react";
import { Typography } from "@mitrabook/ux";
import classNames from "classnames";
import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

interface Props extends LinkProps {
  newBadge?: boolean;
  hasUpdate?: boolean;
  icon: keyof typeof Icons;
}
export const Card = ({
  icon,
  children,
  newBadge,
  href,
  ...props
}: PropsWithChildren<Props>) => {
  const path = usePathname();
  const IconComponent = Icons[icon];

  const active = href.toString().includes(path);
  return (
    <Link
      href={href}
      {...props}
      className="flex items-center gap-1 font-medium justify-between py-3 px-4 hover:bg-level-2 transition-colors duration-300"
    >
      <div
        className={classNames(
          "flex items-center gap-3",
          active ? "opacity-100" : "opacity-40"
        )}
      >
        <IconComponent className="w-4 h-4 opacity-50" />
        <Typography.Text className="whitespace-nowrap">
          {children}
        </Typography.Text>
      </div>
      {newBadge && (
        <div className="p-0.5 bg-primary-base rounded-sm h-fit w-fit self-center text-xs">
          New
        </div>
      )}
    </Link>
  );
};
