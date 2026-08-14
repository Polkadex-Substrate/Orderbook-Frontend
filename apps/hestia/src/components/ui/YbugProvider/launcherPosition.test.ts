import {
  LAUNCHER_POSITION,
  LAUNCHER_POSITIONS,
  launcherCollides,
  launcherCollisionReason,
  launcherEdge,
  safeLauncherPositions,
} from "./launcherPosition";

/*
 * Jest globals, matching the rest of this app.
 *
 * These tests exist to stop the reported bug being re-introduced by a one-word
 * settings change. So they do not assert "the constant equals right-middle" and
 * call it a day - that would restate the code. They assert the REASONING: which
 * edges are taken, that each contested position is rejected for the right
 * reason, and that the constant is whatever survives that filter.
 */

describe("the reported bug: launcher overlapped Connect Polkadex wallet", () => {
  it("rejects top-middle, the position that shipped", () => {
    // iPhone 15 Pro Max, 430 CSS px: the launcher sat on top of the wallet
    // button and, being a high z-index fixed overlay, ate the tap.
    expect(launcherCollides("top-middle")).toBe(true);
    expect(launcherCollisionReason("top-middle")).toContain(
      "Connect Polkadex wallet"
    );
  });

  it("rejects BOTH bottom corners, not just the one nearest the action bar", () => {
    // The action bars are `fixed bottom-0 left-0 w-full`. Full width means
    // bottom-right is no safer than bottom-left, which is the easy mistake to
    // make when moving the launcher away from the header.
    for (const position of ["bottom-left", "bottom-right"] as const) {
      expect({ position, collides: launcherCollides(position) }).toEqual({
        position,
        collides: true,
      });
      expect(launcherCollisionReason(position)).toContain("Buy/Sell");
    }
  });

  it("rejects left-middle, which fights the iOS back-swipe", () => {
    expect(launcherCollides("left-middle")).toBe(true);
    expect(launcherCollisionReason("left-middle")).toContain("back-swipe");
  });

  it("leaves exactly one position, and that is the one configured", () => {
    // The constant is DERIVED here rather than restated. If a future edge is
    // freed or claimed, this fails and forces the choice to be made again.
    const safe = safeLauncherPositions();
    expect(safe).toHaveLength(1);
    expect(LAUNCHER_POSITION).toBe(safe[0]);
    expect(launcherCollides(LAUNCHER_POSITION)).toBe(false);
    expect(launcherCollisionReason(LAUNCHER_POSITION)).toBeNull();
  });
});

describe("the position is one Ybug actually accepts", () => {
  it("uses the library's spelling, right-middle and not middle-right", () => {
    // Ybug's union is left-middle/right-middle. "middle-right" reads more
    // naturally in English, type-checks nowhere, and would be silently ignored
    // by the widget at runtime if it slipped through as a plain string.
    expect(LAUNCHER_POSITIONS).toContain(LAUNCHER_POSITION);
    expect(LAUNCHER_POSITION).toBe("right-middle");
  });

  it("covers all five positions Ybug supports and no invented ones", () => {
    expect([...LAUNCHER_POSITIONS].sort()).toEqual([
      "bottom-left",
      "bottom-right",
      "left-middle",
      "right-middle",
      "top-middle",
    ]);
  });
});

describe("launcherEdge", () => {
  it("maps every position to the edge it is anchored to", () => {
    const expected: Record<string, string> = {
      "top-middle": "top",
      "bottom-left": "bottom",
      "bottom-right": "bottom",
      "left-middle": "left",
      "right-middle": "right",
    };
    for (const position of LAUNCHER_POSITIONS) {
      expect({ position, edge: launcherEdge(position) }).toEqual({
        position,
        edge: expected[position],
      });
    }
  });
});
