# Funds management: proposed structure and UX

For review before any implementation. Written in response to Faraday's brief of
2026-08-14, which asks to delete the current deposit / withdraw / transfer
surface and design the whole funds experience from routes upward.

I agree with the premise. What follows starts with three corrections, because two
of the assumptions in the brief are wrong in ways that change the design, and a
third fact nobody mentioned may remove the hardest problem entirely.

---

## 0. Three corrections, verified in source

### 0.1 There is NO claim step on Main to Trading transfer

The brief says: *"transferring funds from the Main Account to the Trading Account
currently involves two steps: first you make the transfer and then you have to
claim the funds."*

Not so. `packages/core/src/hooks/useDeposit.ts` is a single extrinsic followed by
`handleTransaction`. There is no claim.

The claim is real, but it is on **withdrawal**: `api.tx.ocex.claimWithdraw`, via
`useCall.tsx`. So the two-step complaint is correct and worth fixing, it is just
pointed at the wrong direction of travel. This matters because the fix he
proposes - hide the claim, make it one action - should be applied to the
**withdraw** flow, where it is genuinely needed, and would be wasted effort on
transfer, where nothing is wrong.

### 0.2 The Trading Account does not cost 1 PDEX

The brief says: *"the Trading Account itself requires 1 PDEX to exist... the
account cannot be created without that 1 PDEX."*

`register_user()` in `pallets/ocex/src/lib.rs:1769` inserts two storage entries
and emits an ingress message. It takes no deposit and checks no balance. Neither
does `add_proxy_account`. A trading account is a keypair that signs orders
off-chain; it does not need to exist as a funded on-chain account.

The 1 PDEX is `ExistentialDeposit` in `runtimes/mainnet/src/lib.rs:281`, which is
a **chain-wide** rule about any account holding a native balance, not something
the OCEX pallet charges.

So the real constraint is narrower and differently shaped: **the MAIN account
needs native PDEX to pay transaction fees**, and an account holding a native
balance must hold at least ED. The trading account is not the blocker. Designing
around "buy 1 PDEX to create a trading account" would be solving a problem that
does not exist while leaving the real one in place.

### 0.3 The chain may already let users pay fees in USDT, which would dissolve the onboarding problem

`runtimes/mainnet/src/lib.rs:2895` includes
`pallet_asset_conversion_tx_payment::ChargeAssetTxPayment` in the runtime's
`SignedExtra`. The older `pallet_asset_tx_payment` is commented out and marked
REMOVED at line 2600, so it was deliberately replaced by the conversion-based
one, which pays fees in any asset that has an AssetConversion pool against PDEX.

The frontend already threads this: `tokenFeeId` is a parameter on `useDeposit`,
`useAddProxyAccount`, `useRemoveProxyAccount` and six interface types, and
`statics.ts` registers the `ChargeAssetTxPayment` signed extension.

**If a USDT/PDEX pool exists, a new user never needs to acquire PDEX at all**, and
the elaborate "convert part of the bridge deposit into 1 PDEX" flow in the brief
is unnecessary. That is a much better outcome than engineering the workaround.

**This needs Tejas to confirm** two things I cannot settle from the frontend:

1. Does an AssetConversion pool exist for USDT/PDEX (and the other bridged
   assets) on mainnet? Without a pool the extension has nothing to swap and fee
   payment fails.
2. Does an account holding only bridged assets satisfy the existential deposit
   and provider-reference rules, or does it still need a native PDEX balance to
   exist at all?

The design below works either way, but the answer decides whether onboarding is
"connect and deposit" or "connect, acquire PDEX, then deposit". I would not
design the seeding flow until this is answered.

---

## 1. Naming, before anything else

The product currently uses **two different names for the same thing**. The
account menu says "Main account"; the balances table column says "Funding
account". That is not a small inconsistency, it is the single most confusing
concept in the product being referred to two ways on adjacent screens.

