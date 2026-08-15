import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { Market } from "@orderbook/core/utils/orderbookService";
import {
  getCurrentMarket,
  marketSlug,
  setToStorage,
} from "@orderbook/core/helpers";
import { defaultConfig } from "@orderbook/core/config";

import { LOCAL_STORAGE_ID, defaultTicker } from "../constants";
import { useOrderbookService } from "../providers/public/orderbookServiceProvider/useOrderbookService";

import { useTickers } from "./useTickers";

export type InitialMarkets = {
  last: string | number;
  volume: string | number;
  price_change_percent: string;
  price_change_percent_num: number;
  isFavourite?: boolean;
} & Market;

export function useMarkets(market?: string) {
  const [fieldValue, setFieldValue] = useState({
    searchFieldValue: "",
    marketsTabsSelected: "All",
    showFavourite: false,
  });

  const router = useRouter();
  const { markets: data, isReady } = useOrderbookService();
  const { favoriteMarkets, onUserFavoriteMarketPush } = useProfile();
  const { tickers: allMarketTickers, tickerLoading } = useTickers(market);

  const markets = useMemo(() => {
    return data?.filter(
      (market) =>
        !defaultConfig.blockedAssets.some(
          (item) => item === market.baseAsset.id
        ) &&
        !defaultConfig.blockedAssets.some(
          (item) => item === market.quoteAsset.id
        )
    );
  }, [data]);

  const currentMarket = useMemo(
    () => (market ? getCurrentMarket(markets, market) : undefined),
    [market, markets]
  );

  /**
   * Remember whichever market is actually being viewed, so the header's "Trade"
   * link returns the user here.
   *
   * WHY THIS IS NOT ENOUGH TO DO IN handleChangeMarket
   * That callback only fires when someone picks a market from the market list.
   * Arrive any other way - a shared link, a bookmark, a refresh, a link out of
   * the FAQ - and DEFAULT_MARKET was never written. So a user sitting on
   * PDEX/USDT would click "Trade" and be sent to the LANDING_PAGE default
   * instead, which reads as the app forgetting where they were.
   *
   * Writing it here covers every route into the page, because it is keyed on the
   * market that actually resolved rather than on the gesture that selected it.
   * handleChangeMarket still writes it too, which is harmless: same value.
   *
   * NOTE THE NAME FORMAT. `currentMarket.name` is "PDEX/USDT" - with a slash;
   * marketTokens below splits it on "/" to derive the quote ticker. A slash
   * cannot go in the stored value because getMarketUrl builds a single path
   * segment from it, and `/trading/PDEX/USDT` is a dead route. What is stored is
   * now the canonical slug, "PDEX-USDT", rather than the tickers jammed
   * together: same constraint, but the stored value is the URL we actually want.
   */
  useEffect(() => {
    if (!currentMarket) return;
    const storedName = marketSlug(currentMarket);
    setToStorage(
      LOCAL_STORAGE_ID.DEFAULT_MARKET,
      JSON.stringify({ id: currentMarket.id, name: storedName })
    );
  }, [currentMarket]);

  /**
   * @description Get the single market information for the current market
   *
   * @param {string} e - Get default value for the market
   * @returns - The single market information
   */

  /**
   * Filter markets by tokens name
   *
   * @param {string} e -  Search field value
   */
  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFieldValue({ ...fieldValue, searchFieldValue: e.target.value });
  };

  const handleSelectedFavorite = (id: string) => {
    // this should dispatch an action to make store favorites to the dynamo db
    onUserFavoriteMarketPush(id.trim());
  };

  /**
   * Select Tab by pair name
   *
   * @param {string} e -  Search field value
   */
  const handleMarketsTabsSelected = (value: string) =>
    setFieldValue({ ...fieldValue, marketsTabsSelected: value });

  const handleShowFavourite = () =>
    setFieldValue({ ...fieldValue, showFavourite: !fieldValue.showFavourite });

  /**
   * @description Change to selected market
   *
   * @param {string} e -  Search field value
   * @returns {void} dispatch setCurrentMarket action
   */
  const handleChangeMarket = useCallback(
    (e: string, onClose: () => void): void => {
      const marketToSet = markets?.find((el) => el.name === e);
      if (marketToSet) {
        const slug = marketSlug(marketToSet);

        setToStorage(
          LOCAL_STORAGE_ID.DEFAULT_MARKET,
          JSON.stringify({ id: marketToSet.id, name: slug })
        );

        // Relative, as before: this hook is only used from /trading/<id>, so a
        // bare segment replaces the last one. Absolute would be clearer, but
        // changing both the format and the resolution in one edit would leave
        // two suspects if it broke.
        router.push(slug);

        onClose();
      }
    },
    [markets, router]
  );

  /**
   * @description Return the tickers based on the current market id
   *
   * @returns {InitialMarkets[]} dispatch setCurrentMarket action
   */
  const marketTokens = useMemo((): InitialMarkets[] => {
    const initialMarkets: InitialMarkets[] = [];
    const allTickets = markets.map((item) => {
      const ticker = allMarketTickers.find((val) => val.market === item.id);
      const changePercent = (ticker || defaultTicker).priceChangePercent24Hr;
      return {
        ...item,
        // Display-only fallback: a market with no recent trades has a
        // genuinely null price/volume - show 0 here rather than propagate
        // null into this list's display-only consumers.
        last: (ticker || defaultTicker).close ?? 0,
        volume: (ticker || defaultTicker).quoteVolume ?? 0,
        // A null change now means "unknown" rather than "no movement" - either
        // the market has not traded in the window, or the ticker response was
        // unreadable. Render it as a dash; a confident "0.00%" beside a market
        // the datafeed is quoting is what made the whole strip look broken.
        // The numeric field stays 0 so sorting does not produce NaN holes.
        // null AND undefined both mean "unknown".
        //
        // Checking only `=== null` left the undefined case falling through to a
        // template literal, which produces the STRING "undefined" - and
        // `Number("undefined")` is NaN, which the markets list formatted to two
        // decimal places as "NaN.00%". That is what was on screen next to every
        // untraded pair. A ticker row that arrives without the field at all is
        // the common case here, so undefined is not the exotic branch.
        price_change_percent:
          changePercent === null || changePercent === undefined
            ? "-"
            : `${changePercent}`,
        // Numeric field stays a number so sorting never sees NaN, which would
        // make comparisons false and scatter those rows unpredictably.
        price_change_percent_num: Number.isFinite(changePercent)
          ? (changePercent as number)
          : 0,
        isFavourite: favoriteMarkets.includes(item.id),
      };
    });
    const allFavoriteFilters = allTickets.filter((value) =>
      fieldValue.showFavourite
        ? value.isFavourite === fieldValue.showFavourite
        : value
    );
    return allFavoriteFilters.reduce((pv, cv) => {
      const names = cv.name.toLowerCase().split("/");
      if (
        cv.name
          .toLowerCase()
          .includes(fieldValue.searchFieldValue.toLowerCase()) &&
        (fieldValue.marketsTabsSelected === "" ||
          fieldValue.marketsTabsSelected.toLowerCase() === names[1] ||
          fieldValue.marketsTabsSelected.toLowerCase() === "all")
      ) {
        pv.push(cv);
      }
      return pv;
    }, initialMarkets);
  }, [
    allMarketTickers,
    favoriteMarkets,
    fieldValue.marketsTabsSelected,
    fieldValue.searchFieldValue,
    fieldValue.showFavourite,
    markets,
  ]);

  /**
   * @description Return the market tickers
   *
   * @returns {string[]} Tickers name
   */
  // TODO: Add ticker types, ex. Fiat, Zones, Alts
  const marketTickers = markets.reduce(
    (pv: string[], cv: Market) => {
      const [, quote] = cv.name.split("/");
      if (pv.indexOf(quote) === -1) {
        pv.push(quote);
      }
      return pv;
    },
    ["All"]
  );

  return {
    handleFieldChange,
    handleMarketsTabsSelected,
    handleChangeMarket,
    handleShowFavourite,
    marketTokens,
    handleSelectedFavorite,
    marketTickers,
    fieldValue,
    currentTickerName: currentMarket?.name,
    currentTickerImg: currentMarket?.baseAsset.ticker,
    id: currentMarket?.id,

    list: markets,
    loading: !isReady,
    tickerLoading,
  };
}
