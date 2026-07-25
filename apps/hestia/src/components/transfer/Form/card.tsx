"use client";

import { Dropdown, Typography } from "@mitra/ux";
import classNames from "classnames";
import { PropsWithChildren, useRef } from "react";
import { useResizeObserver } from "usehooks-ts";

import { SwitchType } from "@/hooks";
export const Card = ({
  label,
  title,
  active,
  children,
  dropdown,
  onChangeDirection,
}: PropsWithChildren<{
  label: string;
  title: string;
  active?: boolean;
  dropdown?: boolean;
  onChangeDirection?: (e: SwitchType) => void;
}>) => {
  const ref = useRef<HTMLDivElement>(null);
  const { width = 0 } = useResizeObserver({
    ref,
    box: "border-box",
  });
  return dropdown ? (
    <div
      ref={ref}
      className={classNames(
        "flex-1 flex flex-col border border-x-primary border-y-transparent rounded-sm w-full transition-colors duration-300",
        active && "bg-level-1 border-secondary"
      )}
    >
      <Dropdown>
        <Dropdown.Trigger className="pr-5" superpositionTrigger>
          <div className="flex flex-col text-left gap-1 p-5">
            <Typography.Text size="xs" appearance="primary">
              {label}
            </Typography.Text>
            <Typography.Text size="xl">{title}</Typography.Text>
          </div>
          <Dropdown.Icon />
        </Dropdown.Trigger>
        <Dropdown.Content sideOffset={-1} style={{ width }}>
          <Dropdown.Item onClick={() => onChangeDirection?.("deposit")}>
            Trading Account
          </Dropdown.Item>
          <Dropdown.Item onClick={() => onChangeDirection?.("transfer")}>
            Another Funding Account
          </Dropdown.Item>
        </Dropdown.Content>
        <Dropdown.Overlay />
      </Dropdown>
      {children}
    </div>
  ) : (
    <div
      className={classNames(
        "flex-1 flex flex-col border border-x-primary border-y-transparent rounded-sm w-full transition-colors duration-300",
        active && "bg-level-1 border-secondary"
      )}
    >
      <div ref={ref} className="flex flex-col gap-1 p-5">
        <Typography.Text size="xs" appearance="primary">
          {label}
        </Typography.Text>
        <Typography.Text size="xl">{title}</Typography.Text>
      </div>
      {children}
    </div>
  );
};
