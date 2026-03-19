# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace root files needed for dependency resolution
COPY package.json yarn.lock .npmrc ./
COPY apps/hestia/package.json ./apps/hestia/
COPY packages/core/package.json ./packages/core/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/format/package.json ./packages/format/
COPY packages/tsconfig/package.json ./packages/tsconfig/

# Install all dependencies (including devDependencies for the build step)
RUN yarn install --frozen-lockfile

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY . .

# Build-time environment variables
# These are baked into the Next.js bundle at build time
ARG POLKADEX_CHAIN
ARG GOOGLE_ANALYTICS
ARG API_REGION
ARG GRAPHQL_URL
ARG IDENTITY_POOL_ID
ARG USER_POOL_ID
ARG USER_WEB_CLIENT_ID
ARG LANDING_PAGE
ARG SIGNUP_DISABLED
ARG PIN_POINT_CLIENT_ID
ARG MAINTENACE_MODE
ARG SHOW_SHUTDOWN_POPUP
ARG UNDER_MAINTENACE
ARG ENABLE_LMP
ARG IS_BRIDGE_ENABLED
ARG MAIN_URL
ARG BLOCKED_ASSETS
ARG DEFAULT_TRANSFER_TOKEN
ARG SUBSCAN_API
ARG SENTRY_DSN
ARG SENTRY_AUTH
ARG DISABLED_FEATURES
ARG GOOGLE_API_KEY
ARG GOOGLE_CLIENT_ID
ARG GRAPHQL_WS_URL
ARG USE_NEW_BACKEND
ARG SUBQUERY_URL
ARG READ_ONLY_TOKEN
ARG DEFAULT_THEA_SOURCE_CHAIN
ARG DEFAULT_THEA_DESTINATION_CHAIN
ARG DISABLED_THEA_CHAINS
ARG NEXT_PUBLIC_HYPERBRIDGE_URL

ENV POLKADEX_CHAIN=$POLKADEX_CHAIN
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$GOOGLE_ANALYTICS
ENV API_REGION=$API_REGION
ENV GRAPHQL_URL=$GRAPHQL_URL
ENV IDENTITY_POOL_ID=$IDENTITY_POOL_ID
ENV USER_POOL_ID=$USER_POOL_ID
ENV USER_WEB_CLIENT_ID=$USER_WEB_CLIENT_ID
ENV LANDING_PAGE=$LANDING_PAGE
ENV SIGNUP_DISABLED=$SIGNUP_DISABLED
ENV PIN_POINT_CLIENT_ID=$PIN_POINT_CLIENT_ID
ENV MAINTENACE_MODE=$MAINTENACE_MODE
ENV SHOW_SHUTDOWN_POPUP=$SHOW_SHUTDOWN_POPUP
ENV UNDER_MAINTENACE=$UNDER_MAINTENACE
ENV ENABLE_LMP=$ENABLE_LMP
ENV IS_BRIDGE_ENABLED=$IS_BRIDGE_ENABLED
ENV MAIN_URL=$MAIN_URL
ENV BLOCKED_ASSETS=$BLOCKED_ASSETS
ENV DEFAULT_TRANSFER_TOKEN=$DEFAULT_TRANSFER_TOKEN
ENV SUBSCAN_API=$SUBSCAN_API
ENV SENTRY_DSN=$SENTRY_DSN
ENV SENTRY_AUTH=$SENTRY_AUTH
ENV DISABLED_FEATURES=$DISABLED_FEATURES
ENV GOOGLE_API_KEY=$GOOGLE_API_KEY
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GRAPHQL_WS_URL=$GRAPHQL_WS_URL
ENV USE_NEW_BACKEND=$USE_NEW_BACKEND
ENV SUBQUERY_URL=$SUBQUERY_URL
ENV READ_ONLY_TOKEN=$READ_ONLY_TOKEN
ENV DEFAULT_THEA_SOURCE_CHAIN=$DEFAULT_THEA_SOURCE_CHAIN
ENV DEFAULT_THEA_DESTINATION_CHAIN=$DEFAULT_THEA_DESTINATION_CHAIN
ENV DISABLED_THEA_CHAINS=$DISABLED_THEA_CHAINS
ENV NEXT_PUBLIC_HYPERBRIDGE_URL=$NEXT_PUBLIC_HYPERBRIDGE_URL

ENV NODE_OPTIONS="--max_old_space_size=2048"
ENV NEXT_TELEMETRY_DISABLED=1

# Build hestia (turbo builds @orderbook/core first via dependsOn)
RUN npx turbo run build --filter=@orderbook/hestia --concurrency=1

# ============================================
# Stage 3: Production runner (minimal image)
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/apps/hestia/.next/standalone ./
# Copy static assets (CSS, JS bundles with content hashes)
COPY --from=builder --chown=nextjs:nodejs /app/apps/hestia/.next/static ./apps/hestia/.next/static
# Copy public assets (charting library, icons, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/apps/hestia/public ./apps/hestia/public

# Create the cache directory and give the Next.js user permission to write to it
RUN mkdir -p /app/apps/hestia/.next/cache/images && \
    mkdir -p /app/apps/hestia/.next/cache/fetch-cache && \
    chown -R nextjs:nodejs /app/apps/hestia/.next/cache

USER nextjs

EXPOSE 3000

CMD ["node", "apps/hestia/server.js"]
