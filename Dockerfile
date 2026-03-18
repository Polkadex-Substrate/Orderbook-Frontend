# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace root files needed for dependency resolution
COPY package.json yarn.lock ./
COPY apps/hestia/package.json ./apps/hestia/
COPY packages/core/package.json ./packages/core/

# Install all dependencies (including devDependencies for the build step)
RUN yarn install --frozen-lockfile

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:18-alpine AS builder
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/hestia/node_modules ./apps/hestia/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules

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

# Build hestia (turbo builds @orderbook/core first via dependsOn)
RUN npx turbo run build --filter=@orderbook/hestia

# ============================================
# Stage 3: Production runner (minimal image)
# ============================================
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone server output
COPY --from=builder /app/apps/hestia/.next/standalone ./
# Copy static assets (CSS, JS bundles with content hashes)
COPY --from=builder /app/apps/hestia/.next/static ./apps/hestia/.next/static
# Copy public assets (charting library, icons, etc.)
COPY --from=builder /app/apps/hestia/public ./apps/hestia/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/hestia/server.js"]
