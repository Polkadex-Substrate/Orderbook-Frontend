# syntax=docker/dockerfile:1
# The syntax directive is required for `RUN --mount=type=cache` below. Without
# it, older Docker parses those flags as literal arguments and the build fails.
# ============================================================================
# OFE (apps/hestia) production image. The @aksumite/* and @mitrabook/*
# libraries are consumed from npm, so a plain `docker build .` is all that's
# needed.
#
# Build via scripts/build-release.sh (default mode), which loads the env file
# and passes every ARG below. Building by hand means passing 59 --build-arg
# flags yourself; a missing NEXT_PUBLIC_* does not fail the build, it bakes an
# empty string, and the app throws at boot.
#
# This image is a build sandbox, not the runtime. deploy.sh extracts the
# standalone output and install.sh runs it under systemd on the host.
# ============================================================================

# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Workspace manifests needed for dependency resolution
COPY package.json yarn.lock .npmrc ./
COPY apps/hestia/package.json ./apps/hestia/
COPY packages/core/package.json ./packages/core/
COPY packages/chart/package.json ./packages/chart/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/format/package.json ./packages/format/
COPY packages/tsconfig/package.json ./packages/tsconfig/

# Cache mount for the yarn download cache. This layer is already skipped
# entirely when no manifest changed; the mount only helps when one did, by
# avoiding a full re-download of the dependency tree.
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked \
    yarn install --frozen-lockfile

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ── Build-time environment ──────────────────────────────────────────────
# NEXT_PUBLIC_* values are BAKED INTO THE BROWSER BUNDLE here. They cannot be
# changed at container runtime - a value change means a rebuild. They are also
# public: never put a real secret in one.
# Keep this list in sync with apps/hestia/.env.example.
ARG POLKADEX_CHAIN
ARG GOOGLE_ANALYTICS
# API_REGION, IDENTITY_POOL_ID, USER_POOL_ID, USER_WEB_CLIENT_ID and
# PIN_POINT_CLIENT_ID removed with AWS Amplify - they configured Cognito and
# Pinpoint via aws-exports.js, which is deleted. USE_NEW_BACKEND removed too:
# it chose between AppSync and the Orderbook GraphQL backend, and there is only
# one backend now.
ARG GRAPHQL_URL
ARG GRAPHQL_WS_URL
ARG LANDING_PAGE
ARG MAIN_URL
ARG MAINTENACE_MODE
ARG ENABLE_LMP
ARG IS_BRIDGE_ENABLED
ARG BLOCKED_ASSETS
ARG DEFAULT_TRANSFER_TOKEN
ARG SUBSCAN_API
ARG SUBQUERY_URL
ARG READ_ONLY_TOKEN
ARG SENTRY_DSN
# Sampling rates. Optional - the code defaults to 0.1 traces / 0 replay sessions.
ARG SENTRY_TRACES_SAMPLE_RATE=
ARG SENTRY_REPLAY_SESSION_SAMPLE_RATE=
# Org and project for source map upload. Not secrets - they are visible in every
# Sentry URL. The upload silently does nothing unless BOTH are set alongside the
# auth token, which is why stack traces were arriving minified.
ARG SENTRY_ORG
ARG SENTRY_PROJECT
# Which deployment this is: testnet / staging / production. Unset, the SDK
# defaults to the literal "production", so every environment looked like prod
# in Sentry's filter. Required in practice, hence no default.
ARG SENTRY_ENVIRONMENT
# Tags every event with the build it came from, so Sentry can tell a regression
# from a pre-existing issue and can pick the right source maps. Defaults to
# NEXT_BUILD_ID (set further down) when not passed explicitly.
ARG SENTRY_RELEASE=
#
# SENTRY_AUTH_TOKEN is deliberately NOT an ARG. As an ARG/ENV it is recoverable
# from `docker history` by anyone holding the image. It is passed as a BuildKit
# secret on the build RUN instead - see the turbo run build step below - so it
# exists only for the duration of that command and never lands in a layer.
#
# Note the name: a differently-named `SENTRY_AUTH` used to be an ARG here and was
# inlined into the BROWSER bundle by next.config.js's `env` block. No source file
# and no tool read that name, so it was leaked to every visitor for no benefit.
# Rotate it if it was ever a live token.
ARG DISABLED_FEATURES
ARG GOOGLE_API_KEY
ARG GOOGLE_CLIENT_ID
# These six are read by next.config.js `env:` and were being passed at build
# time, but had no matching ARG here - so Docker discarded them and every image
# was built with them empty. Feature flags failing silently open. Any new entry
# in that `env:` block needs an ARG here too, or it silently becomes "".
ARG SIGNUP_DISABLED
ARG SHOW_SHUTDOWN_POPUP
ARG UNDER_MAINTENACE
# WalletConnect - app THROWS AT BOOT without it (src/config/wagmi.ts)
ARG NEXT_PUBLIC_PROJECT_ID
# Origin reported to WalletConnect. Unset falls back to a hardcoded mainnet URL,
# which mismatches the deployment and can fail WalletConnect's domain check.
ARG NEXT_PUBLIC_APP_URL
# Chart datafeed (UDF REST gateway). Both required - see .env.example.
# NEXT_PUBLIC_NATIVE_CHART removed: it selected between two chart components
# reading from two different backends, and the server and dev envs disagreed.
ARG NEXT_PUBLIC_SERVER_BASE_URL
ARG NEXT_PUBLIC_GATEWAY_SECRET
# Indexer
ARG NEXT_PUBLIC_SUBQUERY_URL
# Hyperbridge route
ARG NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL
ARG NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL
ARG NEXT_PUBLIC_BRIDGE_ISMP_HOST
ARG NEXT_PUBLIC_BRIDGE_INDEXER_URL
ARG NEXT_PUBLIC_POLKADEX_STATE_MACHINE
ARG NEXT_PUBLIC_HYPERBRIDGE_URL
# Mainnet bridge fee model: flag + relayer fee (bridged-asset units) + PDEX gas
# floor. All optional; unset = testnet behaviour (fees off).
ARG NEXT_PUBLIC_BRIDGE_MAINNET_FEES=
ARG NEXT_PUBLIC_BRIDGE_RELAYER_FEE=
ARG NEXT_PUBLIC_BRIDGE_MIN_PDEX=
# Public origin - metadataBase for OG/Twitter image URLs
ARG NEXT_PUBLIC_SITE_URL
# Bridgeable token addresses on the EVM side. These had no ARG and reached the
# build only because apps/hestia/.env was copied into the image - see the
# .dockerignore note below. Declared explicitly now.
ARG NEXT_PUBLIC_BRIDGE_AAVE_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_AAVE_HFT_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_LINK_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_LINK_HFT_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_UNI_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_UNI_HFT_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_USDC_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_USDC_HFT_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_USDT_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_USDT_HFT_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_WBTC_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_WBTC_HFT_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_WETH_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_WSTETH_ADDRESS
ARG NEXT_PUBLIC_BRIDGE_WSTETH_HFT_ADDRESS
# No ARGs for NEXT_PUBLIC_BRIDGE_MAINNET_* or NEXT_PUBLIC_BRIDGE_ASSET_HUB_RPC_URL.
# They appear only in the markdown under src/lib/hyperbridge/docs/ - no source file
# reads them, and the AssetHub route was deleted. Declaring them would make
# build-release.sh warn "unset" on every build, which teaches people to ignore
# its warnings. Add the ARG when code actually reads the value.
# Bridge maintenance banner, Ybug feedback widget, bundle analyzer.
ARG NEXT_PUBLIC_ANALYZE
ARG NEXT_PUBLIC_HYPERBRIDGE_MAINTENANCE_MESSAGE
ARG NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE
ARG NEXT_PUBLIC_YBUG_ID
# Testnet faucet (route + nav + notice modal)
ARG NEXT_PUBLIC_ENABLE_FAUCET
ARG NEXT_PUBLIC_FAUCET_URL
ARG NEXT_PUBLIC_FAUCET_API_KEY

