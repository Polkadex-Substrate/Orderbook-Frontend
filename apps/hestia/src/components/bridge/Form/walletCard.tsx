import {
  Button,
  Typography,
  truncateString,
  typeofChildren,
  truncateNames,
} from "@polkadex/ux";
import { ComponentProps, useMemo } from "react";
import { RiWalletLine } from "@remixicon/react";

interface Props extends ComponentProps<typeof Button.Outline> {
  name?: string;
}
export const WalletCard = ({ name = "", children, ...props }: Props) => {
  const isString = useMemo(() => typeofChildren(children), [children]);
  const shortAddress = useMemo(
    () => isString && typeof children === "string" && truncateString(children),
    [children, isString]
  );
  const shortName = useMemo(() => truncateNames(name, 15), [name]);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <RiWalletLine className="w-3.5 h-3.5 text-actionInput" />
        {isString ? (
          <div className="flex items-center gap-1">
            {name && <Typography.Text>{shortName}</Typography.Text>}
            <Typography.Text appearance={name ? "primary" : "base"}>
              {shortName ? `(${shortAddress})` : shortAddress}
            </Typography.Text>
          </div>
        ) : (
          children
        )}
      </div>
      <Button.Solid appearance="secondary" size="xs" {...props}>
        Change
      </Button.Solid>
    </div>
  );
};
