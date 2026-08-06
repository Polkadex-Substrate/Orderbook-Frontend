/**
 * Sanity rules for a trading pair's registered configuration.
 *
 * WHY THIS EXISTS
 * On 2026-08-06 all 10 testnet pairs were found registered with incorrect
 * parameters: configs created before the 12dp decimal normalization were
 * interpreted at the wrong scale. The flagship case, WETH/USDT (pair 3-6):
 *
 *   qty_step_size = 100, base_asset_precision = 0, max_volume = 1
 *
 * i.e. a minimum order of 100 whole WETH capped at 1 USDT total value -
 * mutually unsatisfiable, so the engine rejected every order with
 * "Bad order: market config invalid" and the pair was dead on arrival.
 * PDEX-2 additionally referenced a legacy non-HFT asset and was closed by
 * council.
 *
 * These rules answer one question: CAN ANY VALID ORDER EXIST on this pair?
 * They gate three moments:
 *   1. verifying corrected params after the 2026-08 re-registration,
 *   2. every future pair listing - the mainnet product has NO public beta to
 *      catch this, so this check is a launch gate,
 *   3. optionally at app start, to warn rather than let users discover a
 *      dead pair by failed order.
 *
 * Import-free so it runs anywhere: jest, a Node runner against the GraphQL
 * endpoint, or pasted into a browser console.
 */

export type MarketConfigInput = {
  /** e.g. "3-6" (base asset id - quote asset id) or a display name. */
  market: string;
  price_tick_size: number;
  qty_step_size: number;
  min_volume: number;
  max_volume: number;
  base_asset_precision: number;
  quote_asset_precision: number;
  /**
   * Optional reference price (quote per base). When given, price-dependent
   * rules run too - these are the ones that catch the WETH case numerically.
   */
  referencePrice?: number;
};

export type MarketConfigIssue = {
  rule: string;
  severity: "fatal" | "warning";
  message: string;
};

const isPos = (n: number) => Number.isFinite(n) && n > 0;

/**
 * Does `value` sit on the grid of `unit` (i.e. is it a whole multiple)?
 * Uses a relative epsilon: these numbers arrive through JSON/floats, and
 * naive modulo lies exactly here (0.3 % 0.1 !== 0).
 */
const onGrid = (value: number, unit: number): boolean => {
  if (!isPos(unit) || !Number.isFinite(value)) return false;
  const ratio = value / unit;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
};

/** Decimal places a step/tick implies, e.g. 0.001 -> 3, 100 -> 0. */
const impliedDecimals = (unit: number): number => {
  if (!isPos(unit)) return NaN;
  // toFixed avoids scientific notation ("1e-8"), which string parsing would
  // misread - the display-bug class resurfacing inside a checker.
  const s = unit.toFixed(12).replace(/0+$/, "");
  const dot = s.indexOf(".");
  return dot === -1 || dot === s.length - 1 ? 0 : s.length - dot - 1;
};

export const checkMarketConfig = (
  cfg: MarketConfigInput
): MarketConfigIssue[] => {
  const issues: MarketConfigIssue[] = [];
  const fatal = (rule: string, message: string) =>
    issues.push({ rule, severity: "fatal", message });
  const warn = (rule: string, message: string) =>
    issues.push({ rule, severity: "warning", message });

  const {
    price_tick_size: tick,
    qty_step_size: step,
    min_volume: minVol,
    max_volume: maxVol,
    base_asset_precision: baseP,
    quote_asset_precision: quoteP,
    referencePrice: price,
  } = cfg;

  // Positivity: zero or negative units make quantisation impossible.
  if (!isPos(tick))
    fatal("tick-positive", `price_tick_size=${tick} must be > 0`);
  if (!isPos(step)) fatal("step-positive", `qty_step_size=${step} must be > 0`);
  if (!isPos(maxVol))
    fatal("maxvol-positive", `max_volume=${maxVol} must be > 0`);
  if (!Number.isFinite(minVol) || minVol < 0)
    fatal("minvol-nonneg", `min_volume=${minVol} must be >= 0`);
  if (issues.some((i) => i.severity === "fatal")) return issues;

  // The volume window must be a window.
  if (minVol > maxVol)
    fatal(
      "vol-window",
      `min_volume=${minVol} > max_volume=${maxVol}: every order violates one bound or the other`
    );

  // Precision coherence: step/tick must be representable at the declared
  // precision, or the engine and the order form disagree about rounding.
  const stepDec = impliedDecimals(step);
  const tickDec = impliedDecimals(tick);
  if (stepDec > baseP)
    fatal(
      "step-vs-base-precision",
      `qty_step_size=${step} needs ${stepDec} decimals but base_asset_precision=${baseP}`
    );
  if (tickDec > quoteP)
    fatal(
      "tick-vs-quote-precision",
      `price_tick_size=${tick} needs ${tickDec} decimals but quote_asset_precision=${quoteP}`
    );

  // The pre-normalization signature that broke the 2026-08 pairs: "whole
  // tokens only" precision with a giant step. Not provably fatal without a
  // price, but it has been wrong 100% of the times seen.
  if (baseP === 0 && step >= 100)
    warn(
      "suspicious-scale",
      `base_asset_precision=0 with qty_step_size=${step}: the pre-normalization signature (WETH/USDT was step=100)`
    );

  // Satisfiability floor: the SMALLEST possible order (one step at one tick)
  // must not already exceed max_volume, or no order can ever exist.
  const smallestOrderValue = step * tick;
  if (smallestOrderValue > maxVol)
    fatal(
      "smallest-order-exceeds-max",
      `smallest possible order = step*tick = ${smallestOrderValue} exceeds max_volume=${maxVol}: no valid order exists at ANY price`
    );

  // min_volume must be reachable on the grid below max_volume.
  if (minVol > 0 && smallestOrderValue > 0) {
    const k = Math.ceil(minVol / smallestOrderValue);
    if (k * smallestOrderValue > maxVol)
      fatal(
        "min-unreachable",
        `no multiple of step*tick lands between min_volume=${minVol} and max_volume=${maxVol}`
      );
  }

  // Price-dependent rules - the numeric WETH catch.
  if (price !== undefined) {
    if (!isPos(price)) {
      warn("ref-price", `referencePrice=${price} ignored (not positive)`);
    } else {
      const minOrderValueAtPrice = step * price;
      if (minOrderValueAtPrice > maxVol)
        fatal(
          "step-unaffordable-at-price",
          `one step (${step}) at reference price ${price} = ${minOrderValueAtPrice} in quote, above max_volume=${maxVol} - the WETH/USDT failure mode`
        );
      if (price < tick && !onGrid(price, tick))
        warn(
          "price-below-tick",
          `reference price ${price} is below one tick (${tick}): price cannot be expressed on the grid`
        );
    }
  }

  return issues;
};

/** True when a pair admits at least one valid order (no fatal issues). */
export const isMarketConfigUsable = (cfg: MarketConfigInput): boolean =>
  checkMarketConfig(cfg).every((i) => i.severity !== "fatal");

/** One-line verdict per pair, for the runner's table and CI output. */
export const describeMarketConfig = (cfg: MarketConfigInput): string => {
  const issues = checkMarketConfig(cfg);
  if (issues.length === 0) return `${cfg.market}: OK`;
  const fatals = issues.filter((i) => i.severity === "fatal");
  const head = fatals.length > 0 ? "UNUSABLE" : "suspicious";
  return `${cfg.market}: ${head} - ${issues
    .map((i) => `[${i.rule}] ${i.message}`)
    .join("; ")}`;
};
