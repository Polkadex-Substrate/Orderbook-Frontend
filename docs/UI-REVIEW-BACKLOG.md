# UI review backlog

Source: annotated screenshot review, 14 August 2026, received via Ajeesh.
Six screens: Bridge, Faucet, mobile menu, Trading, Rewards/Help, Reown modal.

Ordered by ship order, not by the order the reviewer raised them. Each item
records the DECISION and the REASON, because the most expensive thing in this
list is doing something twice or undoing a deliberate choice.

Three of the reviewer's marks are rejected on evidence and three on principle.
Those are in sections 5 and 6 and should be read before touching anything.

---

## Status, 2026-08-14

**Shipped:** 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1. Verified with 185 hestia tests,
233 core tests, `tsc` clean, lint clean.

**Blocked, not started:** 1.1 needs the Reown dashboard rather than code. 2.7 and
4.1 are held together deliberately, see 4.1. 7 needs the redirect designed first.
8 is a question out to the reviewer.

**Two mistakes worth recording**, since both cost a cycle here:

- I put `{/* ... */}` comments directly inside `{cond && (` expressions in two
  files, which is invalid: that position takes one expression, not a comment
  followed by an element. `tsc` caught it. Comments explaining a conditional
  belong above the `{cond && (` line.
- Removing a heading means removing the `<Typography.Heading>` only. Twice I
  nearly took the wrapping `<div>` with it, which would have changed the layout
  rather than just the copy.

---

## 1. Free, no code (do first)

| # | Item | Where |
| --- | --- | --- |
| 1.1 | Remove Email, Continue with Google and the social login row from the Connect Wallet modal | Reown dashboard, not code |

Check first whether any tester has actually bridged using an embedded EVM
wallet. On the Sepolia side those logins do work, even though they are useless
for the Polkadex account, so this is a usage question rather than a pure
cleanup. If nobody has, turn them off.

---

## 2. Low risk, self-contained

| # | Item | Notes |
| --- | --- | --- |
| 2.1 | Hide the page-title block on desktop, keep it on mobile | Bridge and Faucet. Mobile has no other page label, desktop has the active nav item. |
| 2.2 | Remove the "Networks", "Bridge", "Network & Token" and "Wallet Address" section headings | The field sub-labels already carry the meaning. Check screen-reader landmarks do not disappear entirely. |
| 2.3 | Remove "Menu", "Quick links" and "General settings" labels from the mobile menu | The content is self-evident. |
| 2.4 | Make the settings icon treatment consistent | Language, Appearance and Colour have leading icons and nothing else does. Add or remove, do not leave it half-done. |
| 2.5 | Remove "Documentation" from the Help dropdown | Until the new docs exist. A menu item that leads nowhere useful is worse than a shorter menu. |
| 2.6 | Drop `(0)` from the Open Orders tab when the count is zero | KEEP the count when non-zero. It tells you the panel has content without switching tabs, which mattered during ORDERBOOK-TESTNET-6 when orders failed to render. |
| 2.7 | Shrink the "Select token" pill on Faucet | Cosmetic, but see 4.1 before touching any other font size. |

---

## 3. Bridge page: reduce connect affordances

The reviewer's mark said "not needed, wallets connect in the middle box" and
they are right about the count, though not about which control to remove.

The bridge page currently offers THREE ways to connect for TWO connections:
the app-level button in the header, the inline `Connect` links in each network
box, and the bottom primary action.

| # | Item | Notes |
| --- | --- | --- |
| 3.1 | Hide the header connect button on the `/bridge` route only | NOT globally. On `/trading` it is the primary call to action. |

Do not remove the bottom button. See 5.1.

`bridge/Form/pendingAccountRow.tsx` and `connectionSteps.tsx` already carry
comments about three buttons that all read "Connect wallet". The labels were
fixed then; this is the layout half of the same problem.

---

## 4. Needs doing once, properly

| # | Item | Notes |
| --- | --- | --- |
| 4.1 | Revisit the type scale | The review asks for the nav LARGER and the menu and inputs SMALLER. That is a scale problem, not seven individual tweaks. Do it as a scale or it will come back. |

