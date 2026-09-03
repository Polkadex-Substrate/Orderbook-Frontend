# Pre-mainnet blockers (Orderbook-Frontend)

Things that are **acceptable on testnet and must not reach mainnet**. This file
exists because "it is only testnet" is a correct risk call that also loses track
of findings. Anything here needs an explicit decision before a mainnet build.

## Status, 2026-08-14

| #                              | Status                                                               |
| ------------------------------ | -------------------------------------------------------------------- |
| B1 unencrypted keystore upload | **FIXED**, two independent guards                                    |
| B2 passphrase strength         | **PARTLY FIXED** - validator built and tested, input not yet swapped |
| B3 `enableAnalytics`           | **FIXED**                                                            |
| B4 `SENTRY_RELEASE` mismatch   | **FIXED**                                                            |

### Two corrections to my own reporting, recorded because both were wrong in ways that mattered

**I wrote that "no call site passes a password". That was false.**
`connectTradingInteraction.tsx:162` routes a _locked_ account through
`UnlockAccount`, which does call `onBackupGoogleDrive({ account, password })`. The
plaintext path was the `isLocked === false` branch only. Still the common case,
since a `KeyringPair` stays unlocked once unlocked and a freshly created account
starts unlocked, but "every backup" was an overstatement.

**I then nearly shipped a fix that would have broken backup entirely.** My first
change routed every account through `UnlockAccount`, which calls `unlock(pass)`
unconditionally. Tested against the real library rather than assumed:

```
unlock('passphrase') on a pair with no encrypted data -> THROWS
    "No encrypted data available to decode"
toJson('passphrase') on that same pair               -> ["scrypt","xsalsa20-poly1305"]
toJson(undefined)                                    -> ["none"]
```

So an unlocked account would have shown "Invalid Password" forever. The real fix
was to make `unlock()` conditional on `isLocked`, which is now done. The lesson,
for the third time this week: verify library behaviour, do not reason about it.

---

## B1. Trading-account private keys are backed up UNENCRYPTED

**Severity: was critical for mainnet. Status: FIXED 2026-08-14.**
**Was live on testnet; accepted as a testnet risk by Ajeesh before the fix.**

### The fix, in three parts

1. `packages/core/src/helpers/keystoreBackup.ts` - `assertUploadable()` inspects
   the **actual JSON** about to be uploaded and throws unless `encoding.type`
   shows a real cipher. Checking the artifact rather than trusting that a
   password argument arrived is deliberate: trusting the argument is the mistake
   that caused this. 16 tests.
2. `useBackupTradingAccount` calls `assertUploadable(jsonAccount)` before the
   upload. react-query surfaces the throw as an error toast, so a user learns the
   backup did **not** happen rather than believing it did.
3. `connectTradingAccount.tsx` no longer branches on `isLocked`; every backup
   goes through the passphrase prompt. `unlockAccount.tsx` only calls `unlock()`
   when the pair is actually locked, so the prompt works for both cases.
4. The `onBackupGDriveAccount` prop was **deleted** from the component and its
   four call sites. It was the unsafe path, and leaving it available invited
   reuse.

Guards 1 and 3 are independent on purpose: 3 fixes today, 1 fixes tomorrow.

### Original analysis, retained

"Back up to Google Drive" uploads the trading account's secret key in the clear.

### The chain, verified in source

`packages/core/src/hooks/useBackupTradingAccount.ts`:

```ts
tradeAccount.isLocked && tradeAccount.unlock(password);
const jsonAccount = tradeAccount.toJson(password);
await GoogleDrive.addFromJson(jsonAccount);
```

`password` is typed optional (`password?: string`). **CORRECTED:** my first write-up
here said no call site passed it. Wrong. There were two routes:

```
locked account   -> UnlockAccount prompt -> onBackupGoogleDrive({ account, password })   SAFE
unlocked account -> onBackupGoogleDrive({ account })                                     UNSAFE
```

The unsafe route was taken from these four, all calling
`onBackupGoogleDrive({ account })` with no password:

