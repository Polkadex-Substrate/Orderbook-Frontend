"use client";

import { RiCloseLine } from "@remixicon/react";
import { ElementType, useCallback, useEffect, useState } from "react";
import { getExtensionIcon } from "@polkadot-cloud/assets/extensions";
import classNames from "classnames";
import { twMerge } from "tailwind-merge";
import { Interaction, InteractionProps, Spinner, Typography } from "@mitra/ux";

interface AuthorizationProps extends InteractionProps {
  extensionName?: string;
  extensionIcon?: string;
  loadingDescription?: string;
  loading?: boolean;
  onActionCallback: () => void;
  onAction: () => Promise<boolean>;
  onClose?: () => void;
}
export const Authorization = ({
  extensionIcon,
  extensionName,
  onActionCallback,
  onAction,
  onClose,
  className,
  ...props
}: AuthorizationProps) => {
  const [error, setError] = useState(false);
  const IconComponent = getExtensionIcon(
    extensionIcon as string
  ) as ElementType;

  const callbackFn = useCallback(async () => {
    try {
      const success = await onAction();
      if (!success) {
        setError(true);
        return;
      }

      onActionCallback();
    } catch (error) {
      setError(true);
    }
  }, [onAction, onActionCallback]);

  useEffect(() => {
    if (!error) callbackFn();
  }, [callbackFn, error]);

  const errorMessage = `Please authorize your ${extensionName} wallet extension to connect to Orderbook App`;
  return (
    <Interaction
      className={twMerge(classNames("gap-10 w-full", className))}
      {...props}
    >
      <Interaction.Content className="flex flex-col gap-5 items-center text-center">
        {error ? (
          <>
            <div className="max-w-[13rem]">
              <div className="h-20 w-20 bg-level-2 rounded-full p-3 relative shadow-baseShadow">
                {extensionIcon && <IconComponent />}
                <div className="h-6 w-6 p-1 rounded-full bg-danger-base absolute bottom-0 right-0">
                  <RiCloseLine className="w-full h-full" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text bold size="xl">
                Wallet permission issue
              </Typography.Text>
              <Typography.Text appearance="primary">
                Access not granted. Please open the extension, allow access for
                the Orderbook app, and then try again.
              </Typography.Text>
            </div>
          </>
        ) : (
          <>
            <div className="h-20 w-20 bg-level-2 rounded-full p-3 relative shadow-baseShadow">
              {extensionIcon && <IconComponent />}
              <div className="absolute w-full h-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Spinner.Loading />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Typography.Text bold size="xl">
                Waiting for authorization
              </Typography.Text>
              <Typography.Text appearance="primary">
                {errorMessage}
              </Typography.Text>
            </div>
          </>
        )}
      </Interaction.Content>
      <Interaction.Footer>
        <Interaction.Action
          appearance="secondary"
          onClick={async () => await callbackFn()}
        >
          Try again
        </Interaction.Action>
        <Interaction.Close onClick={onClose}>
          Connect other wallet
        </Interaction.Close>
      </Interaction.Footer>
    </Interaction>
  );
};