Proposal, aligned with the CEX conventions the brief rightly wants to borrow:

| Concept | Name to use | Why |
| --- | --- | --- |
| On-chain account, holds deposits, signs with the wallet extension | **Funding** | Binance and Bybit both use Funding for exactly this. Already half-used in our own table. |
| Off-chain account, holds tradeable balance, signs orders | **Trading** | Already the term, and matches "Spot" mentally without pretending to be spot. |
| Moving assets in or out of Polkadex from an external wallet on the SAME chain | **Deposit / Withdraw** | Standard. |
| Moving assets between Funding and Trading | **Transfer** | Standard, internal, free-feeling. |
| Moving assets between DIFFERENT chains | **Bridge** | Keep distinct, see section 4. |

"Main account" should disappear from the interface entirely. It describes the
architecture, not the user's situation, and rule 1.1 of the UX learnings doc says
never show a user a word that only makes sense inside the codebase.

---

## 2. Routes

The brief asks for routes first. This is right: routes are the information
architecture, and buttons follow from them rather than the reverse.

```
/wallet                        Overview. Both balances, one screen. The default.
/wallet/deposit                Deposit    -> asset -> network -> address
/wallet/withdraw               Withdraw   -> asset -> network -> address -> amount
/wallet/transfer               Transfer   -> direction -> asset -> amount
/wallet/bridge                 Bridge     -> from chain -> to chain -> asset -> amount
/wallet/activity               Unified history, filterable
/wallet/activity/[id]          A single movement, with its full lifecycle
```

Four properties worth stating, because each is a decision:

**`/wallet` is one destination, not five.** The navbar gets a single Wallet
entry, as the brief asks. Everything else is reachable from inside it.

**Each action is a real route, not a modal.** Deposit is a URL you can bookmark,
share with support, reload without losing state, and return to with the browser
back button. The current modal-heavy flow loses all of that, and section 5.1 of
the UX learnings doc already records "every page needs a way back" as a lesson
this codebase learned the hard way.

**Query params carry the pre-selection**, so entry points elsewhere can deep-link
without duplicating UI: `/wallet/deposit?asset=USDT`,
`/wallet/transfer?direction=to-trading&asset=PDEX`. The Trade page's "Fund
Account" button becomes a link to the second of those, rather than a fourth
implementation of a transfer form.

**`/wallet/bridge` sits under wallet, not beside it.** Bridging is a way to get
assets in, so it belongs with the other ways to get assets in. This directly
answers the brief's question about integrating the bridge without new confusion:
it is not a separate destination competing with Deposit, it is one of the routes
inside the same place.

---

## 3. Trading account creation: automatic, at the moment it is needed

The brief asks whether creation should be automatic or manual.

**Automatic, but not silent, and not at connect time.** Create it at the first
moment the user does something that requires it, which is the first Transfer to
Trading or the first order. Not on wallet connect, because a user who only wants
to look at balances should not be asked to sign anything.

Rationale for automatic: the trading account is an implementation consequence of
the architecture, not a choice the user is making. Nobody arrives wanting to
create a proxy keypair. Asking them to is asking them to understand the
two-account model before they have any reason to care about it.

Rationale for "not silent": a key is being generated in this browser and nowhere
else, and per section 6.1 of the UX learnings doc that is the single most
consequential fact in the product. The user must see the backup step. So:

```
Transfer to Trading  ->  "This is your first transfer, so we will set up your
                          trading account. It takes one signature."
                     ->  [sign]
                     ->  backup step, unskippable but deferrable once
                     ->  transfer proceeds
```

One signature, one explanation, at the point where the user already wants the
outcome.

**Edge case that must be handled:** the key exists only in this browser. Section
6.1 records users seeing an account they cannot sign with because they registered
it elsewhere. The overview must show that state honestly rather than showing an
apparently normal trading account that silently cannot act.

---

## 4. Deposit versus Bridge: separate by question, not by label

