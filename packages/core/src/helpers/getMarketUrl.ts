import { defaultConfig } from "../config";
import { LOCAL_STORAGE_ID } from "../constants";

import { getFromStorage, removeFromStorage } from "./storage";
import { marketSlug } from "./marketSlug";

/**
 * Where the "Trade" link and every landing-page call to action should go.
 *
 * The stored market's `name` is `PDEX/USDT`. Interpolating it straight into the
 * path produced `/trading/PDEX/USDT` - TWO segments, which the `[id]` route
 * cannot match - so this only ever worked because the stored value happened to
 * be written in the stripped form elsewhere. It is now put through `marketSlug`
 * exactly like every other link, which yields `/trading/PDEX-USDT` regardless of
 * which spelling was stored.
 */
export const getMarketUrl = () => {
  const market = getFromStorage(LOCAL_STORAGE_ID.DEFAULT_MARKET);

  const isValid = market && isValidJson(market);
  if (!isValid) removeFromStorage(LOCAL_STORAGE_ID.DEFAULT_MARKET);

  const storedName = isValid ? JSON.parse(market)?.name : undefined;
  // `landingPageMarket` comes from the LANDING_PAGE env var and is written in
  // the legacy jammed form (`PDEXUSDT`). marketSlug cannot split that - nothing
  // can, without the market list - so it passes through unchanged and the
  // trading page canonicalises it once the markets have loaded.
  const identifier = storedName || defaultConfig.landingPageMarket;
  const slug = marketSlug({ id: "", name: String(identifier ?? "") });

  return `/trading/${slug || defaultConfig.landingPageMarket}`;
};

export const isValidJson = (e: string) => {
  try {
    JSON.parse(e);
    return true;
  } catch (error) {
    return false;
  }
};
