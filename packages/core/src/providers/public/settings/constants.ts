export const CHANGE_COLOR_THEME = "colorTheme/CHANGE_COLOR_THEME";
export const TOGGLE_CHART_REBUILD = "colorTheme/TOGGLE_CHART_REBUILD";
export const TOGGLE_ORDERS_PAIRS_SWITCHER =
  "trading/TOGGLE_ORDERS_PAIRS_SWITCHER";
export const TOGGLE_MARKET_SELECTOR = "colorTheme/TOGGLE_MARKET_SELECTOR";

export const SETTINGS_CHANGE_THEME = "Settings Provider/SETTINGS_CHANGE_THEME";
export const SETTINGS_CHANGE_LANGUAGE =
  "Settings Provider/SETTINGS_CHANGE_LANGUAGE";
export const SETTINGS_CHANGE_CURRENCY =
  "Settings Provider/SETTINGS_CHANGE_CURRENCY";

export const DEFAULTLANGUAGENAME = "language";
export const DEFAULTCURRENCYNAME = "currency";
export const DEFAULTTHEMENAME = "theme";
export const DEFAULTNOTIFICATIONNAME = "localnotifications";
// Ids of static announcements the user has dismissed. Needed as a separate key
// because announcements are injected from code, not stored: absence from
// `localnotifications` is their "not yet seen" signal, so deleting one made it
// reappear immediately. See helpers.ts.
export const DISMISSEDANNOUNCEMENTSNAME = "dismissedannouncements";
export const DEFAULTMARKETCAROUSEL = "marketCarouselSelector";

export const NOTIFICATION_DELETE_ALL =
  "Settings Provider/NOTIFICATION_DELETE_ALL";
export const NOTIFICATION_PUSH = "Settings Provider/NOTIFICATION_PUSH";
export const ANNOUNCEMENTS_LOADED = "Settings Provider/ANNOUNCEMENTS_LOADED";
export const NOTIFICATION_DELETE_BY_ID =
  "Settings Provider/NOTIFICATION_DELETE_BY_ID";
export const NOTIFICATION_MARK_AS_READ =
  "Settings Provider/NOTIFICATION_MARK_AS_READ";
export const ALL_NOTIFICATION_MARK_AS_READ =
  "Settings Provider/ALL_NOTIFICATION_MARK_AS_READ";

export const CHECK_HAS_EXTENSION = "Settings Provider/CHECK_HAS_EXTENSION";
export const APP_NAME = "Polkadex Orderbook";
export const TOOGLE_CONNECT_EXTENSION =
  "Settings Provider/TOOGLE_CONNECT_EXTENSION";
export const TOOGLE_CONNECT_TRADING =
  "Settings Provider/TOOGLE_CONNECT_TRADING";

export const SET_MARKET_CAROUSEL = "Settings Provider/SET_MARKET_CAROUSEL";
export const GET_MARKET_CAROUSEL = "Settings Provider/GET_MARKET_CAROUSEL";

export const marketCarouselValues = ["Popular", "Favourite"] as const;
