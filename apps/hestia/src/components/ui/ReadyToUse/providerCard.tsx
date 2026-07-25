"use client";

import classNames from "classnames";
import { getExtensionIcon } from "@polkadot-cloud/assets/extensions";
import { ElementType } from "react";
import { Button, Typography } from "@mitra/ux";

export const ProviderCard = ({
  title,
  action,
  installed = true,
  icon,
  href,
}: {
  title: string;
  action: () => void;
  icon: string;
  installed?: boolean;
  href?: string;
}) => {
  const IconComponent = getExtensionIcon(icon) as ElementType;
  return (
    <div
      className={classNames(
        "flex justify-between items-center gap-3 px-4 py-3.5 rounded-md",
        installed && "hover:bg-level-1 duration-300 transition-colors"
      )}
      role="button"
      onClick={installed ? action : undefined}
    >
      <div className="flex justify-between items-center gap-3">
        <div className="w-5 h-5">
          <IconComponent />
        </div>
        <Typography.Text appearance={installed ? "base" : "secondary"}>
          {title}
        </Typography.Text>
      </div>
      {!installed && (
        <Button.Light asChild size="xs">
          <a href={`//${href}`} target="_blank" rel="noreferrer">
            Setup wallet
          </a>
        </Button.Light>
      )}
    </div>
  );
};
