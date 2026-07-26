#!/usr/bin/env bash
#
# Build a release of the Orderbook frontend.
#
# Two modes, same env file, same version stamp:
#
#   docker  (DEFAULT) — build an OCI image from the repo Dockerfile.
#                       Produces <repo>:<version>-<sha> and <repo>:latest.
#   tarball           — build a self-contained tarball for scripts/install.sh
#                       (bare-metal / systemd deploys, no Docker on the host).
#
# IMPORTANT: NEXT_PUBLIC_* and the next.config.js `env:` values are compiled
# into the build. The artifact is therefore specific to ONE environment — to
# build for staging and production, run this twice with different --env files.
# Only genuinely runtime settings (PORT, HOSTNAME, NODE_ENV) can differ later.
#
# Why this script rather than a bare `docker compose build`: compose
# interpolates ${VAR} in the compose file from the shell or a ROOT .env only.
# `env_file:` applies to the running container, NOT to build args. So a plain
# `docker compose build` silently bakes EMPTY values — including
# NEXT_PUBLIC_PROJECT_ID, without which the app throws at boot. This script
# exports the env file before building, which is the fix.
#
# Usage:
#   scripts/build-release.sh                        # docker image (default)
#   scripts/build-release.sh --tarball              # tarball instead
#   scripts/build-release.sh --env path/to.env      # explicit env file
#   scripts/build-release.sh --repo my/orderbook-fe # image repo name
#   scripts/build-release.sh --tag v1.2.3           # override the tag
#   scripts/build-release.sh --push                 # push after building
#   scripts/build-release.sh --platform linux/arm64 # cross-build
#   scripts/build-release.sh --skip-install         # tarball: reuse node_modules
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MODE=docker
ENV_FILE="apps/hestia/.env"
SKIP_INSTALL=0
IMAGE_REPO="orderbook-fe"
IMAGE_TAG=""
PUSH=0
PLATFORM=""

while [ $# -gt 0 ]; do
  case "$1" in
    --docker)       MODE=docker; shift ;;
    --tarball)      MODE=tarball; shift ;;
    --env)          ENV_FILE="$2"; shift 2 ;;
    --repo)         IMAGE_REPO="$2"; shift 2 ;;
    --tag)          IMAGE_TAG="$2"; shift 2 ;;
    --push)         PUSH=1; shift ;;
    --platform)     PLATFORM="$2"; shift 2 ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    -h|--help)      sed -n '2,33p' "$0"; exit 0 ;;
    *)              echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "env file not found: $ENV_FILE
Copy apps/hestia/.env.example and fill it in, or pass --env <path>."

