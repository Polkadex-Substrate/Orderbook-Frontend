import { Fragment, forwardRef, useMemo } from "react";
import { Dropdown, Typography } from "@mitra/ux";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import {
  useSettingsProvider,
  marketCarouselValues,
} from "@orderbook/core/providers/public/settings";
import classNames from "classnames";
import Link from "next/link";
import { RiLifebuoyLine } from "@remixicon/react";
import { useWindowSize } from "usehooks-ts";

import { Markets } from "./markets";

export const Footer = forwardRef<HTMLDivElement, { marketsActive?: boolean }>(
  ({ marketsActive = false }, ref) => {
    const { marketCarousel, onChangeMarketCarousel } = useSettingsProvider();

    const { width } = useWindowSize();
    const { connected } = useNativeApi();

    const mobileView = useMemo(() => width <= 640, [width]);

    return (
      <Fragment>
        <footer
          ref={ref}
          className={classNames(
            "md:grid md:grid-flow-col-dense md:grid-cols-2 border-y border-primary w-full bg-level-0",
            !mobileView && "fixed bottom-0 left-0"
          )}
        >
          {marketsActive ? (
            <div className="col-span-4 flex flex-auto">
              <div className="border-r bg-level-2 px-2 border-secondary">
                <Dropdown>
                  <Dropdown.Trigger className="items-center inline-flex opacity-50 transition-opacity ease-out duration-300 hover:opacity-100 w-full">
                    <Typography.Text>{marketCarousel}</Typography.Text>
                    <Dropdown.Icon />
                  </Dropdown.Trigger>
                  <Dropdown.Content>
                    {marketCarouselValues.map((value, i) => (
                      <Dropdown.Item
                        onClick={() => onChangeMarketCarousel(value)}
                        key={i}
                      >
                        <Typography.Text className="text-left block w-full">
                          {value}
                        </Typography.Text>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Content>
                </Dropdown>
              </div>
              <Markets favorite={marketCarousel === "Favourite"} />
            </div>
          ) : (
            <div />
          )}
          <div className="col-span-1 flex flex-1 gap-3 bg-level-1 px-2 py border-l border-secondary w-full justify-end">
            <div className="flex items-center gap-1">
              <div
                className={classNames(
                  "w-2 h-2 rounded-full ",
                  connected ? "bg-success-base" : "bg-attention-base"
                )}
              />
              <Typography.Text>
                {connected ? "Connected" : "Connecting"}
              </Typography.Text>
            </div>
            <Typography.Text appearance="primary">
              <Link
                href="https://discord.com/invite/Uvua83QAzk"
                target="_blank"
              >
                <RiLifebuoyLine className="h-3 w-3 inline-block mr-1" />
                Help & Support
              </Link>
            </Typography.Text>
          </div>
        </footer>
      </Fragment>
    );
  }
);

Footer.displayName = "Footer";