ENV POLKADEX_CHAIN=$POLKADEX_CHAIN \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=$GOOGLE_ANALYTICS \
    GRAPHQL_URL=$GRAPHQL_URL \
    GRAPHQL_WS_URL=$GRAPHQL_WS_URL \
    LANDING_PAGE=$LANDING_PAGE \
    MAIN_URL=$MAIN_URL \
    MAINTENACE_MODE=$MAINTENACE_MODE \
    ENABLE_LMP=$ENABLE_LMP \
    IS_BRIDGE_ENABLED=$IS_BRIDGE_ENABLED \
    BLOCKED_ASSETS=$BLOCKED_ASSETS \
    DEFAULT_TRANSFER_TOKEN=$DEFAULT_TRANSFER_TOKEN \
    SUBSCAN_API=$SUBSCAN_API \
    SUBQUERY_URL=$SUBQUERY_URL \
    READ_ONLY_TOKEN=$READ_ONLY_TOKEN \
    SENTRY_DSN=$SENTRY_DSN \
    SENTRY_ORG=$SENTRY_ORG \
    SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT \
    SENTRY_PROJECT=$SENTRY_PROJECT \
    SENTRY_TRACES_SAMPLE_RATE=$SENTRY_TRACES_SAMPLE_RATE \
    SENTRY_REPLAY_SESSION_SAMPLE_RATE=$SENTRY_REPLAY_SESSION_SAMPLE_RATE \
    DISABLED_FEATURES=$DISABLED_FEATURES \
    GOOGLE_API_KEY=$GOOGLE_API_KEY \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    SIGNUP_DISABLED=$SIGNUP_DISABLED \
    SHOW_SHUTDOWN_POPUP=$SHOW_SHUTDOWN_POPUP \
    UNDER_MAINTENACE=$UNDER_MAINTENACE \
    NEXT_PUBLIC_PROJECT_ID=$NEXT_PUBLIC_PROJECT_ID \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_SERVER_BASE_URL=$NEXT_PUBLIC_SERVER_BASE_URL \
    NEXT_PUBLIC_GATEWAY_SECRET=$NEXT_PUBLIC_GATEWAY_SECRET \
    NEXT_PUBLIC_SUBQUERY_URL=$NEXT_PUBLIC_SUBQUERY_URL \
    NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL=$NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL \
    NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL=$NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL \
    NEXT_PUBLIC_BRIDGE_ISMP_HOST=$NEXT_PUBLIC_BRIDGE_ISMP_HOST \
    NEXT_PUBLIC_BRIDGE_INDEXER_URL=$NEXT_PUBLIC_BRIDGE_INDEXER_URL \
    NEXT_PUBLIC_POLKADEX_STATE_MACHINE=$NEXT_PUBLIC_POLKADEX_STATE_MACHINE \
    NEXT_PUBLIC_HYPERBRIDGE_URL=$NEXT_PUBLIC_HYPERBRIDGE_URL \
    NEXT_PUBLIC_BRIDGE_MAINNET_FEES=$NEXT_PUBLIC_BRIDGE_MAINNET_FEES \
    NEXT_PUBLIC_BRIDGE_RELAYER_FEE=$NEXT_PUBLIC_BRIDGE_RELAYER_FEE \
    NEXT_PUBLIC_BRIDGE_MIN_PDEX=$NEXT_PUBLIC_BRIDGE_MIN_PDEX \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_BRIDGE_AAVE_ADDRESS=$NEXT_PUBLIC_BRIDGE_AAVE_ADDRESS \
    NEXT_PUBLIC_BRIDGE_AAVE_HFT_ADDRESS=$NEXT_PUBLIC_BRIDGE_AAVE_HFT_ADDRESS \
    NEXT_PUBLIC_BRIDGE_LINK_ADDRESS=$NEXT_PUBLIC_BRIDGE_LINK_ADDRESS \
    NEXT_PUBLIC_BRIDGE_LINK_HFT_ADDRESS=$NEXT_PUBLIC_BRIDGE_LINK_HFT_ADDRESS \
    NEXT_PUBLIC_BRIDGE_UNI_ADDRESS=$NEXT_PUBLIC_BRIDGE_UNI_ADDRESS \
    NEXT_PUBLIC_BRIDGE_UNI_HFT_ADDRESS=$NEXT_PUBLIC_BRIDGE_UNI_HFT_ADDRESS \
    NEXT_PUBLIC_BRIDGE_USDC_ADDRESS=$NEXT_PUBLIC_BRIDGE_USDC_ADDRESS \
    NEXT_PUBLIC_BRIDGE_USDC_HFT_ADDRESS=$NEXT_PUBLIC_BRIDGE_USDC_HFT_ADDRESS \
    NEXT_PUBLIC_BRIDGE_USDT_ADDRESS=$NEXT_PUBLIC_BRIDGE_USDT_ADDRESS \
    NEXT_PUBLIC_BRIDGE_USDT_HFT_ADDRESS=$NEXT_PUBLIC_BRIDGE_USDT_HFT_ADDRESS \
    NEXT_PUBLIC_BRIDGE_WBTC_ADDRESS=$NEXT_PUBLIC_BRIDGE_WBTC_ADDRESS \
    NEXT_PUBLIC_BRIDGE_WBTC_HFT_ADDRESS=$NEXT_PUBLIC_BRIDGE_WBTC_HFT_ADDRESS \
    NEXT_PUBLIC_BRIDGE_WETH_ADDRESS=$NEXT_PUBLIC_BRIDGE_WETH_ADDRESS \
    NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS=$NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS \
    NEXT_PUBLIC_BRIDGE_WSTETH_ADDRESS=$NEXT_PUBLIC_BRIDGE_WSTETH_ADDRESS \
    NEXT_PUBLIC_BRIDGE_WSTETH_HFT_ADDRESS=$NEXT_PUBLIC_BRIDGE_WSTETH_HFT_ADDRESS \
    NEXT_PUBLIC_ANALYZE=$NEXT_PUBLIC_ANALYZE \
    NEXT_PUBLIC_HYPERBRIDGE_MAINTENANCE_MESSAGE=$NEXT_PUBLIC_HYPERBRIDGE_MAINTENANCE_MESSAGE \
    NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE=$NEXT_PUBLIC_IS_HYPERBRIDGE_MAINTENANCE \
    NEXT_PUBLIC_YBUG_ID=$NEXT_PUBLIC_YBUG_ID \
    NEXT_PUBLIC_ENABLE_FAUCET=$NEXT_PUBLIC_ENABLE_FAUCET \
    NEXT_PUBLIC_FAUCET_URL=$NEXT_PUBLIC_FAUCET_URL \
    NEXT_PUBLIC_FAUCET_API_KEY=$NEXT_PUBLIC_FAUCET_API_KEY

