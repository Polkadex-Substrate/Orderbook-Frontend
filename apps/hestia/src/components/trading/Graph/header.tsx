import { Button, Dropdown, Tabs, Typography } from "@polkadex/ux";
import { useResizeObserver } from "usehooks-ts";
import { useMemo, useRef } from "react";
import { RiFullscreenLine, RiScreenshot2Line } from "@remixicon/react";

import { ResolutionString } from "../../../../public/static/charting_library/charting_library.min";

import { supported_resolutions } from "./config";

export const Header = ({
  activeResolution,
  onChangeResolution,
  onChangeFullScreen,
  onScreenshot,
}: {
  activeResolution: string;
  onChangeResolution: (e: ResolutionString) => void;
  onChangeFullScreen: () => void;
  onScreenshot: () => void;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { width = 0 } = useResizeObserver({
    ref,
    box: "border-box",
  });
  const maxWidth = useMemo(() => width > 590, [width]);
  const selectedTime = useMemo(
    () =>
      supported_resolutions.find((v) => v.id === activeResolution)?.description,
    [activeResolution]
  );
  return (
    <div
      ref={ref}
      className="flex gap-2 items-center flex-wrap justify-between border-b border-primary px-3 py-1 bg-level-0"
    >
      <div className="flex items-center gap-3">
        <Typography.Text appearance="secondary">Time</Typography.Text>
        {maxWidth ? (
          <ul className="flex items-center gap-2">
            {supported_resolutions.map((v) => {
              const active = v.id === activeResolution;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => onChangeResolution(v.id as ResolutionString)}
                  >
                    <Typography.Text
                      size="xs"
                      appearance={active ? "primary-base" : "primary"}
                      bold={active}
                    >
                      {v.description}
                    </Typography.Text>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Dropdown>
            <Dropdown.Trigger>
              {selectedTime} <Dropdown.Icon />
            </Dropdown.Trigger>
            <Dropdown.Content>
              {supported_resolutions.map((v) => {
                const active = v.id === activeResolution;
                return (
                  <Dropdown.ItemCheckbox
                    checked={active}
                    key={v.id}
                    onCheckedChange={() =>
                      onChangeResolution(v.id as ResolutionString)
                    }
                  >
                    {v.description}
                  </Dropdown.ItemCheckbox>
                );
              })}
            </Dropdown.Content>
          </Dropdown>
        )}
      </div>
      <div className="flex gap-2">
        <Tabs.List>
          <Tabs.Trigger value="tradingView">TradingView</Tabs.Trigger>
          <Tabs.Trigger value="originalChart" disabled>
            Original Chart
          </Tabs.Trigger>
        </Tabs.List>
        <div className="flex gap-1">
          <Button.Icon
            size="sm"
            className="p-1 text-primary"
            variant="ghost"
            onClick={onScreenshot}
          >
            <RiScreenshot2Line className="w-full h-full" />
          </Button.Icon>
          <Button.Icon
            size="sm"
            className="p-1 text-primary"
            variant="ghost"
            onClick={onChangeFullScreen}
          >
            <RiFullscreenLine className="w-full h-full" />
          </Button.Icon>
        </div>
      </div>
    </div>
  );
};