- `components/ui/ConnectWalletInteraction/connectTradingInteraction.tsx`
- `components/ui/ConnectWalletInteraction/connectExistingUser.tsx`
- `components/ui/ConnectWalletInteraction/connect.tsx`
- `components/ui/Header/Profile/content.tsx`

So the exposure was narrower than "every backup", but it was still the ordinary
path: a `KeyringPair` stays unlocked for its lifetime once unlocked, and a
freshly created account starts unlocked, so "create an account, back it up"
always took it.

`@polkadot/keyring`, `pair/encode.js`:

```js
export function encodePair({ publicKey, secretKey }, passphrase) {
  const encoded = u8aConcat(PAIR_HDR, secretKey, PAIR_DIV, publicKey);
  if (!passphrase) {
    return encoded; // no encryption, raw secretKey
  }
  const { params, password, salt } = scryptEncode(passphrase);
  const { encrypted, nonce } = naclEncrypt(encoded, password.subarray(0, 32));
  return u8aConcat(scryptToU8a(salt, params), nonce, encrypted);
}
```

No passphrase means the raw secret key is returned and the scrypt/nacl path is
skipped entirely. The keystore JSON that reaches Google Drive carries
`encoding.type` without encryption.

### Scope

This is the **trading account**, which is a proxy, not the main account. An
attacker who obtains the file gains whatever the proxy is permitted to do, which
includes placing and cancelling orders. It is not automatically "funds gone".

Read alongside audit finding **C5** (withdrawal signatures not bound to the
account being debited), because the two compose badly: C5 already weakens the
binding between a signature and the victim.

### Fix

1. Thread a real passphrase from the UI through to `toJson`. The parameter
   already exists; nothing calls it.
2. Do NOT rely on the existing 5-digit rule for it. See B2.
3. Consider refusing to upload at all when no passphrase is supplied, so this
   cannot silently regress. An explicit failure beats a silent plaintext upload.

### Before mainnet, also

Anyone who used the Drive backup on testnet has an exposed key. Testnet keys are
disposable so this is a comms note rather than an incident. If this ships to
mainnet unfixed it is an incident.

---

## B2. The keystore passphrase rule is a 5-digit numeric PIN

**Severity: high for mainnet. Status: PARTLY FIXED. The remaining piece is UI.**

**Done:** `backupPassphraseIssue()` in `helpers/keystoreBackup.ts` enforces at
least 12 characters and rejects digits-only at any length, so a 12-digit number
fails too. Tested, including the boundary and the exact 5-digit PIN case.

**Not done:** the backup flow still collects its passphrase through
`UnlockAccount`, which renders a `Passcode.Outline` widget validated by
`unLockAccountValidations` - 5 digits. So the validator exists but nothing calls
it yet, and a backup encrypted with a 5-digit PIN will pass `assertUploadable`
because it _is_ encrypted, just weakly.

**The remaining work is a dedicated backup-passphrase step**, separate from
unlock, because these are two different secrets:

- _unlock_ proves you may use a key that never leaves this browser, so a short
  PIN is defensible - an attacker needs the browser first
- _backup passphrase_ protects a file in someone else's cloud, attackable
  offline, in parallel, with no rate limit and no way for us to notice

Conflating them is what let a 5-digit PIN become the only thing protecting an
off-site file. I did not build the new input in this pass because it is a new
component in a flow I cannot verify visually, and shipping a half-checked
password UI is a poor trade against a validator that is ready to wire in.

`packages/core/src/validations/index.ts`, `unLockAccountValidations`:

```ts
password: Yup.string()
  .required("Required")
  .test("", "Must be only digits", (v) =>
    /^[0-9]+$/.test(v.replace(/\s+/g, ""))
  )
  .test(
    "",
    "Must be exactly 5 digits",
    (v) => v?.replace(/\s+/g, "")?.length === 5
  );
```

Digits only, exactly 5. **100,000 possible values.** `createAccountValidations`
matches, and its `passcode` is additionally `.nullable()`.

