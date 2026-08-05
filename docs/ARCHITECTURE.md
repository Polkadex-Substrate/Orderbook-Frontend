# Architecture

How OFE fits together, where each piece of data comes from, and the traps that
have actually cost time. Read [`README.md`](../README.md) first for setup.

Last verified: 2026-07-31.

---

## The shape of it

```
                 browser
                    │
        ┌───────────┼────────────────────────────────┐
        │           │                                │
   Cloudflare   (direct, no proxy)              (direct)
        │           │                                │
      nginx    datafeed.polkadex.ee        polkadex-testnet.polkadex.ee
        │      (chart candles, REST/UDF)    (chain, wss via @polkadot/api)
        │
  Next standalone server  ── systemd ──  /opt/orderbook-fe
        │
        ├─ /api/announcements   reads /etc/orderbook-fe/announcements.json
        └─ page render only
                    │
                    └── browser then talks to:
                        orderbook-api-test.polkadex.ee   GraphQL (Apollo)
                          · HTTP   queries + mutations
                          · WS     subscriptions (graphql-ws)
```

**The Next server is almost not in the data path.** It renders pages and serves
one route handler. Every piece of live data - markets, orderbook, balances,
candles, chain state - is fetched by the **browser**, directly from the backends.

That single fact explains a lot:

- Server logs (`journalctl -u orderbook-fe`) contain almost nothing about trading
  problems. Those errors are in the visitor's browser, which is what Sentry is
  for.
- The datafeed sees each visitor's own IP, not the server's. When it logged one
  constant `172.18.0.1` for everyone, that was its own reverse proxy dropping the
  client address, not us proxying.
- CORS preflights appear in datafeed logs because the calls really are
  cross-origin browser requests.

---

## Data sources

| What | Where from | How |
|---|---|---|
| Markets, orderbook, orders, balances, trades | `GRAPHQL_URL` | Apollo over HTTP |
| Live orderbook / order / balance updates | `GRAPHQL_WS_URL` | `graphql-ws` subscriptions |
| Chart candles | `NEXT_PUBLIC_SERVER_BASE_URL` | REST, UDF format, browser → gateway |
| Chain state, extrinsics, asset metadata | `POLKADEX_CHAIN` | `@polkadot/api` over wss |
| Bridge (EVM leg) | `NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL` | wagmi/viem |
| Announcements | `/api/announcements` | our own route handler → JSON file on disk |

**AWS Amplify and AppSync are gone.** The frontend used to speak AppSync's
protocol behind a `USE_NEW_BACKEND` flag; the flag, the SDK and ~800 lines of
legacy transport were removed. Everything is Apollo now. If you see `/realtime`
requested, that is a stale cached bundle.

---

## Build-time vs runtime - the distinction that causes most confusion

```
BUILD TIME (baked into the bundle, needs a rebuild to change)
  every NEXT_PUBLIC_*
  everything in next.config.js `env:`   ← also inlined into the BROWSER bundle
  generateBuildId

RUNTIME (change and restart, or not even that)
  PORT / HOSTNAME / NODE_ENV           install.sh manages these
  /etc/orderbook-fe/announcements.json  route handler reads per request
  /etc/orderbook-fe/maintenance         nginx checks per request
  /etc/orderbook-fe/maintenance.html
```

Two consequences worth internalising:

**The `env:` block is public.** It is inlined into client JS exactly like a
`NEXT_PUBLIC_*` var, but without the prefix that makes that obvious. A
write-scoped Sentry token lived there and was served to every visitor. Never add
a credential.

**Operational switches belong at runtime.** Maintenance mode is an nginx flag
file, not the `MAINTENACE_MODE` env var - that var is read by `src/proxy.ts`,
which is Next middleware on the **edge runtime** and cannot read the filesystem,
and it would need a rebuild during an incident. nginx also keeps working when
Node is down, which is exactly when you need a maintenance page.

---

## Deploy pipeline

```
scripts/deploy.sh
  1. git pull --ff-only
  2. scripts/build-release.sh            docker build → image
  3. scripts/build-release.sh --tarball --from-image
                                          docker cp /app out of the image → tarball
  4. install.sh                           extract → /opt/orderbook-fe, systemd unit,
                                          nginx vhost, env + announcements + maintenance page
  5. health check against a real asset URL
```

**Docker is a build sandbox, not the runtime.** The image is built, the
standalone output is copied out, and systemd runs `node server.js` on the host.
There is no container in production. `docker-compose.yml` was deleted for this
reason - nothing ran it.

`install.sh` is idempotent and preserves operator state: an existing env file,
`announcements.json` and `maintenance.html` are never overwritten. Old installs
move to `/opt/orderbook-fe.bak.<timestamp>`; one is kept.

### Why `build-release.sh` rather than plain `docker build`

There are 59 build args and **a missing one does not fail the build - it bakes
an empty string.** `NEXT_PUBLIC_PROJECT_ID` empty means the app throws at boot.
The script exports the env file, derives args from the Dockerfile's `ARG` list,
and warns about every unset one.

It also syntax-checks the env file first. The file is *sourced*, so the shell
parses it - an apostrophe in a value (`We'll notify you`) is a syntax error that
otherwise aborts the build with a bare `unexpected EOF`.

---

## Traps

**`.dockerignore` patterns are anchored at the context root.** `.env*` excluded
`./.env` but **not** `apps/hestia/.env`, so the build env - Sentry DSN, faucet
key, gateway secret, a drpc key - was copied into the build context, carried into
Next's standalone output, and installed to `/opt/orderbook-fe/apps/hestia/.env`.

