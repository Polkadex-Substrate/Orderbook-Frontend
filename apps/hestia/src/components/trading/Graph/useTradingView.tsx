"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { TradingView as TradingViewConstants } from "@orderbook/core/constants";
import {
  decimalPlaces,
  fetchCandles,
  getCurrentMarket,
} from "@orderbook/core/helpers";
import { useMarkets } from "@orderbook/core/index";
import { useSubscription } from "@orderbook/core/providers/user/subscription";
import { useWindowSize } from "react-use";

import {
  ChartingLibraryWidgetOptions,
  IChartingLibraryWidget,
  LibrarySymbolInfo,
  ResolutionString,
} from "../../../../public/static/charting_library/charting_library.min";

import { configurationData } from "./config";
import { getLastUsedReslution } from "./helper";

export function useTradingView({ id }: { id: string }) {
  const { width } = useWindowSize();
  const mobileView = useMemo(() => width <= 954, [width]);
  const tvWidget = useRef<IChartingLibraryWidget>();

  const [isReady, setIsReady] = useState(false);
  const [activeResolution, setActiveResolution] = useState<ResolutionString>(
    getLastUsedReslution()
  );

  const { onCandleSubscribe } = useSubscription();
  const { list } = useMarkets();
  const currentMarket = getCurrentMarket(list, id);

  const getAllSymbols = useCallback(() => {
    const allSymbols = list?.map((market) => ({
      description: market?.name,
      exchange: "Polkadex",
      full_name: `Polkadex:${market?.name}`,
      symbol: market?.name,
      type: "crypto",
      ticker: market?.name,
    }));

    return allSymbols;
  }, [list]);

  const defaultWidgetOptions = useMemo(
    () =>
      ({
        library_path: "/static/charting_library/",
        charts_storage_api_version: "1.1",
        client_id: "tradingview.com",
        user_id: "public_user_id",
        fullscreen: false,
        autosize: true,
        container: "tv_chart_container",
        disabled_features: [
          "volume_force_overlay",
          "header_symbol_search",
          "use_localstorage_for_settings",
          "header_compare",
          "header_fullscreen_button",
          "header_indicators",
          "header_resolutions",
          "header_saveload",
          "header_undo_redo",
          "header_chart_type",
          "header_screenshot",
          "header_settings",
          "go_to_date",
          mobileView && "hide_left_toolbar_by_default",
          "timeframes_toolbar",
          "header_widget",
        ],
        enabled_features: [
          "use_localstorage_for_settings",
          "side_toolbar_in_fullscreen_mode",
          "save_chart_properties_to_local_storage",
          "iframe_loading_compatibility_mode",
          mobileView && "hide_left_toolbar_by_default",
        ],
        custom_css_url: "/static/style.css/",
        loading_screen: {
          foregroundColor: "transparent",
        },
        auto_save_delay: 5,
        load_last_chart: true,
      }) as Partial<ChartingLibraryWidgetOptions>,
    [mobileView]
  );

  const widgetOptions = useMemo(() => {
    const resolution = getLastUsedReslution();
    return {
      datafeed: {
        onReady(callback) {
          setTimeout(() => callback(configurationData), 0);
        },
        async searchSymbols(userInput, exchange, symbolType, onResult) {
          const symbols = getAllSymbols();
          const newSymbols = symbols.filter((symbol) => {
            const isExchangeValid =
              exchange === "" || symbol.exchange === exchange;
            const isFullSymbolContainsInput =
              symbol.full_name
                .toLowerCase()
                .indexOf(userInput.toLowerCase()) !== -1;
            return isExchangeValid && isFullSymbolContainsInput;
          });
          setTimeout(() => onResult(newSymbols), 0);
        },
        async resolveSymbol(symbolName, onResolve, onError) {
          const symbols = getAllSymbols();
          const symbolItem = symbols.find(
            ({ full_name: fullName }) => fullName === symbolName
          );
          if (!symbolItem) {
            onError("cannot resolve symbol");
            return;
          }

          const pricePrecision = decimalPlaces(
            currentMarket?.price_tick_size ?? 1
          );
          const pricescale = Math.pow(10, pricePrecision);

          const symbolInfo = {
            ticker: symbolItem.full_name,
            name: symbolItem.symbol,
            description: symbolItem.description,
            type: symbolItem.type,
            session: "24x7",
            timezone: "Etc/UTC",
            exchange: symbolItem.exchange,
            minmov: 1,
            pricescale,
            has_intraday: true,
            visible_plots_set: "ohlcv",
            has_daily: true,
            has_weekly_and_monthly: true,
            supported_resolutions: configurationData.supported_resolutions,
            volume_precision: 2,
            data_status: "streaming",
            full_name: symbolItem.full_name,
            listed_exchange: symbolItem.exchange,
            format: "price",
          };

          setTimeout(() => onResolve(symbolInfo as LibrarySymbolInfo), 0);
        },
        async getBars(symbolInfo, resolution, from, to, onResult, onError) {
          // const { from, to } = periodParams;
          try {
            if (!currentMarket?.id) return onResult([], { noData: true });

            const bars = await fetchCandles({
              market: currentMarket?.id,
              resolution: resolution,
              from: new Date(from * 1000),
              to: new Date(to * 1000),
            });
            if (bars.length < 1) {
              return onResult([], { noData: true });
            } else {
              return onResult(bars, { noData: false });
            }
          } catch (error) {
            console.log(error);
            if (error instanceof Error) {
              onError(error.message ?? error);
            }
          }
        },
        subscribeBars(symbolInfo, resolution, onTick) {
          if (currentMarket?.id) {
            onCandleSubscribe({
              market: currentMarket?.id,
              interval: resolution,
              onUpdateTradingViewRealTime: onTick,
            });
          }
        },
        unsubscribeBars(listenerGuid) {
          console.log(
            "[unsubscribeBars]: Method call with subscriberUID:",
            listenerGuid
          );
        },
      },
      interval: resolution,
      locale: "en",
      timezone: "Asia/Kolkata",
      symbol: `Polkadex:${currentMarket?.name}`,
      ...defaultWidgetOptions,
    } as ChartingLibraryWidgetOptions;
  }, [
    currentMarket?.id,
    getAllSymbols,
    currentMarket?.name,
    onCandleSubscribe,
    currentMarket?.price_tick_size,
    defaultWidgetOptions,
  ]);

  const onChangeResolution = (e: ResolutionString) =>
    tvWidget.current?.activeChart().setResolution(e, () =>
      setActiveResolution(() => {
        localStorage.setItem(TradingViewConstants.lastResolution, e);
        return e;
      })
    );

  const onChangeFullScreen = () => { /* tvWidget.current?.startFullscreen(); */ };
  const onScreenshot = async () => {
    /*
    const canvas = await tvWidget.current?.takeClientScreenshot();
    if (canvas) {
      const dataURL = canvas.toDataURL("image/jpeg");
      const downloadLink = document.createElement("a");
      downloadLink.download = "Polkadex-Orderbook-Chart" + ".jpg";
      downloadLink.href = dataURL;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
    */
    tvWidget.current?.takeScreenshot();
  };

  const onChartReady = useCallback((v: boolean) => setIsReady(v), []);
  return {
    activeResolution,
    onChangeResolution,
    onChangeFullScreen,
    onScreenshot,
    tvWidget,
    widgetOptions,
    isChartReady: isReady,
    onChartReady,
  };
}
