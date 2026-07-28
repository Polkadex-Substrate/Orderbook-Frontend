# syntax=docker/dockerfile:1
# The syntax directive is required for `RUN --mount=type=cache` below. Without
# it, older Docker parses those flags as literal arguments and the build fails.
# ============================================================================
# OFE (apps/hestia) production image. The @aksumite/* and @mitrabook/*
# libraries are consumed from npm, so a plain `docker build .` is all that's
# needed.
#
# Build via scripts/build-release.sh (default mode), which loads the env file
# and passes every ARG below. Building by hand means passing ~46 --build-arg
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
# SENTRY_AUTH deliberately absent. It is a write-scoped Sentry token, and as an
# ARG/ENV it was recoverable from `docker history` by anyone holding the image,
# as well as being inlined into the browser bundle by next.config.js's `env`
# block. No source file reads it. Source-map upload is the only thing that
# needs it - reintroduce it as a BuildKit secret if that is ever wanted:
#   RUN --mount=type=secret,id=sentry_auth ...
# which never lands in a layer.
ARG DISABLED_FEATURES
ARG GOOGLE_API_KEY
ARG GOOGLE_CLIENT_ID
ARG DEFAULT_THEA_SOURCE_CHAIN
ARG DEFAULT_THEA_DESTINATION_CHAIN
ARG DISABLED_THEA_CHAINS
# These six are read by next.config.js `env:` and were being passed at build
# time, but had no matching ARG here - so Docker discarded them and every image
# was built with them empty. Feature flags failing silently open. Any new entry
# in that `env:` block needs an ARG here too, or it silently becomes "".
ARG SIGNUP_DISABLED
ARG SHOW_SHUTDOWN_POPUP
ARG UNDER_MAINTENACE
# WalletConnect - app THROWS AT BOOT without it (src/config/wagmi.ts)
ARG NEXT_PUBLIC_PROJECT_ID
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
# Public origin - metadataBase for OG/Twitter image URLs
ARG NEXT_PUBLIC_SITE_URL
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
    DISABLED_FEATURES=$DISABLED_FEATURES \
    GOOGLE_API_KEY=$GOOGLE_API_KEY \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    DEFAULT_THEA_SOURCE_CHAIN=$DEFAULT_THEA_SOURCE_CHAIN \
    DEFAULT_THEA_DESTINATION_CHAIN=$DEFAULT_THEA_DESTINATION_CHAIN \
    DISABLED_THEA_CHAINS=$DISABLED_THEA_CHAINS \
    SIGNUP_DISABLED=$SIGNUP_DISABLED \
    SHOW_SHUTDOWN_POPUP=$SHOW_SHUTDOWN_POPUP \
    UNDER_MAINTENACE=$UNDER_MAINTENACE \
    NEXT_PUBLIC_PROJECT_ID=$NEXT_PUBLIC_PROJECT_ID \
    NEXT_PUBLIC_SERVER_BASE_URL=$NEXT_PUBLIC_SERVER_BASE_URL \
    NEXT_PUBLIC_GATEWAY_SECRET=$NEXT_PUBLIC_GATEWAY_SECRET \
    NEXT_PUBLIC_SUBQUERY_URL=$NEXT_PUBLIC_SUBQUERY_URL \
    NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL=$NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL \
    NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL=$NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL \
    NEXT_PUBLIC_BRIDGE_ISMP_HOST=$NEXT_PUBLIC_BRIDGE_ISMP_HOST \
    NEXT_PUBLIC_BRIDGE_INDEXER_URL=$NEXT_PUBLIC_BRIDGE_INDEXER_URL \
    NEXT_PUBLIC_POLKADEX_STATE_MACHINE=$NEXT_PUBLIC_POLKADEX_STATE_MACHINE \
    NEXT_PUBLIC_HYPERBRIDGE_URL=$NEXT_PUBLIC_HYPERBRIDGE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
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
RUN --mount=type=cache,target=/app/apps/hestia/.next/cache,sharing=locked \
    --mount=type=cache,target=/app/.turbo,sharing=locked \
    --mount=type=cache,target=/root/.npm,sharing=locked \
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
