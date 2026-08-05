# Orderbook Frontend (OFE)

The Polkadex Orderbook trading interface. Next.js 15 App Router, in a Turborepo
monorepo, deployed to a VPS behind nginx and Cloudflare.

> This file was the unmodified `create-turbo` starter README until 2026-07-31 - > it described apps that do not exist (`docs`, `web`, `ui`) and told you to run
> `pnpm` in a yarn-1 repo. If something below is wrong, fix it here rather than
> working around it.

## Start here

| Doc | What it covers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the pieces fit, where data comes from, the traps |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | VPS deploy, nginx, Cloudflare, maintenance mode, announcements |
| [`docs/BACKEND-CONTRACT.md`](docs/BACKEND-CONTRACT.md) | What the frontend expects of the backends and the chain |
| [`packages/chart/README.md`](packages/chart/README.md) | The chart package and its datafeed contract |
| [`apps/hestia/src/lib/hyperbridge/docs/`](apps/hestia/src/lib/hyperbridge/docs/) | Bridge: adding a token or chain, and the API-driven config plan |
| [`apps/hestia/src/components/faucet/docs/faucet-flow.md`](apps/hestia/src/components/faucet/docs/faucet-flow.md) | Testnet faucet flow |
| [`apps/hestia/docs/user-journey-tour.md`](apps/hestia/docs/user-journey-tour.md) | The onboarding product tour |

## Workspaces

```
apps/
  hestia/            the trading app - the only app
packages/
  core/              chain + backend access, providers, hooks, helpers
  chart/             candle/depth chart (lightweight-charts)
  format/            number formatting
  eslint-config/     shared eslint
  tsconfig/          shared tsconfig
```

`@orderbook/core` and `@orderbook/chart` are consumed as source via
`transpilePackages`, not built separately. Editing them rebuilds hestia.

## Prerequisites

- **Node 22** (`engines: >=22 <23`, and `.nvmrc` says 22). Node 23+ is not
  supported.
- **yarn 1.22.22** (`packageManager`). Not pnpm, not yarn 2+.
- An `apps/hestia/.env` - copy `apps/hestia/.env.example` and fill it in. The app
  **throws at boot** without `NEXT_PUBLIC_PROJECT_ID`.

## Commands

```bash
yarn install              # yarn.lock is committed; use --frozen-lockfile in CI
yarn dev                  # turbo run dev
yarn build                # turbo run build
yarn lint                 # eslint - RUN THIS BEFORE DEPLOYING (see below)
yarn format               # prettier

scripts/build-release.sh  # docker image (default) or --tarball
sudo scripts/deploy.sh    # pull, build, install, restart, health-check
```

**Run `yarn lint` before a deploy.** `next build` on Next 15 runs ESLint, and a
lint *error* fails the production build - five minutes into a Docker build, with
the real message buried well above Docker's final `exit code: 1`. `tsc` passing
does not imply lint passing: a misplaced import is valid TypeScript.

## First-load slowness in dev is normal

`next dev` compiles each route on first request. The root layout pulls in wagmi,
`@polkadot/api` and the chart, so a cold first load of 10-30s is expected and
says nothing about production. Subsequent loads should be fast; if *every* load
is slow, that is a real problem.

## Two things that will bite you

**`NEXT_PUBLIC_*` and everything in `next.config.js`'s `env:` block are baked in
at build time.** Editing them on a running server changes nothing. Anything in
that `env:` block is also inlined into the browser bundle even without the
prefix - treat the whole list as public and never put a credential there.

**A missing build var does not fail the build**, it bakes an empty string. That
is why `scripts/build-release.sh` exists rather than a bare `docker build`: it
warns about every declared `ARG` with no value.
