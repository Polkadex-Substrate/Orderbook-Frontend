import classNames from "classnames";
import { Checkbox, Icon, Typography } from "@polkadex/ux";
import type { IconsProps } from "@polkadex/ux";

export const GenericSelectCard = ({
  title,
  icon,
  checked,
  onChange,
  disabled = false,
}: {
  title: string;
  icon: IconsProps;
  checked?: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) => {
  return (
    <div
      className={classNames(
        "flex items-center justify-between px-4 py-3 rounded-md border border-primary ",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:border-secondary duration-300 transition-colors"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon name={icon} className="w-6 h-6" />
        <Typography.Text appearance="primary">{title}</Typography.Text>
      </div>
      <Checkbox.Solid
        disabled={disabled}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
};