The brief asks how to stop users confusing sending tokens directly with bridging.
Labelling alone will not do it, because both read as "put money in".

The reliable separation is to ask **one question first** and let the answer route
them:

```
/wallet/deposit

   Where are your funds now?

   [ Already on Polkadex ]        -> show deposit address    (a true deposit)
   [ On Ethereum / another chain ] -> continue to bridge      (/wallet/bridge)
```

This works because it asks something the user actually knows, rather than asking
them to classify the operation, which requires understanding the difference we
are trying to hide. It also means there is only one entry point to remember:
Deposit. Bridge stops being a thing you must know to look for.

Follow the standard CEX sequence from there, exactly as the brief proposes:

```
Deposit -> Select asset -> Select network -> Show address + QR + memo/warning
```

The network step is not optional even when only one network is available: it is
where "you are about to send an Ethereum USDT to a Polkadex address" gets caught,
and users are trained by every other exchange to look for it.

---

## 5. Which addresses are visible, and where

The brief asks this explicitly and it is the question most likely to lose funds
if answered badly.

**Show exactly one address at a time, and always name what it is for.** The
Funding account address is the deposit address. The trading account address is
never a deposit destination and should never be presented as one; if it is shown
at all it is as an identifier in account details, visibly not a paste target.

For bridged assets, the arrival destination must be stated **before** the user
confirms, not after:

```
Bridging 100 USDT from Ethereum
Arrives in:  Funding account   5Grw...XCPq        [copy]
Then:        Transfer to Trading to start trading
```

The current UI shows a deposit address and a set of transfer controls with no
statement of where a bridged asset lands. That is the gap the brief is pointing
at.

---

## 6. Presenting Funding and Trading

**One screen, two columns, not two tabs.** The entire difficulty is that users
must hold both in their head simultaneously and understand that trading needs the
second one. Tabs hide one while showing the other, which is precisely backwards.

```
/wallet

  Total value                                              $1,234.56

  ┌ Funding ─────────────────┐   ┌ Trading ─────────────────┐
  │ On-chain, from deposits  │   │ Available to trade       │
  │ 100 PDEX                 │ → │ 0 PDEX                   │
  │ 0 USDT                   │   │ 0 USDT                   │
  │ [Deposit] [Withdraw]     │   │ [Trade]                  │
  └──────────────────────────┘   └──────────────────────────┘
              [ Transfer between them ]

  Assets                                    [ ] Hide zero balances
  ...one row per asset, both balances, in-orders...
```

The arrow between the panels is doing real work: it shows direction of travel and
makes the transfer action obviously the thing that connects the two.

Two details from the screenshots worth carrying: **hide zero balances by
default** as Faraday asks (with the toggle visible, not hidden), and zebra
striping on the asset grid.

---

## 7. Where each action lives

| Action | Where | Why |
| --- | --- | --- |
| Deposit | `/wallet` Funding panel, and `/wallet/deposit` | It acts on Funding, so it lives on Funding. |
| Withdraw | `/wallet` Funding panel, and `/wallet/withdraw` | Same. |
| Transfer | Between the two panels, and `/wallet/transfer` | It is the relationship between them. |
| Bridge | Inside the Deposit flow, and `/wallet/bridge` | See section 4. |
| Trade | Trading panel, links to `/trading` | The point of the trading balance. |

**On removing Withdraw from the menu:** the brief suggests dropping it since
"people know that to withdraw they need to do it from the main account". I would
keep it. Withdrawal is the action users most need to believe is available, and
its discoverability is a trust signal out of proportion to its usage. It costs
one line inside `/wallet` and buys confidence that funds are not one-way.

**On the navbar:** agreed. Trade, Bridge, Rewards, Faucet, Help collapses to
Trade, Rewards, Wallet, Help. Bridge moves inside Wallet. Faucet moves inside
Deposit on testnet, where it is simply another way to get funds in.

---

## 8. The new-user journey, end to end

