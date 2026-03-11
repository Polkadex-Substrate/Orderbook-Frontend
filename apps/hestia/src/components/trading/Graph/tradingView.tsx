import { MutableRefObject, useEffect } from "react";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import classNames from "classnames";
import { getCurrentMarket } from "@orderbook/core/helpers";
import { useMarkets } from "@orderbook/core/index";
import { Spinner } from "@polkadex/ux";

import {
  ChartingLibraryWidgetOptions,
  CustomTimezones,
  IChartingLibraryWidget,
  Timezone,
  widget as Widget,
} from "../../../../public/static/charting_library/charting_library.min";

import { options } from "./config";

export const TVChartContainer = ({
  tvWidget,
  widgetOptions,
  onChartReady,
  isChartReady,
  id,
}: {
  tvWidget: MutableRefObject<IChartingLibraryWidget | undefined>;
  widgetOptions: ChartingLibraryWidgetOptions;
  isChartReady: boolean;
  onChartReady: (v: boolean) => void;
  id: string;
}) => {
  const { list } = useMarkets();

  const currentMarket = getCurrentMarket(list, id);
  const { theme } = useSettingsProvider();

  const isDarkTheme = theme === "dark";
  useEffect(() => {
    if (!currentMarket?.id) return;

    onChartReady(false);
    tvWidget.current = new Widget(widgetOptions);

    tvWidget?.current?.onChartReady &&
      tvWidget?.current?.onChartReady(() => {
        onChartReady(true);
      });

    return () => {
      tvWidget?.current?.remove();
    };
  }, [currentMarket?.id, widgetOptions, tvWidget, onChartReady]);

  useEffect(() => {
    isChartReady &&
      tvWidget?.current?.onChartReady &&
      tvWidget?.current?.onChartReady(() => {
        // Set time zone specific to user

        const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // const timezoneApi = tvWidget.current?.activeChart().getTimezoneApi();
        // const availableTimezones = timezoneApi?.availableTimezones();
        const isValidTimezone = true; // Assume valid since we cant check
        const timezone = (
          isValidTimezone ? localTimezone : "America/Chicago"
        ) as Timezone;

        tvWidget?.current?.activeChart().setTimezone(timezone);
        tvWidget?.current
          ?.changeTheme(isDarkTheme ? "Dark" : "Light");

        tvWidget?.current?.applyOverrides({
          ...options.overrides,
        });
      });
    tvWidget?.current?.applyStudiesOverrides({
      ...options.studies_overrides,
    });
  }, [isDarkTheme, isChartReady, tvWidget]);

  return (
    <div className="relative flex flex-col flex-1 h-full">
      {!isChartReady && (
        <div className="absolute top-0 left-0 bg-level-0 h-full w-full flex-1 flex items-center justify-center">
          <Spinner.Keyboard />
        </div>
      )}
      <div
        className={classNames(
          !isChartReady && "hidden",
          "w-full h-[100%] flex flex-col flex-1 [&_iframe]:h-full  [&_iframe]:flex-1"
        )}
        id="tv_chart_container"
      />
    </div>
  );
};
