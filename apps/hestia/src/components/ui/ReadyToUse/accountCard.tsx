import classNames from "classnames";
import { ElementType, Fragment, PropsWithChildren } from "react";
import { Copy, Typography, truncateString, Icons, Icon } from "@mitra/ux";
import { getExtensionIcon } from "@polkadot-cloud/assets/extensions";

type WalletCardProps = {
  name?: string;
  address: string;
  onClick?: () => void;
  withIcon?: boolean;
  hoverable?: boolean;
  present?: boolean;
  addressLength?: number;
  source?: string;
  largeText?: boolean;
};

const AccountCard = ({
  name,
  address,
  onClick,
  withIcon = true,
  hoverable = true,
  addressLength = 12,
  source,
  largeText,
  children,
}: PropsWithChildren<WalletCardProps>) => {
  const shortAddress = truncateString(address, addressLength);

  const IconComponent = getExtensionIcon(source as string) as ElementType;

  const props = onClick && {
    role: "Button",
    onClick,
  };

  return (
    <div
      {...props}
      className={classNames(
        "flex-1 flex items-center gap-3 justify-between rounded-lg cursor-pointer",
        hoverable && "p-3 hover:bg-level-1 duration-300 transition-colors"
      )}
    >
      <div className="flex justify-between items-center gap-1">
        <div className="flex items-center gap-2 ">
          {withIcon && (
            <Fragment>
              {IconComponent ? (
                <Icon
                  size="lg"
                  className="border border-primary rounded-full p-2"
                >
                  <IconComponent />
                </Icon>
              ) : (
                <div className="flex items-center justify-center w-9 h-9 p-1 bg-level-3 rounded-full">
                  <Icons.Avatar />
                </div>
              )}
            </Fragment>
          )}
          <div className="flex flex-col">
            <Typography.Text bold size={largeText ? "lg" : "sm"}>
              {name}
            </Typography.Text>
            <div className="flex items-center gap-1 text-primary">
              <Copy value={address} />
              <Typography.Text appearance="primary">
                {shortAddress}
              </Typography.Text>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

const Inverted = ({
  name,
  address,
  onClick,
  withIcon = true,
  hoverable = true,
  present = true,
  addressLength = 8,
  children,
}: PropsWithChildren<WalletCardProps>) => {
  const shortAddress = truncateString(address, addressLength);

  const props = onClick && {
    role: "Button",
    onClick,
  };

  return (
    <div
      {...props}
      className={classNames(
        "flex-1 flex items-center gap-3 justify-between rounded-lg cursor-pointer",
        hoverable && "p-3 hover:bg-level-2 duration-300 transition-colors"
      )}
    >
      <div className="flex justify-between items-center gap-1">
        <div className="flex items-center gap-2">
          {withIcon && (
            <div className="flex items-center justify-center w-9 h-9 p-1 bg-level-3 rounded-full">
              <Icons.Avatar />
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <Copy value={address} className="text-primary" />
              <Typography.Text bold size="lg">
                {shortAddress}
              </Typography.Text>
            </div>
            {present ? (
              <Typography.Text appearance="primary">{name}</Typography.Text>
            ) : (
              <Typography.Text
                appearance="attention"
                size="xs"
                bold
                className="px-1 py-0.5 rounded-md bg-attention-base bg-opacity-20 w-fit"
              >
                Not present
              </Typography.Text>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

AccountCard.Inverted = Inverted;

export { AccountCard };
