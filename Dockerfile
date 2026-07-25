# ============================================================================
# OFE (apps/hestia) production image.
#
# IMPORTANT — BUILD CONTEXT IS THE PARENT DIRECTORY (`mainnet/`), NOT THIS REPO.
# apps/hestia depends on @mitra/* via `file:../../../mitra-ts/packages/*`, which
# resolves OUTSIDE this repository. A build context rooted here cannot see
# those packages and `yarn install` fails. Build with:
#
#   cd mainnet
#   docker build -f Polkadex-Orderbook-Frontend/Dockerfile -t ofe:latest .
#
# (docker-compose.yml in this repo already sets `context: ..` accordingly.)
# Once @mitra/* is published to npm and the file: deps become semver ranges,
# the context can move back to this repo and the mitra-ts COPY lines dropped.
# ============================================================================

# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# The @mitra/* libraries. yarn COPIES file: deps at install time, so their
# built output (dist/, lib/) must already exist — see DEPLOYMENT.md.
COPY mitra-ts /mitra-ts

# Workspace manifests needed for dependency resolution
COPY Polkadex-Orderbook-Frontend/package.json \
     Polkadex-Orderbook-Frontend/yarn.lock \
     Polkadex-Orderbook-Frontend/.npmrc ./
COPY Polkadex-Orderbook-Frontend/apps/hestia/package.json ./apps/hestia/
COPY Polkadex-Orderbook-Frontend/packages/core/package.json ./packages/core/
COPY Polkadex-Orderbook-Frontend/packages/chart/package.json ./packages/chart/
COPY Polkadex-Orderbook-Frontend/packages/eslint-config/package.json ./packages/eslint-config/
COPY Polkadex-Orderbook-Frontend/packages/format/package.json ./packages/format/
COPY Polkadex-Orderbook-Frontend/packages/tsconfig/package.json ./packages/tsconfig/

RUN yarn install --frozen-lockfile

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /mitra-ts /mitra-ts
COPY Polkadex-Orderbook-Frontend/. .

# ── Build-time environment ──────────────────────────────────────────────
# NEXT_PUBLIC_* values are BAKED INTO THE BROWSER BUNDLE here. They cannot be
# changed at container runtime — a value change means a rebuild. They are also
# public: never put a real secret in one.
# Keep this list in sync with apps/hestia/.env.example.
ARG POLKADEX_CHAIN
ARG GOOGLE_ANALYTICS
ARG API_REGION
ARG GRAPHQL_URL
ARG GRAPHQL_WS_URL
ARG USE_NEW_BACKEND
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
ARG SENTRY_AUTH
ARG DISABLED_FEATURES
ARG GOOGLE_API_KEY
ARG GOOGLE_CLIENT_ID
ARG DEFAULT_THEA_SOURCE_CHAIN
ARG DEFAULT_THEA_DESTINATION_CHAIN
ARG DISABLED_THEA_CHAINS
# WalletConnect — app THROWS AT BOOT without it (src/config/wagmi.ts)
ARG NEXT_PUBLIC_PROJECT_ID
# Chart
ARG NEXT_PUBLIC_NATIVE_CHART
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
# Testnet faucet (route + nav + notice modal)
ARG NEXT_PUBLIC_ENABLE_FAUCET
ARG NEXT_PUBLIC_FAUCET_URL
ARG NEXT_PUBLIC_FAUCET_API_KEY

ENV POLKADEX_CHAIN=$POLKADEX_CHAIN \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=$GOOGLE_ANALYTICS \
    API_REGION=$API_REGION \
    GRAPHQL_URL=$GRAPHQL_URL \
    GRAPHQL_WS_URL=$GRAPHQL_WS_URL \
    USE_NEW_BACKEND=$USE_NEW_BACKEND \
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
    SENTRY_AUTH=$SENTRY_AUTH \
    DISABLED_FEATURES=$DISABLED_FEATURES \
    GOOGLE_API_KEY=$GOOGLE_API_KEY \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    DEFAULT_THEA_SOURCE_CHAIN=$DEFAULT_THEA_SOURCE_CHAIN \
    DEFAULT_THEA_DESTINATION_CHAIN=$DEFAULT_THEA_DESTINATION_CHAIN \
    DISABLED_THEA_CHAINS=$DISABLED_THEA_CHAINS \
    NEXT_PUBLIC_PROJECT_ID=$NEXT_PUBLIC_PROJECT_ID \
    NEXT_PUBLIC_NATIVE_CHART=$NEXT_PUBLIC_NATIVE_CHART \
    NEXT_PUBLIC_SERVER_BASE_URL=$NEXT_PUBLIC_SERVER_BASE_URL \
    NEXT_PUBLIC_GATEWAY_SECRET=$NEXT_PUBLIC_GATEWAY_SECRET \
    NEXT_PUBLIC_SUBQUERY_URL=$NEXT_PUBLIC_SUBQUERY_URL \
    NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL=$NEXT_PUBLIC_BRIDGE_DESTINATION_RPC_URL \
    NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL=$NEXT_PUBLIC_BRIDGE_SEPOLIA_RPC_URL \
    NEXT_PUBLIC_BRIDGE_ISMP_HOST=$NEXT_PUBLIC_BRIDGE_ISMP_HOST \
    NEXT_PUBLIC_BRIDGE_INDEXER_URL=$NEXT_PUBLIC_BRIDGE_INDEXER_URL \
    NEXT_PUBLIC_POLKADEX_STATE_MACHINE=$NEXT_PUBLIC_POLKADEX_STATE_MACHINE \
    NEXT_PUBLIC_HYPERBRIDGE_URL=$NEXT_PUBLIC_HYPERBRIDGE_URL \
    NEXT_PUBLIC_ENABLE_FAUCET=$NEXT_PUBLIC_ENABLE_FAUCET \
    NEXT_PUBLIC_FAUCET_URL=$NEXT_PUBLIC_FAUCET_URL \
    NEXT_PUBLIC_FAUCET_API_KEY=$NEXT_PUBLIC_FAUCET_API_KEY

# 2 GB is not enough once @polkadot/api + the chart libs are in the graph.
ENV NODE_OPTIONS="--max_old_space_size=4096"
ENV NEXT_TELEMETRY_DISABLED=1

# turbo builds @orderbook/core and @orderbook/chart first via dependsOn
RUN npx turbo run build --filter=@orderbook/hestia --concurrency=1

# ============================================
# Stage 3: Production runner (minimal image)
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Bind all interfaces — the default (localhost) is unreachable from outside
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