# 2 GB is not enough once @polkadot/api + the chart libs are in the graph.
#
# This limit is PER PROCESS, not per build, and a Next build runs several Node
# processes at once - the webpack compile, a forked TypeScript checker, and the
# static-generation worker(s). The real ceiling is roughly (concurrent
# processes) x this value.
#
# 4096 on the 2-core / 7.3 GB testnet box was over-subscribed: two processes
# were each permitted 4 GB against 7.3 GB of RAM, and because V8 defers GC
# until it approaches its own limit, the kernel OOM killer arrived first. The
# symptom is a bare SIGKILL with no error text. (V8 hitting its OWN limit looks
# different: "JavaScript heap out of memory" plus a stack trace. If you see
# that, this number is too LOW.)
#
# 3072 leaves headroom for two concurrent processes plus the OS. Confirm any
# OOM with: dmesg -T | grep -i 'killed process'
# Unique per build, so /_next/static/<buildId>/_buildManifest.js gets a new URL
# each deploy. Defaulted (not bare) so build-release.sh does not warn about it as
# an unset env var - it is passed explicitly, not sourced from the env file.
ARG NEXT_BUILD_ID=
ENV NEXT_BUILD_ID=$NEXT_BUILD_ID
# Release defaults to the build id, so events are attributable to a build without
# anyone having to remember a second variable. Both are in turbo.json's
# passThroughEnv, NOT its env: they change every build, and in the cache key they
# would force a full recompile every time.
ENV SENTRY_RELEASE=${SENTRY_RELEASE:-$NEXT_BUILD_ID}