scrypt makes each guess cost roughly 100ms, so the entire keyspace is a few hours
on one core and minutes parallelised. This is adequate as a local unlock PIN for
a key that never leaves the browser. It is **not** adequate for a file placed in
third-party cloud storage, which is offline-attackable at leisure with no rate
limiting and no way for us to detect it.

Fixing B1 without fixing B2 produces encrypted files that are still recoverable.

### Consequence for planned work

Multi-provider cloud backup (Dropbox, OneDrive, encrypted file download) is
**blocked on B1 and B2**. Adding destinations first would multiply the exposure.
Sequence: B1, then B2, then providers.

The storage layer itself is ready: `GDriveExternalAccountStore implements
LocalAccountExternalStorage` in `@aksumite/local-wallets`, so a sibling class per
provider drops in. The work above that layer is generalising the Google-specific
hooks (`useConnectGoogle`, `useGoogleTradingAccounts`,
`useRemoveGoogleTradingAccount`, and the `GoogleDrive` parameter on
`useBackupTradingAccount`).

iCloud is not feasible: Apple offers no third-party web API for writing to a
user's iCloud Drive. CloudKit covers app-owned containers only. The encrypted
file download covers those users instead.

---

## B3. `enableAnalytics: true` on the wallet modal

**Severity: low. Status: FIXED 2026-08-14 - now `enableAnalytics: false`.**

`apps/hestia/src/context/index.tsx` calls `createWeb3Modal({ ..., enableAnalytics:
true })`, which sends usage telemetry to Reown. Nobody requested it. One line to
remove if that is not wanted on mainnet.

---

## B4. `SENTRY_RELEASE` does not match the build

**Severity: low, but it blocks verification. Status: FIXED 2026-08-14.**

**Fix:** precedence flipped in `next.config.js` so `NEXT_BUILD_ID` wins over
`SENTRY_RELEASE`, since it is the identity used by the artifact stamp, RELEASE
file, deploy log and served page. A disagreement between the two now prints a
build warning naming both values instead of being resolved silently. Whatever in
the deploy environment exports `6.108.0` should still be found and unset, but the
build no longer depends on that happening.

Testnet events on 2026-08-14 carried `release: 6.108.0` while the build stamp was
`0.1.0-167ac0b1`. `next.config.js` derives the release from `SENTRY_RELEASE` or
`NEXT_BUILD_ID`, so one of those is set wrongly in the deploy environment.

This matters more than it looks: release tagging is the mechanism that answers
"did the fixed build produce this error", and without it that question cannot be
settled from Sentry. It caused repeated wrong conclusions about
ORDERBOOK-TESTNET-2.

---

## B5. Dependency advisories: two fixed, two with no fix available

Raised by GitHub on push (2 high, 2 moderate, 1 low on the default branch).
A local `yarn audit` against the tracked lockfile found 2 high, 11 moderate,
5 low; GitHub dedupes and reports fewer. The two highs match exactly.

### Fixed

**`sharp` (2 x high)** - inherits libvips CVE-2026-33327 and CVE-2026-3xxxx.
Was `^0.34.3`, patched in `>=0.35.0`, now `^0.35.0` in `apps/hestia/package.json`.
sharp 0.35 requires Node `>=20.9.0`; this repo pins `>=22 <23`, so compatible.

Exposure was low: sharp is Next's build-time image optimiser and is never
shipped to a browser, so the risk was to the build host rather than to users.

**The direct bump alone was NOT enough, and the first attempt looked like it
worked.** After `yarn install` the lockfile contained BOTH versions:

    sharp@^0.34.3:   version "0.34.5"      <- still vulnerable
    sharp@^0.35.0:   version "0.35.4"

`next@15.5.18` declares `sharp: ^0.34.3` as an optional dependency, so yarn
resolved a second copy for Next while our own requirement resolved to 0.35.4.
GitHub kept reporting 2 high because the vulnerable copy was genuinely still in
the tree.

The lesson generalises: bumping a direct dependency does not remove a
transitive copy of the same package. Verify by grepping the LOCKFILE for every
resolution of the package name, not by reading package.json. A `resolutions`
entry (`"sharp": "^0.35.0"` at the root) is what collapses both requesters onto
one version.

