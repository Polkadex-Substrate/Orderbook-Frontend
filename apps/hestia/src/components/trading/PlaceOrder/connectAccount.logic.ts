/**
 * What the order form's call to action should say, and which side it belongs to.
 *
 * THE BUG THIS FIXES
 * With no funded account, the Limit and Market forms render two panels side by
 * side and BOTH show an identical grey "Connect Funding Account". The only thing
 * that ever distinguishes buy from sell is the final button - green "Buy PDEX"
 * against red "Sell PDEX" - and in the unconnected state that button is not
 * there. So a new user, who is exactly the person in this state, cannot tell
 * which half of the screen buys and which sells.
 *
 * That is the worst possible audience for the ambiguity: it is invisible to
 * anyone already set up, which is everyone who tests the app internally.
 *
 * WHY THE CONNECT BUTTON IS NOT SIMPLY COLOURED GREEN AND RED
 * It would fix the ambiguity and introduce a worse problem. A green button in
 * the buy panel reads as "buy", and this button does not buy anything - it opens
 * a wallet dialog. Colouring an action by a side it does not act on is how a
 * user ends up clicking what they think is a trade. The side is therefore
 * carried by a LABEL above the button, tinted per side, while the button itself
 * stays neutral and honest about what it does.
 *
 * Import-free so the branching is testable without a wallet or a renderer.
 */

export type OrderSide = "buy" | "sell";

/** Which wallet step the user is actually missing. */
export type ConnectStep = "fund" | "funding-account" | "trading-account";

export type AccountState = {
  /** The on-chain funding account, once an extension account is selected. */
  hasMainAddress: boolean;
  /** Registered trading-account proxies for that main account. */
  proxyCount: number;
};

/**
 * Which step comes next.
 *
 * Three outcomes from two inputs, and the order matters. A main address with no
 * proxies means the account exists but cannot trade yet, which is a FUNDING
 * problem, not a connection problem - so it must be checked before the generic
 * "no main address" case or the user is told to connect something they have
 * already connected.
 */
export const connectStep = (state: AccountState): ConnectStep => {
  if (state.hasMainAddress && state.proxyCount === 0) return "fund";
  if (!state.hasMainAddress) return "funding-account";
  return "trading-account";
};

/** The neutral button label for that step. */
export const connectLabel = (step: ConnectStep): string => {
  if (step === "fund") return "Fund Account";
  if (step === "funding-account") return "Connect Funding Account";
  return "Connect Trading Account";
};

/**
 * The side label shown above the button, e.g. "Buy PDEX".
 *
 * Falls back to bare "Buy" or "Sell" rather than printing a placeholder ticker.
 * An unresolved market already has a dash for its ticker elsewhere, and "Buy -"
 * reads as a broken string where "Buy" reads as a category.
 *
 * Returns null when there is no side. The mobile layout
 * (`responsiveInteraction.tsx`) shows ONE shared control for both directions
 * rather than two panels, so it has no ambiguity to resolve and labelling it
 * "Buy" would be a straightforward lie about what the button does.
 */
export const sideLabel = (
  side?: OrderSide | null,
  ticker?: string | null
): string | null => {
  if (side !== "buy" && side !== "sell") return null;
  const verb = side === "buy" ? "Buy" : "Sell";
  const t = typeof ticker === "string" ? ticker.trim() : "";
  if (!t || t === "-") return verb;
  return `${verb} ${t}`;
};

/**
 * Which tone the side label carries.
 *
 * Deliberately separate from the button's appearance: this drives text colour on
 * the label only, never the fill of a control that does not trade.
 */
export const sideTone = (side: OrderSide): "success" | "danger" =>
  side === "buy" ? "success" : "danger";
