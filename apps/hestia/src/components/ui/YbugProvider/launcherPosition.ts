import type { YbugSettings } from "ybug-react";

/**
 * Where the Ybug "Report an Issue" launcher is allowed to sit.
 *
 * THE BUG THIS FIXES
 * On an iPhone 15 Pro Max (430 CSS px wide) the launcher overlapped the
 * "Connect Polkadex wallet" button in the header. The launcher was configured
 * `top-middle`, and the launcher is a FIXED overlay with a very high z-index,
 * while the header is `sticky top-0 ... z-10`. So this was not merely untidy:
 * the launcher sat ON TOP of the button and swallowed the tap. A new user on a
 * phone could not connect a wallet, which is the first thing they must do.
 *
 * WHY IT ONLY SHOWS UP ON A PHONE
 * `top-middle` centres the launcher horizontally. On a desktop viewport the
 * centre of the header is empty space between the nav links and the profile
 * cluster, so it looked fine. As the viewport narrows the header collapses to a
 * 32px logo on the left and the wallet button hard against the right, and that
 * button is wide - "Connect Polkadex wallet" is 24 characters. Below roughly
 * 600px the button's left edge crosses the horizontal centre and the two
 * occupy the same space. Centre-anchored floating UI is safe only while the
 * centre stays empty, and on a narrow viewport nothing stays empty.
 *
 * THE RULE
 * The launcher is a floating overlay, so the only question is which viewport
 * EDGE it sits against, and this app has already spoken for three of them.
 * Rather than swap one hardcoded position for another, the edges this app
 * occupies are written down below, and the position is derived from them. A
 * future change that puts the launcher back on a contested edge fails a test
 * instead of reaching a user.
 *
 * The set of positions is Ybug's, not ours - the union is taken from the
 * library's own type, so if it ever changes this stops compiling rather than
 * silently sending a string the widget ignores. Note the library's naming is
 * `right-middle`, not `middle-right`; that trap is covered by a test.
 */

/** The five values Ybug accepts, straight from the library's type. */
export type LauncherPosition = NonNullable<YbugSettings["launcher_position"]>;

export const LAUNCHER_POSITIONS: readonly LauncherPosition[] = [
  "top-middle",
  "bottom-left",
  "bottom-right",
  "left-middle",
  "right-middle",
];

export type Edge = "top" | "bottom" | "left" | "right";

/** Which viewport edge a launcher position is anchored to. */
export const launcherEdge = (position: LauncherPosition): Edge => {
  if (position === "top-middle") return "top";
  if (position === "left-middle") return "left";
  if (position === "right-middle") return "right";
  return "bottom";
};

/**
 * The edges this app has already claimed, and what claims them.
 *
 * `null` means free. Each entry is a fact about this codebase, so if one of
 * these layouts changes the reasoning here should be revisited rather than
 * quietly inherited.
 */
export const OCCUPIED_EDGES: Readonly<Record<Edge, string | null>> = {
  // components/ui/Header/index.tsx: `sticky top-0 left-0 ... z-10`, containing
  // the Connect Polkadex wallet button. This is the reported collision.
  top: "the sticky header, which holds the Connect Polkadex wallet button",

  // Nearly every page pins a full-width action bar to the bottom:
  // trading/PlaceOrder/responsiveInteraction.tsx (Buy/Sell), plus transfer,
  // bridge, faucet, balances, rewards, transactions and cexOnRamp templates.
  // They are all `fixed bottom-0 left-0 w-full`, so BOTH bottom corners are
  // taken - "bottom-right is free because the bar starts on the left" is wrong.
  bottom:
    "the full-width fixed action bars, including Buy/Sell on the trading page",

  // Not app chrome, but spoken for all the same: on iOS Safari a swipe from the
  // left edge navigates back. A grab handle sitting in that gutter competes
  // with the gesture, and the gesture wins arguments with users, not with us.
  left: "the iOS Safari back-swipe gesture, which starts at the left edge",

  right: null,
};

/** Does this position land on an edge the app already uses? */
export const launcherCollides = (position: LauncherPosition): boolean =>
  OCCUPIED_EDGES[launcherEdge(position)] !== null;

/** What it would collide with, for an error message or a code comment. */
export const launcherCollisionReason = (
  position: LauncherPosition
): string | null => OCCUPIED_EDGES[launcherEdge(position)];

/** Every position that does not collide with this app's own chrome. */
export const safeLauncherPositions = (): LauncherPosition[] =>
  LAUNCHER_POSITIONS.filter((p) => !launcherCollides(p));

/**
 * The position actually used.
 *
 * Right edge, vertically centred. It is the only one of the five that does not
 * sit on an edge this app has already claimed.
 *
 * It is not perfect: mid-height on the right of the trading page is over the
 * orderbook, whose rows are tappable. But it covers a few rows of a list rather
 * than a primary button, and every alternative covers a button - Buy/Sell at the
 * bottom, Connect wallet at the top. Least-bad, chosen deliberately.
 *
 * The launcher is deliberately still VISIBLE rather than hidden behind the menu
 * (`hide_launcher: true` plus a `Ybug.open("feedback")` menu item would also fix
 * the overlap). During a testnet, an always-visible report button is how bugs
 * actually arrive; burying it would fix a layout defect by turning off the
 * feedback channel that found it.
 */
export const LAUNCHER_POSITION: LauncherPosition = "right-middle";
