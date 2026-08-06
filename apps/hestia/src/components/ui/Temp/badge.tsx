import { Typography } from "@polkadex/ux";
import classNames from "classnames";

export type BadgeProps = React.HTMLAttributes<HTMLDivElement>;

const Badge = ({ children, className }: BadgeProps) => {
  return (
    <div className={classNames("flex items-center", className)}>
      <Typography.Text
        appearance="base"
        size="xs"
        className="bg-primary-base rounded-full px-1"
      >
        {children}
      </Typography.Text>
    </div>
  );
};

export default Badge;
