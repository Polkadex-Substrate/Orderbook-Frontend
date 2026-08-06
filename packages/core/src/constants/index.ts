import BigNumber from "bignumber.js";
export * from "./queryKeys";
export * from "./notifications";
export const UNIT = BigInt(1000_000_000_000);
export const UNIT_BN = new BigNumber(UNIT.toString());
export const DEFAULT_TRADING_VIEW_INTERVAL = "5";
export const DEFAULTBALANCESINTRONAME = "balancesIntro";
export const DEFAULTWALLETSINTRONAME = "WalletsIntro";

export const POLKADEX_ASSET = {
  name: "POLKADEX",
  ticker: "PDEX",
  id: "PDEX",
  decimal: 12,
};

export const defaultTicker = {
  market: "0-0",
  open: 0,
  close: 0,
  high: 0,
  low: 0,
  baseVolume: 0,
  quoteVolume: 0,
  currentPrice: 0,
  priceChangePercent24Hr: 0,
};

export const READ_ONLY_TOKEN = process.env.READ_ONLY_TOKEN || "READ_ONLY";

export const LOCAL_STORAGE_ID = {
  DEFAULT_TRADE_ACCOUNT: "default_trade_account",
  DEFAULT_MARKET: "default_market",
  DEFAULT_AVATAR: "default_avatar",
  DEFAULT_DISCLAIMER: "default_disclaimer",
};

export const USER_EVENTS = {
  // Trade address update for the user
  // send to main address
  AddProxy: "AddProxy",
  RemoveProxy: "RemoveProxy",
  // Register address update for the user
  // send to main address
  RegisterAccount: "RegisterAccount",
  // Order update for the user
  // send to trade address
  Order: "Order",
  // Deposit and withdrawal update for the user
  // send to main address
  SetTransaction: "SetTransaction",
  // balance update for the user
  // send to main address
  SetBalance: "SetBalance",
  // Trade update for the user
  // send to trade address
  TradeFormat: "TradeFormat",
  // Errors from server
  error: "error",
};

export type UserEvents = keyof typeof USER_EVENTS;

export const ErrorMessages = (existential = "0", minAmount = "0") => ({
  OCEX_ALREADY_REGISTERED: "ocex.MainAccountAlreadyRegistered: ",

  CHECK_VALID_AMOUNT: "Use a valid amount instead",
  CHECK_BALANCE: "The amount you entered exceeds your balance",
  REMAINING_BALANCE:
    "You need atleast 1 PDEX in your funding account to keep it alive",
  REMAINING_BALANCE_IF_NOT_PDEX: `You need atleast units of ${existential} an asset in your funding account to keep it alive.`,
  MAX_DIGIT_AFTER_DECIMAL: "Maximum 8 digits are allowed after decimal",
  WHITESPACE_NOT_ALLOWED: "Whitespace not allowed",
  MUST_BE_A_NUMBER: "Must be a number",
  TOO_SMALL: "Too Small!",
  ZERO: "The amount must be greater than 0",
  MIN: `The amount cannot be less than ${minAmount}`,
  EXISTENTIAL_DEPOSIT: `You need to keep some amount in source chain to cover the existential deposit`,
  CONNECT_WALLET: "Please connect your account to Orderbook",
});

export const CrossChainError = {
  SOURCE_WALLET: "Please choose source account first",
  DESTINATION_WALLET: "Please choose destination account",
  SOURCE_FEE: "Insufficient balance to pay the transaction fee at source chain",
  NOT_ENOUGH_LIQUIDITY:
    "Not enough PDEX in the destination account. Please transfer 1+ PDEX first.",
  NOT_ENOUGH_LIQUIDITY_WITHDRAW: (asset: string) =>
    `Insufficient liquidity to convert ${asset} tokens to PDEX for fee payment.`,
  AUTO_SWAP: (swapAmount: string, ticker: string, withdraw?: boolean) =>
    `Please transfer more than ${swapAmount} ${ticker} since Autoswap is required ${withdraw ? "to pay the fee" : ""}`,
};

export const MAX_DIGITS_AFTER_DECIMAL = 8;
export const MIN_DIGITS_AFTER_DECIMAL = 2;
export const ORDERBOOK_PRECISION = 8;

export const TradingView = {
  lastResolution: "tradingview.chart.lastUsedTimeBasedResolution",
};

export const SUBSCAN_PER_PAGE_LIMIT = 10;
export const TRADE_HISTORY_PER_PAGE_LIMIT = 25;
export const RECENT_TRADES_LIMIT = 30;
export const DEFAULT_BATCH_LIMIT = 15;

export const CUSTOM_ADDRES_NAME = "Custom address";
export const OTHER_ASSET_EXISTENTIAL = 0.00000001;
export const THEA_AUTOSWAP = 1.5;
export const THEA_WITHDRAW_FEE = 1.1;
export const GENESIS = [
  "0x3920bcb4960a1eef5580cd5367ff3f430eef052774f78468852f7b9cb39f8a3c",
  "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
  "0x25a5cc106eea7138acab33231d7160d69cb777ee0c2c553fcddf5138993e6dd9",
];

export const PALLET_ADDRESS =
  "esoEt6uZ3GuFV8EzKB2EAREe3KE9WuRVfmhK1RRtwffY78ArH";

export const TIME_INTERVAL = {
  // Change it to 201600 for production
  blocksInEpoch: 201600,
  // Change it to 28 days = 28 * 86400 seconds, for production
  epochDuration: 28 * 86400, // in seconds
};

export const START_EPOCH = 1;

export const EVM_TOKENS = ["GLMR"];

export const MINIMUM_PDEX_REQUIRED = 1;
export const ESTIMATED_FEE = 0.02;

export const SS58_DEFAULT_FORMAT = 42;