# ── Version stamp (shared by both modes) ────────────────────────────────
VERSION="$(node -p "require('./apps/hestia/package.json').version" 2>/dev/null \
  || grep -m1 '"version"' apps/hestia/package.json | sed -E 's/.*"([^"]+)".*/\1/')"
GITSHA="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
DIRTY=""
git diff --quiet 2>/dev/null || DIRTY="-dirty"
STAMP="${VERSION}-${GITSHA}${DIRTY}"
[ -n "$IMAGE_TAG" ] || IMAGE_TAG="$STAMP"

# ── Load the env file ───────────────────────────────────────────────────
# `set -a` exports everything sourced, which is what makes the values visible
# to `docker build --build-arg` below and to `next build` in tarball mode.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

: "${NEXT_PUBLIC_PROJECT_ID:?NEXT_PUBLIC_PROJECT_ID is required — the app throws at boot without it}"

log "orderbook-fe $STAMP  (mode: $MODE, env: $ENV_FILE)"

# ════════════════════════════════════════════════════════════════════════
# Docker mode
# ════════════════════════════════════════════════════════════════════════
if [ "$MODE" = docker ]; then
  command -v docker >/dev/null \
    || die "docker is not installed (use --tarball for a bare-metal build)"
  docker info >/dev/null 2>&1 \
    || die "cannot reach the Docker daemon — is it running, and are you in the 'docker' group?"

  # Derive the build-arg list from the Dockerfile itself, so a newly added ARG
  # is passed automatically instead of silently defaulting to empty. That is
  # exactly the bug that left six feature flags unset in every image built so
  # far: compose passed them, the Dockerfile never declared them.
  BUILD_ARGS=()
  MISSING=()
  RESOLVED=0
  while read -r name; do
    [ -n "$name" ] || continue
    if [ -n "${!name:-}" ]; then
      # Two array elements per arg — count separately, don't use ${#BUILD_ARGS[@]}.
      BUILD_ARGS+=(--build-arg "$name=${!name}")
      RESOLVED=$((RESOLVED + 1))
    else
      MISSING+=("$name")
    fi
  done < <(grep -oE '^ARG [A-Z_][A-Z0-9_]*' Dockerfile | awk '{print $2}' | sort -u)

  if [ ${#MISSING[@]} -gt 0 ]; then
    warn "${#MISSING[@]} build arg(s) unset in $ENV_FILE, baked empty:
     ${MISSING[*]}"
  fi

  # A faucet that is switched on but has no endpoint fails at the point of use,
  # after the user has already been sent to /faucet from the Fund Account modal.
  if [ "${NEXT_PUBLIC_ENABLE_FAUCET:-}" = "true" ] && [ -z "${NEXT_PUBLIC_FAUCET_URL:-}" ]; then
    warn "NEXT_PUBLIC_ENABLE_FAUCET=true but NEXT_PUBLIC_FAUCET_URL is empty —
     the faucet page will be reachable and non-functional."
  fi

  log "Building ${IMAGE_REPO}:${IMAGE_TAG}  ($RESOLVED build args)"
  docker build \
    ${PLATFORM:+--platform "$PLATFORM"} \
    "${BUILD_ARGS[@]}" \
    -t "${IMAGE_REPO}:${IMAGE_TAG}" \
    -t "${IMAGE_REPO}:latest" \
    -f Dockerfile \
    .

  if [ "$PUSH" -eq 1 ]; then
    log "Pushing ${IMAGE_REPO}"
    docker push "${IMAGE_REPO}:${IMAGE_TAG}"
    docker push "${IMAGE_REPO}:latest"
  fi

  SIZE="$(docker image inspect "${IMAGE_REPO}:${IMAGE_TAG}" --format '{{.Size}}' 2>/dev/null \
    | awk '{printf "%.0f MB", $1/1024/1024}')"

  log "Done"
  echo
  echo "  Image : ${IMAGE_REPO}:${IMAGE_TAG}"
  echo "  Also  : ${IMAGE_REPO}:latest"
  echo "  Size  : ${SIZE:-unknown}"
  echo
  echo "Run it:"
  echo "  docker run --rm -p 3000:3000 --env-file $ENV_FILE ${IMAGE_REPO}:${IMAGE_TAG}"
  echo
  echo "Or via compose:"
  echo "  IMAGE_REPO=$IMAGE_REPO IMAGE_TAG=$IMAGE_TAG docker compose up -d"
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════
# Tarball mode
# ════════════════════════════════════════════════════════════════════════
command -v node >/dev/null || die "node is not installed"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
# 22, not 20: @hyperbridge/sdk declares engines.node ">=22.x.x", so yarn
# refuses to install on 20. Node 20 also went EOL in April 2026.
[ "$NODE_MAJOR" -ge 22 ] || die "Node 22+ required (@hyperbridge/sdk), found $(node -v)"
command -v yarn >/dev/null \
  || die "yarn is not installed (corepack enable; corepack prepare yarn@1.22.19 --activate)"

OUT_DIR="$REPO_ROOT/dist"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

if [ "$SKIP_INSTALL" -eq 0 ]; then
  log "Installing dependencies (frozen lockfile)"
  yarn install --frozen-lockfile
fi

log "Running production build"
NODE_OPTIONS="${NODE_OPTIONS:---max_old_space_size=4096}" \
NEXT_TELEMETRY_DISABLED=1 \
  yarn build

STANDALONE="apps/hestia/.next/standalone"
[ -d "$STANDALONE" ] || die "standalone output missing — is output:'standalone' still set in next.config.js?"

log "Assembling release tree"
PKG="$STAGE/orderbook-fe"
mkdir -p "$PKG"
cp -R "$STANDALONE"/. "$PKG"/

# Next deliberately excludes these two from the standalone output.
mkdir -p "$PKG/apps/hestia/.next"
cp -R apps/hestia/.next/static "$PKG/apps/hestia/.next/static"
cp -R apps/hestia/public       "$PKG/apps/hestia/public"

# Runtime metadata, so a deployed host can report what it is running.
cat > "$PKG/RELEASE" <<EOF
name=orderbook-fe
version=$VERSION
commit=$GITSHA$DIRTY
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
built_from=$(hostname 2>/dev/null || echo unknown)
node=$(node -v)
EOF

# Ship the installer alongside the payload so the tarball is self-sufficient.
cp scripts/install.sh    "$PKG/install.sh"
cp scripts/uninstall.sh  "$PKG/uninstall.sh" 2>/dev/null || true
cp scripts/lib/harden.sh "$PKG/harden.sh"    2>/dev/null || true
chmod +x "$PKG/install.sh" "$PKG/uninstall.sh" 2>/dev/null || true

mkdir -p "$OUT_DIR"
TARBALL="$OUT_DIR/orderbook-fe-${STAMP}.tar.gz"
log "Creating $TARBALL"
tar -C "$STAGE" -czf "$TARBALL" orderbook-fe

( cd "$OUT_DIR" && sha256sum "$(basename "$TARBALL")" > "$(basename "$TARBALL").sha256" 2>/dev/null \
  || shasum -a 256 "$(basename "$TARBALL")" > "$(basename "$TARBALL").sha256" )

log "Done"
echo
echo "  Artifact : $TARBALL"
echo "  Checksum : $TARBALL.sha256"
echo "  Size     : $(du -h "$TARBALL" | cut -f1)"
echo
echo "Deploy with:"
echo "  scp $TARBALL user@host:/tmp/"
echo "  ssh user@host 'cd /tmp && tar xzf $(basename "$TARBALL") && sudo orderbook-fe/install.sh'"