Fixed 2026-08-05, in this order, because the order matters: 25 `NEXT_PUBLIC_*`
vars had no Dockerfile `ARG` and reached the build *only* through that file, so
tightening the pattern first would have emptied all 25 silently. The `ARG`s went
in first, then the pattern became `**/.env` + `**/.env.*`.

The general rule: any new pattern here needs `**/` if it should match at depth.

**`turbo.json`'s `build.env` list is a cache key, not documentation.** The Docker
build runs `npx turbo run build` with `--mount=type=cache,target=/app/.turbo`, so
turbo's task cache survives between builds on the host. Turbo hashes only the env
vars named in `build.env`. A `NEXT_PUBLIC_*` missing from that list means changing
its value gives a cache **hit** and the previous bundle is reused - a rebuild that
appears to succeed and changes nothing.

20 vars were missing as of 2026-08-05 (all the bridge token addresses,
`NEXT_PUBLIC_APP_URL`, the Ybug and bridge-maintenance flags) and 9 removed ones
were still listed. The list is now generated from the Dockerfile's `ARG` lines;
keep it that way, and regenerate it whenever an `ARG` is added.

**`generateBuildId` must be unique per build.** It used to fall back to the
constant `"orderbookDefaultId"` because the Alpine builder has no `git`. Next
serves `/_next/static/<buildId>/_buildManifest.js`, that filename carries no
content hash, and both nginx and Cloudflare mark `/_next/static/` immutable for a
year - so browsers served a stale manifest pointing at chunks that no longer
existed. Symptom: blank page on first load after a deploy, fine after a reload.

**Cloudflare cache rules are zone-wide.** Scope every rule with
`http.host eq "…"` or you affect every other subdomain.

**Static imports ignore runtime guards.** `import * as Sentry` with an
`if (production)` check *inside* the module still compiles the whole 99 MB
Sentry + OpenTelemetry tree into the graph. That made the root layout chunk slow
enough that dev first-loads timed out. Both instrumentation files import
dynamically now.

**There are two env files, and they are not related.** `BUILD_ENV_FILE`
(`apps/hestia/.env`, used by `deploy.sh` and `build-release.sh`) supplies
`--build-arg` values at build time. `RUNTIME_ENV_FILE`
(`/etc/orderbook-fe/orderbook-fe.env`, used by `install.sh`) is what systemd
loads via `EnvironmentFile`. Putting a `NEXT_PUBLIC_*` in the runtime file has no
effect whatsoever - it was already baked into the bundle.

Both were called `ENV_FILE` until 2026-08-05, and `harden.sh` does `sed -i` on
whichever it inherits. It only ever worked because `install.sh` is its only
caller. `harden.sh` now refuses to run that step if `RUNTIME_ENV_FILE` is unset.

`deploy.conf` is gitignored, so deployed hosts still set the old `ENV_FILE`.
`deploy.sh` honours it with a warning; rename the key and the shim goes away.

---

## Conventions worth knowing

**`Market.id` vs `Market.name`.** `id` is `"{baseAssetId}-{quoteAssetId}"`
(`"8-6"`); `name` is `"{baseTicker}/{quoteTicker}"` (`"WETH/USDT"`). The GraphQL
backend keys on ids; the datafeed gateway keys on tickers. Passing the wrong one
gives a 404 from a remote service rather than a local error.

**Asset decimals come from the chain**, via `assets.metadata`, not from config.
Bridge config still holds *EVM* decimals (18 for WETH, 6 for USDC) and those are
correct for the Sepolia leg only - `pallet_assets` stores every bridged asset at
12dp. One `decimals` field cannot describe both legs of a bridge.

**`LANDING_PAGE`** is `Market.name` with non-alphanumerics stripped
(`"WETH/USDT"` → `WETHUSDT`). Matching is a case-insensitive `includes`, so
`WETHUSDT` also matches `PWETHUSDT`; and `getMarketUrl` prefers a market saved in
`localStorage` over this value, so clear site data when testing a change.

**Empty states are contextual.** Orders panel tabs each describe what is
missing, and distinguish "nothing yet" from "not connected". There is exactly one
connect CTA on the trading screen, in the order form.

---

## Known gaps

Closed on 2026-08-05: the `toFixed` trailing-zero noise (now
`@orderbook/format`'s `formatDisplay`, 25 tests), the Work Sans / colour-token
brand drift, and the unused `useSubstrateWethBalance`.

- The gateway serves only 4 of the chart's 8 resolutions; 15m/30m/4h/1W are
  hidden in the toolbar. Backend side, see
  [`BACKEND-CONTRACT.md`](./BACKEND-CONTRACT.md).
- **The `__test__/` suite at the repo root does not run and cannot.** Six files
  import `@polkadex/orderbook/...`, a package scope that no longer exists, and
  some target providers deleted with Amplify. `packages/core` has a
  `jest.config.js` but no `test` script. Decide whether to port them to
  `@mitra/*` and the current provider paths, or delete them - either is better
  than a test directory nobody can execute. `packages/format` is the one suite
  that runs today, via `yarn test`.
- `packages/chart` has no `tsconfig.json`, so it is only ever type-checked
  transitively through `apps/hestia`. `tsc -p packages/chart` is not possible.
- `NEXT_PUBLIC_GATEWAY_SECRET` ships in the browser bundle. Routing chart calls
  through a Next route handler would fix that and remove the CORS preflights, but
  would make all chart traffic originate from one server IP.