**Hard constraint on 4.1:** iOS Safari auto-zooms the page when an input with
`font-size` below 16px receives focus. The bridge amount field and the faucet
address field must stay at or above 16px. The tester base is iOS-heavy and every
RPC timeout in Sentry came from iOS, so this is not a hypothetical population.

| # | Item | Notes |
| --- | --- | --- |
| 4.2 | Trading page: unify button styling on the `Start placing offers` treatment | Reviewer's point, and reasonable. Do it in the UX package so it applies everywhere rather than per-page. |

---

## 5. Rejected on evidence: these are submit buttons, not clutter

The reviewer crossed out three controls as redundant. All three are the same
primary action rendered in an earlier state, because the screenshots were taken
in a disconnected session. Deleting them removes the ability to finish the task.

### 5.1 Faucet: the pink button

`faucet/Form/index.tsx` builds `primaryAction` as a state machine:

```
"Select a token"   -> opens the token dropdown
"Request Tokens"   -> submits
"Requesting..."    -> blocked
```

The file also carries a comment recording that this button previously sat
`disabled` and did nothing, and was deliberately changed so every state performs
its own step. Removing it leaves the form with no submit control.

### 5.2 Bridge: the bottom button

`bridge/Form/index.tsx:207-231` does the same, walking through
`Connect <sourceChain> wallet`, then `Connect <destinationChain> wallet`, then
the bridge action. Same conclusion.

### 5.3 Trading: the two `Connect Funding Account` buttons

Same pattern, per side of the order form. Worth confirming before changing, but
treat as a state, not a duplicate.

---

## 6. Rejected on principle

### 6.1 Do not make pink the only active-nav indicator

The reviewer asks to remove the underline site-wide and keep hover pink only.
Colour as the sole indicator of the current page fails WCAG 2.1 SC 1.4.1 Use of
Colour. Counter-offer: keep the underline and reduce its weight or width.

### 6.2 Keep the Faucet help links

The reviewer's reasoning was "in case someone has a problem they will reach
Telegram or Discord for sure". That inverts a decision taken deliberately on
2026-08-10, when the Community dropdown was removed from the header because
every link out of the orderbook during a session is a chance to lose the
session. The faucet is where brand-new testers land, so it is the worst place to
convert confusion into support load.

### 6.3 Keep "Connect Polkadex wallet"

Already decided, with the reasoning in `Profile/index.tsx`: both `/bridge` and
`/faucet` also offer a Sepolia wallet, so a bare "Connect wallet" is ambiguous
exactly where it matters, and route-dependent wording meant the header changed
as you navigated. The reviewer's bridge-page mark was about redundancy, not
naming, and is handled by 3.1.

---

## 7. Highest value, largest blast radius: hyphenate market URLs

`/trading/PDEX-USDT` instead of `/trading/PDEXUSDT`.

Filed by the reviewer as personal preference. It is not. A concatenated pair is
genuinely ambiguous: with `WETH`, `WBTC`, `WSTETH`, `PWETH` and `PDEX` all
listed, `PWETHUSDT` has more than one plausible split. It resolves today only
because the code matches against a known market list rather than parsing the
string. A separator makes the URL self-describing and the route parseable.

**Do not ship without a redirect.** Everything below breaks otherwise:

- Links testers are sharing in Telegram and Discord right now
- `getMarketUrl()`, which persists and restores the last-used market
- `defaultConfig.landingPageMarket`, currently `PDEXUSDT`
- Sentry culprits and issue grouping, which currently key on `/trading/PDEXUSDT`
- Any bookmark, and the Ybug reports already filed against the old form

Suggested shape: accept both forms at the route, canonicalise to the hyphenated
one with a permanent redirect, and put the parse in an import-free tested module
rather than inline, since the whole point is that the old format could not be
parsed reliably.

---

## 8. Open question for the reviewer

The logo currently reads "Orderbook"; the reviewer wants "Polkadex" site-wide.
A rebrand is coming, so a find-and-replace now gets undone later. Preferred
route is to move the brand name into a single module the way
`Polkadex-Management-Frontend/src/brand/index.ts` does, then switch once. Asked
whether "Orderbook" bothers them enough to be worth doing twice.
