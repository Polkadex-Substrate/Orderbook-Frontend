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
# scripts/deploy.conf is gitignored - copy deploy.conf.example and edit, then
# deploying is just:  sudo scripts/deploy.sh
#
# Options:
#   --domain <fqdn>     public hostname for the nginx vhost
#   --env <file>        build+runtime env file   (default apps/hestia/.env)
#   --no-pull           skip git pull
#   --no-build          reuse the existing image, just repack and install
#   --plain-tls         do not use the Cloudflare origin-cert path
#   --dry-run           run the installer in preview mode; changes nothing
#
# Host hardening is NOT part of a normal deploy. It resets the firewall,
# reinstalls fail2ban and rewrites sysctl - fine once, wrong on every push.
#   (default)           skip it if this host has been hardened before;
#                       otherwise offer it once, interactively
#   --harden            apply it regardless
#   --no-harden         never apply it, and never ask (use this in CI)
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DOMAIN=""
BUILD_ENV_FILE="apps/hestia/.env"
IMAGE_REPO="orderbook-fe"
DO_PULL=1
DO_BUILD=1
# auto = decide at run time (see below). 1 = always, 0 = never.
HARDEN=auto
CLOUDFLARE=1
SERVICE_NAME=orderbook-fe
DRY_RUN=0
# Keep one rollback target. Each backup is ~140 MB; older ones are never used.
KEEP_BACKUPS=1
REPLACE_ENV=0
EXTRA_INSTALL_ARGS=""

# shellcheck disable=SC1091
[ -r scripts/deploy.conf ] && . scripts/deploy.conf

# Back-compat. This variable used to be called ENV_FILE, which collided with
# install.sh's ENV_FILE - that one is the RUNTIME env at
# /etc/orderbook-fe/orderbook-fe.env, a different file entirely. harden.sh does
# `sed -i` on whichever it inherits, so the two names had to be separated.
#
# scripts/deploy.conf is gitignored, so existing ones on deployed hosts still set
# the old name. Honour it, loudly, rather than silently reverting to the default.
# Read before the flag loop below, so --env still wins.
LEGACY_ENV_FILE="${ENV_FILE:-}"
[ -n "$LEGACY_ENV_FILE" ] && BUILD_ENV_FILE="$LEGACY_ENV_FILE"