ARG NODE_HEAP_MB=3072
ENV NODE_OPTIONS="--max_old_space_size=$NODE_HEAP_MB"
ENV NEXT_TELEMETRY_DISABLED=1

# Serial by default because the Next build alone peaks near 4 GB and a parallel
# task will OOM a small VPS (exit code 137, no explanation). Raise it on a
# machine with headroom:  --build-arg TURBO_CONCURRENCY=2
ARG TURBO_CONCURRENCY=1
# Pin turbo's cache location so the mount below is guaranteed to match it.
ENV TURBO_CACHE_DIR=/app/.turbo

# `COPY . .` above invalidates this layer on ANY source change, so the build
# always re-runs. These cache mounts are what stop it re-running *from
# scratch*: Next keeps its incremental compiler cache in .next/cache and turbo
# keeps task results in .turbo, and both survive between builds on this host.
# Without them every deploy recompiles @polkadot/api and the chart libs even
# when a single line of copy changed.
#
# Cache mounts are not part of the image, so nothing here bloats the result.
# The sentry_auth_token secret is OPTIONAL (required=false): without it the build
# still succeeds, it just skips source map upload. It is read into the environment
# for the duration of this one command only, so it never appears in a layer or in
# `docker history` - which is the whole reason it is not an ARG.
RUN --mount=type=cache,target=/app/apps/hestia/.next/cache,sharing=locked \
    --mount=type=cache,target=/app/.turbo,sharing=locked \
    --mount=type=cache,target=/root/.npm,sharing=locked \
    --mount=type=secret,id=sentry_auth_token,required=false \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" \
    npx turbo run build --filter=@orderbook/hestia --concurrency=$TURBO_CONCURRENCY

# ============================================
# Stage 3: Production runner (minimal image)
# ============================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Bind all interfaces - the default (localhost) is unreachable from outside
# the container.
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/hestia/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/hestia/.next/static ./apps/hestia/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/hestia/public ./apps/hestia/public

RUN mkdir -p /app/apps/hestia/.next/cache/images \
             /app/apps/hestia/.next/cache/fetch-cache && \
    chown -R nextjs:nodejs /app/apps/hestia/.next/cache

USER nextjs
EXPOSE 3000
CMD ["node", "apps/hestia/server.js"]