### The remaining four, and why none is a version bump

`yarn audit` reports 11 moderate and 5 low, but those are the SAME four
advisories counted once per dependency path. Deduplicated:

**1 and 2. `@metamask/sdk` + `@metamask/sdk-communication-layer` (moderate)**
Path: `hestia > wagmi > @wagmi/connectors > @metamask/sdk`.
Vulnerable `>=0.16.0 <=0.33.0`, patched `>=0.33.1`, lockfile has `0.27.0`.

"Indirectly exposed via malicious `debug@4.4.2`". **The attack vector is already
closed**: the root `resolutions` pins `debug: ^4.4.3` and the lockfile carries
only 4.4.3, so the compromised package is not in the tree. The advisory matches
on version range, not on presence.

Forcing the bump is riskier than the advisory it silences: `wagmi@2.12.7`
resolves `@metamask/sdk-communication-layer` at EXACTLY `0.27.0`, so a
resolution would put an unvetted version under a connector that asked for a
specific one, in the wallet path of an exchange. Real fix: upgrade wagmi, with
its own wallet-connection retest.

**3. `@opentelemetry/core` (moderate)** - unbounded memory allocation in W3C
Baggage propagation. Path: `hestia > @sentry/nextjs > @sentry/node >
@opentelemetry/core`. Patched `>=2.8.0`; the lockfile has `1.30.1`.

Not a resolution candidate. The whole OTel stack is on 1.30.1 (`core`,
`resources`, `sdk-trace-base` all 1.30.1, several requesters pinning
`@opentelemetry/core@1.30.1` with no caret). Forcing `core` to 2.x while its
siblings stay at 1.x breaks the ecosystem's version-compatibility requirement.

OTel 2.x only arrives with `@sentry/nextjs` 10.x; we are on 8.55.2. That is a
**two-major migration** (8 to 9 to 10), and it lands on exactly the files that
carry the freeze and release instrumentation. Not to be done casually.

Blast radius meanwhile is small: `@sentry/node` is server-side only, so this is
not reachable from a browser.

**4 and 5. No fix exists (`patched: <0.0.0`)**
Both arrive via `@web3modal/wagmi > @walletconnect/ethereum-provider >
@walletconnect/sign-client`:

- **`@stablelib/ed25519` (moderate, `<=2.0.2`)** - Ed25519 signature malleability
  from a missing `S < L` check. This one deserves a decision rather than a
  dismissal: it is in a signing path on an exchange. Malleability means a valid
  signature can be transformed into a different valid signature for the same
  message, so anything that treats a signature as a unique identifier is
  unsafe. Worth confirming we never do that.
- **`elliptic` (low, `<=6.6.1`)** - risky cryptographic primitive. Long-standing,
  transitive through the same WalletConnect chain.

Neither has a patched version to move to. Both are inherited from WalletConnect,
so the only lever is a WalletConnect or AppKit upgrade, and there is no evidence
yet that a newer line drops these dependencies. Note `@web3modal/wagmi` is
itself the deprecated name for what is now `@reown/appkit`, so that upgrade is
worth scoping on its own merits.

### Recommendation

Accept all four for testnet. Before mainnet, in this order:

1. Confirm no code treats a signature as a unique identifier (the ed25519
   malleability question). This is the only one with a plausible security
   consequence for us.
2. Scope the `@web3modal/wagmi` to `@reown/appkit` migration, which may clear
   items 4 and 5 and would also move wagmi, clearing 1 and 2.
3. Treat the `@sentry/nextjs` 8 to 10 upgrade as separate work, sequenced after
   the freeze investigation closes, since it rewrites the instrumentation this
   document depends on.

### Applying the sharp fix

`yarn.lock` still needs regenerating. This must run on a Mac, NOT in a Linux
container: `node_modules` here holds macOS arm64 native binaries (sharp itself,
SWC, rollup), and installing from Linux would replace them with Linux builds and
break local development.

    yarn install
    yarn lint && yarn test
    git add package.json apps/hestia/package.json yarn.lock