while [ $# -gt 0 ]; do
  case "$1" in
    --domain)     DOMAIN="$2"; shift 2 ;;
    --env)        BUILD_ENV_FILE="$2"; shift 2 ;;
    --no-pull)    DO_PULL=0; shift ;;
    --no-build)   DO_BUILD=0; shift ;;
    --harden)     HARDEN=1; shift ;;
    --no-harden)  HARDEN=0; shift ;;
    --plain-tls)  CLOUDFLARE=0; shift ;;
    --dry-run)    DRY_RUN=1; shift ;;
    --keep-backups) KEEP_BACKUPS="$2"; shift 2 ;;
    --replace-env)  REPLACE_ENV=1; shift ;;
    -h|--help)    sed -n '2,36p' "$0"; exit 0 ;;
    *)            echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1;35m== %s\033[0m\n' "$*"; }
log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

if [ -n "$LEGACY_ENV_FILE" ]; then
  warn "scripts/deploy.conf sets ENV_FILE, which was renamed to BUILD_ENV_FILE.
     Using it for now: $LEGACY_ENV_FILE
     Rename the key in scripts/deploy.conf - this shim will be removed."
fi

[ -n "$DOMAIN" ] || die "no --domain given (and none in scripts/deploy.conf)"
[ -f "$BUILD_ENV_FILE" ] || die "env file not found: $BUILD_ENV_FILE"

# install.sh needs root; the build does not. Escalate only where required.
if [ "$(id -u)" -eq 0 ]; then SUDO=""
elif command -v sudo >/dev/null; then SUDO="sudo"
else die "must run as root, or have sudo available (install step needs it)"
fi

TAG="$(node -p "require('./apps/hestia/package.json').version" 2>/dev/null || echo 0.0.0)-$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"

# ── 1. Pull ─────────────────────────────────────────────────────────────
if [ "$DO_PULL" -eq 1 ]; then
  step "1/5  Updating source"
  git pull --ff-only || die "git pull failed - resolve manually and re-run with --no-pull"
else
  step "1/5  Skipping git pull"
fi

# ── 2. Image ────────────────────────────────────────────────────────────
if [ "$DO_BUILD" -eq 1 ]; then
  step "2/5  Building image"
  scripts/build-release.sh --env "$BUILD_ENV_FILE" --repo "$IMAGE_REPO"
else
  step "2/5  Skipping build (--no-build)"
  docker image inspect "$IMAGE_REPO:latest" >/dev/null 2>&1 \
    || die "--no-build given but no local image $IMAGE_REPO:latest"
fi

# ── 3. Tarball ──────────────────────────────────────────────────────────
step "3/5  Packing release tarball"
rm -f dist/orderbook-fe-*.tar.gz dist/orderbook-fe-*.tar.gz.sha256 2>/dev/null || true
scripts/build-release.sh --tarball --from-image "$IMAGE_REPO:latest" --env "$BUILD_ENV_FILE"

TARBALL="$(ls -1t dist/orderbook-fe-*.tar.gz 2>/dev/null | head -1)"
[ -n "$TARBALL" ] || die "no tarball produced in dist/"

# Verify the ARTIFACT before it can overwrite a working install. This is the
# check whose absence let a build with no .next/static reach production.
CHUNKS="$(tar tzf "$TARBALL" | grep -c 'apps/hestia/\.next/static/.*\.js' || true)"
[ "$CHUNKS" -gt 0 ] || die \
  "tarball contains no static JS - refusing to deploy.
  $TARBALL
The app would serve HTML and 400 on every chunk."
log "Artifact OK: $(basename "$TARBALL") ($CHUNKS static JS files)"

# ── Resolve the hardening decision ──────────────────────────────────────
# Deliberately before the install step: if this asks a question, it should ask
# before anything on the host has changed, not halfway through.
#
# install.sh writes /etc/<svc>/.hardened once host hardening has run. Keying
# off that rather than "is this the first deploy" is what we actually mean -
# a host can be redeployed many times and still never have been hardened.
HARDEN_MARKER="/etc/$SERVICE_NAME/.hardened"
if [ "$HARDEN" = "auto" ]; then
  if [ -f "$HARDEN_MARKER" ]; then
    HARDEN=0
    log "Host already hardened ($(sed -n 's/^hardened_at=//p' "$HARDEN_MARKER" 2>/dev/null || echo 'date unknown')) - skipping"
  elif [ "$DRY_RUN" -eq 1 ]; then
    HARDEN=0
    log "Host not hardened yet. A real run would offer it here."
  elif [ -t 0 ]; then
    echo
    echo "  This host has not been hardened yet. Hardening applies:"
    echo "    - default-deny firewall (ssh/80/443 only, Cloudflare-scoped if --cloudflare)"
    echo "    - fail2ban, automatic security updates, kernel/sysctl tightening"
    echo "    - binds the app to 127.0.0.1 so only the proxy can reach it"
    echo
    echo "  It resets the firewall, so do not run it over a link you cannot"
    echo "  afford to lose. It is a one-time step, not part of each deploy."
    echo
    printf '  Apply host hardening now? [y/N] '
    read -r reply
    case "$reply" in
      [yY]*) HARDEN=1 ;;
      *)     HARDEN=0; log "Skipping. Apply later with: sudo scripts/deploy.sh --harden" ;;
    esac
  else
    HARDEN=0
    warn "Host is not hardened and this is not an interactive shell, so it was
     skipped. Run 'sudo scripts/deploy.sh --harden' from a terminal."
  fi
fi

# ── 4. Install ──────────────────────────────────────────────────────────
step "4/5  Installing"
rm -rf dist/orderbook-fe
tar -C dist -xzf "$TARBALL"

INSTALL_ARGS="--domain $DOMAIN --env $BUILD_ENV_FILE --keep-backups $KEEP_BACKUPS"
[ "$CLOUDFLARE" -eq 1 ]  && INSTALL_ARGS="$INSTALL_ARGS --cloudflare"
[ "$HARDEN" -eq 1 ]      && INSTALL_ARGS="$INSTALL_ARGS --harden"
[ "$DRY_RUN" -eq 1 ]     && INSTALL_ARGS="$INSTALL_ARGS --dry-run"
[ "$REPLACE_ENV" -eq 1 ] && INSTALL_ARGS="$INSTALL_ARGS --replace-env"
[ -n "$EXTRA_INSTALL_ARGS" ] && INSTALL_ARGS="$INSTALL_ARGS $EXTRA_INSTALL_ARGS"

# shellcheck disable=SC2086
$SUDO dist/orderbook-fe/install.sh $INSTALL_ARGS

# ── 5. Verify ───────────────────────────────────────────────────────────
step "5/5  Verifying"
if [ "$DRY_RUN" -eq 1 ]; then
  log "Dry run - nothing was changed."
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
  echo "  Origin checks passed. Verify the public path from ANOTHER machine -"
  echo "  curling the hostname from this host short-circuits over loopback and"
  echo "  tests nothing:"
  echo "      curl -sSI https://$DOMAIN/ | grep -iE '^HTTP|^server|cf-ray'"
  echo
  echo "  If assets 404/400 in the browser but pass here, purge the CDN cache."
else
  die "post-deploy checks failed - see above.
  journalctl -u orderbook-fe -n 50 --no-pager"
fi