```
1. Connect wallet
2. /wallet, empty, one clear next step:  "Deposit to get started"
3. Where are your funds now?  -> On another chain
4. Bridge:  asset, amount, destination shown plainly
5. Arrives in Funding.  Explicit next step: "Transfer to Trading"
6. First transfer  ->  trading account created, one signature, backup shown
7. Trading balance appears.  "Start trading" ->  /trading
```

Seven steps, of which the user consciously decides four. Every screen states
where the money is and what the next action is, which is the goal in the brief.

**If 0.3 resolves badly** and PDEX is required for fees, one step is inserted
after 2: an explicit "you need a small amount of PDEX for network fees" with a
route to get it. Deliberately explicit rather than hidden, because a silent
conversion of part of someone's deposit into a different asset is the kind of
surprise that destroys trust in a financial product. Faraday's version shows the
split before confirming, which is right, and I would keep that property.

---

## 9. Balances and activity

**One activity list, not one per operation.** Deposits, withdrawals, transfers
and bridges are all "my money moved". Filter by type; do not fragment by type.
The present split across Deposit history, Withdraw history and Transaction
history forces users to know which category their problem belongs to before they
can look it up.

Each row states: what moved, which direction, when, and **what stage it is at**,
because these operations are not instant and a pending bridge with no visible
state is the most common support question in every bridged product.

```
Bridge   100 USDT   Ethereum -> Funding    2 min ago   [ Confirming 8/20 ]
Transfer  50 PDEX   Funding  -> Trading    1 hr ago    Completed
Withdraw  10 PDEX   Funding  -> 5Grw...    2 hr ago    [ Claim ]        <- see 0.1
```

That third row is where the withdrawal claim step surfaces. Per the brief's
instinct, it should be automatic; where it cannot be, it must at least be visible
here rather than being a step the user has to know to go looking for.

---

## 10. Edge cases that must be designed, not discovered

1. **Trading account registered in another browser.** Show it as unusable with
   the reason, do not hide it. Already a known defect class.
2. **Bridge in flight when the user leaves.** Activity must survive reload; state
   lives on chain or in the indexer, never only in component state.
3. **Deposit of an asset with no trading pair.** Allowed, but say so at deposit
   time rather than leaving the user hunting for a market.
4. **Zero fee balance mid-flow**, for example enough to deposit but not to
   transfer. Detect before the button, not after the signature.
5. **Withdrawal below existential deposit**, which would reap the account. Warn
   with the actual number.
6. **Asset decimals differing between chains.** Already caused a real bug
   (bridged USDC/USDT at native EVM decimals against OCEX's uniform 10^12).
   Display must be driven by asset metadata, never assumed.
7. **First transfer and account creation failing halfway**: signature succeeded,
   transfer did not. The retry must not attempt to re-create the account.

---

## 11. What gets deleted

Per the brief, and I agree with deleting rather than adapting:

- Navbar Bridge entry, and the standalone `/bridge` route (redirect to
  `/wallet/bridge`)
- The account dropdown's Deposit / Withdraw / Transfer items
- The per-row `Transfer to Trading account - Deposit - Withdraw` inline links in
  the balances table
- The two `Fund Account` buttons in the order form, replaced by one link to
  `/wallet/transfer?direction=to-trading`
- `/transfer`, `/deposit`, `/withdraw` as separate top-level routes

Redirects from every old route, because links have been shared during the
testnet.

---

## 12. What I need before implementing

1. **Tejas:** the two questions in 0.3. They decide whether onboarding has three
   steps or four, and whether the PDEX-seeding flow is needed at all.
2. **Ajeesh:** agreement on the naming table in section 1. Everything else
   depends on it, and renaming later is the expensive kind of change.
3. **Faraday:** whether the single-screen two-panel overview in section 6 matches
   what he had in mind, since his note said "this is just an idea of main
   account" and I may have read it differently.

I would not write code before 1 and 2 are settled.
