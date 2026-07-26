#!/usr/bin/env bash
#
# One-command build + deploy for a single host.
#
# Chains the four steps that were previously run by hand:
#   1. git pull                       (skip with --no-pull)
#   2. build the Docker image         (scripts/build-release.sh)
#   3. repack it as a tarball         (--tarball --from-image, no second build)
#   4. verify + install               (scripts/install.sh)
#
# Doing this by hand is how a payload missing .next/static reached production:
# each step looked fine in isolation. Every stage here verifies its own output
# before the next one runs, and nothing touches the live install until the
# artifact has been checked.
#
# Configuration, in order of precedence:
#   command-line flags  >  scripts/deploy.conf  >  defaults
#
# scripts/deploy.conf is gitignored — copy deploy.conf.example and edit, then
# deploying is just:  sudo scripts/deploy.sh
#
# Options:
#   --domain <fqdn>     public hostname for the nginx vhost
#   --env <file>        build+runtime env file   (default apps/hestia/.env)
#   --no-pull           skip git pull
#   --no-build          reuse the existing image, just repack and install
#   --no-harden         skip host hardening (firewall/fail2ban/sysctl)
#   --plain-tls         do not use the Cloudflare origin-cert path
#   --dry-run           run the installer in preview mode; changes nothing
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DOMAIN=""
ENV_FILE="apps/hestia/.env"
IMAGE_REPO="orderbook-fe"
DO_PULL=1
DO_BUILD=1
HARDEN=1
CLOUDFLARE=1
DRY_RUN=0
EXTRA_INSTALL_ARGS=""

# shellcheck disable=SC1091
[ -r scripts/deploy.conf ] && . scripts/deploy.conf

while [ $# -gt 0 ]; do
  case "$1" in
    --domain)     DOMAIN="$2"; shift 2 ;;
    --env)        ENV_FILE="$2"; shift 2 ;;
    --no-pull)    DO_PULL=0; shift ;;
    --no-build)   DO_BUILD=0; shift ;;
    --no-harden)  HARDEN=0; shift ;;
    --plain-tls)  CLOUDFLARE=0; shift ;;
    --dry-run)    DRY_RUN=1; shift ;;
    -h|--help)    sed -n '2,36p' "$0"; exit 0 ;;
    *)            echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1;35m━━ %s\033[0m\n' "$*"; }
log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ -n "$DOMAIN" ] || die "no --domain given (and none in scripts/deploy.conf)"
[ -f "$ENV_FILE" ] || die "env file not found: $ENV_FILE"

# install.sh needs root; the build does not. Escalate only where required.
if [ "$(id -u)" -eq 0 ]; then SUDO=""
elif command -v sudo >/dev/null; then SUDO="sudo"
else die "must run as root, or have sudo available (install step needs it)"
fi

TAG="$(node -p "require('./apps/hestia/package.json').version" 2>/dev/null || echo 0.0.0)-$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"

# ── 1. Pull ─────────────────────────────────────────────────────────────
if [ "$DO_PULL" -eq 1 ]; then
  step "1/5  Updating source"
  git pull --ff-only || die "git pull failed — resolve manually and re-run with --no-pull"
else
  step "1/5  Skipping git pull"
fi

# ── 2. Image ────────────────────────────────────────────────────────────
if [ "$DO_BUILD" -eq 1 ]; then
  step "2/5  Building image"
  scripts/build-release.sh --env "$ENV_FILE" --repo "$IMAGE_REPO"
else
  step "2/5  Skipping build (--no-build)"
  docker image inspect "$IMAGE_REPO:latest" >/dev/null 2>&1 \
    || die "--no-build given but no local image $IMAGE_REPO:latest"
fi

# ── 3. Tarball ──────────────────────────────────────────────────────────
step "3/5  Packing release tarball"
rm -f dist/orderbook-fe-*.tar.gz dist/orderbook-fe-*.tar.gz.sha256 2>/dev/null || true
scripts/build-release.sh --tarball --from-image "$IMAGE_REPO:latest" --env "$ENV_FILE"

TARBALL="$(ls -1t dist/orderbook-fe-*.tar.gz 2>/dev/null | head -1)"
[ -n "$TARBALL" ] || die "no tarball produced in dist/"

# Verify the ARTIFACT before it can overwrite a working install. This is the
# check whose absence let a build with no .next/static reach production.
CHUNKS="$(tar tzf "$TARBALL" | grep -c 'apps/hestia/\.next/static/.*\.js' || true)"
[ "$CHUNKS" -gt 0 ] || die \
  "tarball contains no static JS — refusing to deploy.
  $TARBALL
The app would serve HTML and 400 on every chunk."
log "Artifact OK: $(basename "$TARBALL") ($CHUNKS static JS files)"

# ── 4. Install ──────────────────────────────────────────────────────────
step "4/5  Installing"
rm -rf dist/orderbook-fe
tar -C dist -xzf "$TARBALL"

INSTALL_ARGS="--domain $DOMAIN --env $ENV_FILE"
[ "$CLOUDFLARE" -eq 1 ] && INSTALL_ARGS="$INSTALL_ARGS --cloudflare"
[ "$HARDEN" -eq 1 ]     && INSTALL_ARGS="$INSTALL_ARGS --harden"
[ "$DRY_RUN" -eq 1 ]    && INSTALL_ARGS="$INSTALL_ARGS --dry-run"
[ -n "$EXTRA_INSTALL_ARGS" ] && INSTALL_ARGS="$INSTALL_ARGS $EXTRA_INSTALL_ARGS"

# shellcheck disable=SC2086
$SUDO dist/orderbook-fe/install.sh $INSTALL_ARGS

# ── 5. Verify ───────────────────────────────────────────────────────────
step "5/5  Verifying"
if [ "$DRY_RUN" -eq 1 ]; then
  log "Dry run — nothing was changed."
  exit 0
fi

fail=0
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3000/ || echo 000)"
[ "$code" = "200" ] && log "app  (127.0.0.1:3000)      $code" \
                    || { printf '  app  (127.0.0.1:3000)      %s\n' "$code"; fail=1; }

# A chunk, not just the HTML: the failure mode we hit served HTML fine and
# 400'd on every asset.
asset="$(tar tzf "$TARBALL" | grep -m1 'apps/hestia/\.next/static/chunks/.*\.js' \
         | sed 's|.*/\.next/static|/_next/static|')"
if [ -n "$asset" ]; then
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:3000$asset" || echo 000)"
  [ "$code" = "200" ] && log "asset $asset  $code" \
                      || { printf '  asset %s  %s  <-- static assets are broken\n' "$asset" "$code"; fail=1; }
fi

code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 -H "Host: $DOMAIN" https://127.0.0.1/ || echo 000)"
[ "$code" = "200" ] && log "nginx (https, local)       $code" \
                    || { printf '  nginx (https, local)       %s\n' "$code"; fail=1; }

echo
if [ "$fail" -eq 0 ]; then
  log "Deployed  →  https://$DOMAIN"
  echo
  echo "  Origin checks passed. Verify the public path from ANOTHER machine —"
  echo "  curling the hostname from this host short-circuits over loopback and"
  echo "  tests nothing:"
  echo "      curl -sSI https://$DOMAIN/ | grep -iE '^HTTP|^server|cf-ray'"
  echo
  echo "  If assets 404/400 in the browser but pass here, purge the CDN cache."
else
  die "post-deploy checks failed — see above.
  journalctl -u orderbook-fe -n 50 --no-pager"
fi
