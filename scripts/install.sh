#!/usr/bin/env bash
#
# Orderbook frontend installer.
#
# Installs the app as a system service on the major Linux families:
#   Debian / Ubuntu / Raspbian        (apt,    systemd)
#   RHEL / CentOS / Rocky / Alma      (dnf|yum, systemd)
#   Fedora                            (dnf,    systemd)
#   openSUSE / SLES                   (zypper, systemd)
#   Arch / Manjaro                    (pacman, systemd)
#   Alpine                            (apk,    OpenRC)
#   Amazon Linux 2 / 2023             (dnf|yum, systemd)
#
# Run from an unpacked release tarball:
#   sudo ./install.sh
#
# Options:
#   --port <n>          listen port                       (default 3000)
#   --user <name>       service account                   (default orderbook)
#   --prefix <dir>      install location                  (default /opt/orderbook-fe)
#   --env <file>        runtime env to install            (default ./orderbook-fe.env if present)
#   --with-nginx        install and configure an nginx reverse proxy
#   --domain <fqdn>     domain for the nginx vhost        (implies --with-nginx)
#   --no-start          install but do not start the service
#   --dry-run           print what would happen, change nothing
#   --keep-backups <n>  previous installs to retain           (default 3, 0 = none)
#   --replace-env       overwrite the installed runtime env from --env
#                       (default: an existing /etc/<svc>/<svc>.env is KEPT)
#
# Hardening (see scripts/lib/harden.sh for what each one defends against):
#   --harden            sysctl + firewall + fail2ban + auto-updates + proxy-only bind
#   --harden-ssh        additionally enforce key-only SSH, no root login
#                       (refuses to run if no authorized_keys exists)
#   --ssh-port <n>      SSH port to keep open in the firewall  (default 22)
#   --no-harden         service sandbox only; skip all host changes
#
# TLS / Cloudflare:
#   --cloudflare        terminate TLS with a Cloudflare Origin CA certificate,
#                       restore the real client IP from CF-Connecting-IP, and
#                       (with --harden) restrict 80/443 to Cloudflare's ranges
#   --cf-cert <path>    origin certificate (default /etc/ssl/cloudflare/origin.pem)
#   --cf-key  <path>    origin private key (default /etc/ssl/cloudflare/origin.key)
#   --cf-origin-pull    additionally require Cloudflare's client certificate
#                       (Authenticated Origin Pulls) - strongest origin lock
#
# The systemd sandbox is ALWAYS applied. Everything else is opt-in, because
# reconfiguring a firewall or SSH on someone else's server without asking is
# how people lock themselves out.
#
set -euo pipefail

PORT=3000
SVC_USER=orderbook
PREFIX=/opt/orderbook-fe
ENV_SRC=""
WITH_NGINX=0
DOMAIN=""
NO_START=0
DRY_RUN=0
HARDEN=0
HARDEN_SSH=0
SSH_PORT=22
SERVICE_NAME=orderbook-fe
CLOUDFLARE=0
CF_CERT=/etc/ssl/cloudflare/origin.pem
CF_KEY=/etc/ssl/cloudflare/origin.key
CF_ORIGIN_PULL=0
# One rollback target, not three. Each backup is ~140 MB, so the old default of
# 3 sat on ~420 MB permanently. In practice a rollback happens immediately after
# a bad deploy or not at all - the second- and third-oldest trees were never
# used, and a full disk breaks the RUNNING service, not just the next deploy.
# Override with --keep-backups N (0 keeps none, at the cost of no rollback).
KEEP_BACKUPS=1
REPLACE_ENV=0

while [ $# -gt 0 ]; do
  case "$1" in
    --port)        PORT="$2"; shift 2 ;;
    --user)        SVC_USER="$2"; shift 2 ;;
    --prefix)      PREFIX="$2"; shift 2 ;;
    --env)         ENV_SRC="$2"; shift 2 ;;
    --with-nginx)  WITH_NGINX=1; shift ;;
    --domain)      DOMAIN="$2"; WITH_NGINX=1; shift 2 ;;
    --no-start)    NO_START=1; shift ;;
    --dry-run)     DRY_RUN=1; shift ;;
    --harden)      HARDEN=1; shift ;;
    --harden-ssh)  HARDEN=1; HARDEN_SSH=1; shift ;;
    --ssh-port)    SSH_PORT="$2"; shift 2 ;;
    --no-harden)   HARDEN=0; shift ;;
    --cloudflare)  CLOUDFLARE=1; WITH_NGINX=1; shift ;;
    --cf-cert)     CF_CERT="$2"; CLOUDFLARE=1; WITH_NGINX=1; shift 2 ;;
    --cf-key)      CF_KEY="$2";  CLOUDFLARE=1; WITH_NGINX=1; shift 2 ;;
    --cf-origin-pull) CF_ORIGIN_PULL=1; CLOUDFLARE=1; WITH_NGINX=1; shift ;;
    --keep-backups) KEEP_BACKUPS="$2"; shift 2 ;;
    --replace-env)  REPLACE_ENV=1; shift ;;
    -h|--help)     sed -n '2,55p' "$0"; exit 0 ;;
    *)             echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }
run()  { if [ "$DRY_RUN" -eq 1 ]; then printf '  [dry-run] %s\n' "$*"; else eval "$@"; fi; }

[ "$(id -u)" -eq 0 ] || die "must run as root (use sudo)"

# Validate anything that gets interpolated into config files or commands.
case "$PORT"     in ''|*[!0-9]*) die "invalid --port: $PORT" ;; esac
case "$SSH_PORT" in ''|*[!0-9]*) die "invalid --ssh-port: $SSH_PORT" ;; esac
[ "$PORT" -ge 1 ] && [ "$PORT" -le 65535 ] || die "--port out of range: $PORT"
echo "$SVC_USER" | grep -Eq '^[a-z_][a-z0-9_-]{0,31}$' || die "invalid --user: $SVC_USER"
case "$PREFIX" in /*) : ;; *) die "--prefix must be an absolute path: $PREFIX" ;; esac
if [ -n "$DOMAIN" ]; then
  echo "$DOMAIN" | grep -Eq '^[A-Za-z0-9._-]+$' || die "invalid --domain: $DOMAIN"
fi
# Does any SAN in $2 (newline-separated) cover hostname $1?
# TLS wildcards match EXACTLY ONE label: *.example.com covers a.example.com
# but neither example.com nor a.b.example.com. Getting this wrong is what
# produces Cloudflare 526 "Invalid SSL certificate", which names neither the
# certificate nor the hostname and is therefore miserable to debug.
cert_san_covers() {
  local host="$1" san suffix head rest
  while IFS= read -r san; do
    [ -n "$san" ] || continue
    case "$san" in
      \*.*)
        suffix="${san#\*.}"
        head="${host%%.*}"
        rest="${host#*.}"
        # `head != host` rules out a bare apex matching *.apex
        [ "$rest" = "$suffix" ] && [ "$head" != "$host" ] && return 0
        ;;
      *)
        [ "$san" = "$host" ] && return 0
        ;;
    esac
  done <<EOF
$2
EOF
  return 1
}

if [ "$CLOUDFLARE" -eq 1 ]; then
  [ -n "$DOMAIN" ] || die "--cloudflare requires --domain (the cert is issued for a hostname)"
  case "$CF_CERT" in /*) : ;; *) die "--cf-cert must be an absolute path: $CF_CERT" ;; esac
  case "$CF_KEY"  in /*) : ;; *) die "--cf-key must be an absolute path: $CF_KEY" ;; esac
  if [ "$DRY_RUN" -eq 0 ]; then
    # Everything below fails BEFORE nginx is reconfigured, so a bad cert can
    # never take the site down - you get a named error instead of a 526.
    [ -r "$CF_CERT" ] || die "Cloudflare origin certificate not readable: $CF_CERT
Create one in the Cloudflare dashboard (SSL/TLS -> Origin Server -> Create
Certificate), save the certificate and key to that path, then re-run."
    [ -r "$CF_KEY" ]  || die "Cloudflare origin key not readable: $CF_KEY"
    openssl x509 -in "$CF_CERT" -noout >/dev/null 2>&1 \
      || die "$CF_CERT is not a valid PEM certificate"

    # 1. Cert and key must be a pair. Compared via public key so this works
    #    for ECDSA origin certs as well as RSA.
    cert_pub="$(openssl x509 -in "$CF_CERT" -noout -pubkey 2>/dev/null | openssl md5)"
    key_pub="$(openssl pkey -in "$CF_KEY" -pubout 2>/dev/null | openssl md5)"
    [ -n "$key_pub" ] || die "$CF_KEY is not a valid private key"
    [ "$cert_pub" = "$key_pub" ] || die \
      "Certificate and private key do not match.
They must come from the SAME 'Create Certificate' screen - Cloudflare shows
the private key only once, at creation, so a regenerated cert needs its key
copied at the same time."

    # 2. Not expired.
    openssl x509 -in "$CF_CERT" -noout -checkend 0 >/dev/null 2>&1 || die \
      "$CF_CERT has expired ($(openssl x509 -in "$CF_CERT" -noout -enddate | cut -d= -f2))"

    # 3. SAN must cover --domain, or Cloudflare rejects the origin with 526.
    CERT_SANS="$(openssl x509 -in "$CF_CERT" -noout -ext subjectAltName 2>/dev/null \
      | tr ',' '\n' | sed -n 's/.*DNS:[[:space:]]*\([^[:space:],]*\).*/\1/p')"
    if [ -z "$CERT_SANS" ]; then
      warn "Certificate has no subjectAltName - cannot verify it covers $DOMAIN."
    elif ! cert_san_covers "$DOMAIN" "$CERT_SANS"; then
      die "Origin certificate does not cover $DOMAIN.

  Certificate covers : $(echo "$CERT_SANS" | tr '\n' ' ')
  Needed             : $DOMAIN

TLS wildcards match exactly one label, so *.$(echo "$DOMAIN" | cut -d. -f2-)
does NOT cover $DOMAIN if that name has an extra level.

Create a new origin certificate (SSL/TLS -> Origin Server -> Create
Certificate) listing the exact hostname, e.g.:

  $DOMAIN, *.$(echo "$DOMAIN" | cut -d. -f2-)

and copy BOTH the certificate and the private key from that same screen."
    else
      log "Origin certificate covers $DOMAIN"
    fi
  fi
fi

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# harden.sh sits beside this script in the repo, and is bundled into the
# release tarball next to it.
for cand in "$SRC_DIR/lib/harden.sh" "$SRC_DIR/harden.sh"; do
  [ -r "$cand" ] && { HARDEN_LIB="$cand"; break; }
done
# ── Payload validation ──────────────────────────────────────────────────
# Checking only for server.js is not enough: a truncated or partially-built
# payload has it while missing the compiled assets, and the app then starts,
# serves HTML, and returns 400 for every JS chunk - which looks like a proxy
# or CDN fault and is miserable to trace back to packaging. Verify the pieces
# Next actually needs before overwriting a working install.
A="$SRC_DIR/apps/hestia"
[ -f "$A/server.js" ] || die \
  "apps/hestia/server.js not found next to this script.
Run install.sh from inside an unpacked release tarball."

payload_missing=""
[ -d "$A/.next" ]                || payload_missing="$payload_missing .next/"
[ -d "$A/.next/static" ]         || payload_missing="$payload_missing .next/static/"
[ -f "$A/.next/BUILD_ID" ]       || payload_missing="$payload_missing .next/BUILD_ID"
[ -d "$A/.next/server" ]         || payload_missing="$payload_missing .next/server/"
[ -d "$A/public" ]               || payload_missing="$payload_missing public/"

if [ -n "$payload_missing" ]; then
  die "Release payload is incomplete - refusing to install.

  Missing:$payload_missing
  Looked in: $A

The app would start and serve HTML, then fail every chunk request with a 400.
Rebuild the artifact:

  scripts/build-release.sh --tarball                          # from source
  scripts/build-release.sh --tarball --from-image <image>     # from an image

then unpack the NEW tarball and run its install.sh - not a leftover directory
from an earlier attempt."
fi

# A build with no chunks is technically 'present' but useless.
chunk_count="$(find "$A/.next/static" -name '*.js' 2>/dev/null | wc -l)"
[ "$chunk_count" -gt 0 ] || die \
  "$A/.next/static contains no JavaScript - the build output is empty."
log "Payload OK ($chunk_count static JS files)"

# ── 1. Identify the distribution ────────────────────────────────────────
OS_ID=""; OS_LIKE=""; OS_NAME="unknown"
if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  OS_ID="${ID:-}"; OS_LIKE="${ID_LIKE:-}"; OS_NAME="${PRETTY_NAME:-$OS_ID}"
fi

PKG=""; INIT="systemd"
case "$OS_ID $OS_LIKE" in
  *alpine*)                                   PKG=apk;    INIT=openrc ;;
  *debian*|*ubuntu*|*raspbian*|*linuxmint*)   PKG=apt ;;
  # RHEL family BEFORE fedora: Rocky/Alma/Amazon all carry "fedora" in
  # ID_LIKE, but Amazon Linux 2 has only yum - so probe rather than assume.
  *rhel*|*centos*|*rocky*|*almalinux*|*amzn*) PKG=$(command -v dnf >/dev/null && echo dnf || echo yum) ;;
  *fedora*)                                   PKG=dnf ;;
  *suse*|*sles*|*opensuse*)                   PKG=zypper ;;
  *arch*|*manjaro*)                           PKG=pacman ;;
  *)
    for c in apt-get dnf yum zypper pacman apk; do
      command -v "$c" >/dev/null && { PKG="${c%-get}"; break; }
    done
    [ -n "$PKG" ] || die "could not determine the package manager for: $OS_NAME"
    warn "Unrecognised distribution '$OS_NAME' - proceeding with $PKG"
    ;;
esac
command -v systemctl >/dev/null || INIT=openrc

log "Detected: $OS_NAME  (package manager: $PKG, init: $INIT)"

pkg_install() {
  case "$PKG" in
    apt)    run "DEBIAN_FRONTEND=noninteractive apt-get install -y $*" ;;
    dnf)    run "dnf install -y $*" ;;
    yum)    run "yum install -y $*" ;;
    zypper) run "zypper --non-interactive install $*" ;;
    pacman) run "pacman -Sy --noconfirm $*" ;;
    apk)    run "apk add --no-cache $*" ;;
  esac
}

# ── 2. Node.js 22+ ──────────────────────────────────────────────────────
# 22, not 20: @hyperbridge/sdk declares engines.node ">=22.x.x". Node 20 also
# reached end of life in April 2026, so it receives no security patches -
# don't install it on a host we just spent an installer hardening.
NODE_MIN=22
need_node=1
if command -v node >/dev/null; then
  cur="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "$cur" -ge "$NODE_MIN" ]; then
    log "Node $(node -v) already present"
    need_node=0
  else
    warn "Node $(node -v) is too old (need ${NODE_MIN}+); installing a newer one"
  fi
fi

if [ "$need_node" -eq 1 ]; then
  log "Installing Node.js $NODE_MIN"
  case "$PKG" in
    apt)
      pkg_install curl ca-certificates gnupg
      # Prefer the distro package when it is already new enough. Recent Ubuntu
      # and Debian ship Node 22+, and NodeSource often has no repository for a
      # freshly released distro - adding it would fail where the built-in
      # package would have worked perfectly.
      apt_node_major=""
      if command -v apt-cache >/dev/null; then
        apt_node_major="$(apt-cache policy nodejs 2>/dev/null \
          | awk '/Candidate:/ {print $2}' | sed -E 's/^[0-9]+://; s/[^0-9].*//')"
      fi
      if [ -n "$apt_node_major" ] && [ "$apt_node_major" -ge "$NODE_MIN" ] 2>/dev/null; then
        log "Distro package provides Node $apt_node_major - using it instead of NodeSource"
        pkg_install nodejs npm
      else
        run "curl -fsSL https://deb.nodesource.com/setup_${NODE_MIN}.x | bash -"
        pkg_install nodejs
      fi
      ;;
    dnf|yum)
      # Prefer the distro module where available; fall back to NodeSource.
      if run "$PKG module -y enable nodejs:$NODE_MIN" 2>/dev/null; then
        pkg_install nodejs
      else
        run "curl -fsSL https://rpm.nodesource.com/setup_${NODE_MIN}.x | bash -"
        pkg_install nodejs
      fi
      ;;
    zypper) pkg_install "nodejs${NODE_MIN}" || pkg_install nodejs ;;
    pacman) pkg_install nodejs npm ;;
    apk)    pkg_install nodejs npm ;;
  esac

  # These verify the *result* of the installs above, so they must not run in
  # dry-run mode - nothing was installed, and they would fail on a host where
  # the real run would have succeeded.
  if [ "$DRY_RUN" -eq 0 ]; then
    command -v node >/dev/null || die "Node installation failed"
    # Arch/Alpine install "whatever is current" - verify rather than assume.
    got="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    [ "$got" -ge "$NODE_MIN" ] || die \
      "Installed Node $(node -v) is older than ${NODE_MIN}; install Node ${NODE_MIN}+ manually and re-run."
  fi
fi

# ── 3. Service account ──────────────────────────────────────────────────
if id "$SVC_USER" >/dev/null 2>&1; then
  log "Service user '$SVC_USER' exists"
else
  log "Creating system user '$SVC_USER'"
  if [ "$PKG" = apk ]; then
    run "addgroup -S $SVC_USER 2>/dev/null || true"
    run "adduser -S -D -H -G $SVC_USER -s /sbin/nologin $SVC_USER"
  else
    run "useradd --system --no-create-home --shell /usr/sbin/nologin $SVC_USER 2>/dev/null \
         || useradd --system --no-create-home --shell /sbin/nologin $SVC_USER"
  fi
fi

# ── 4. Install the application ──────────────────────────────────────────
if [ -d "$PREFIX" ]; then
  BACKUP="${PREFIX}.bak.$(date +%Y%m%d%H%M%S)"
  log "Existing install found - moving to $BACKUP"
  run "mv '$PREFIX' '$BACKUP'"
fi

# Prune old backups. Each one is ~140 MB, so a few weeks of deploys fills the
# disk - and a full disk breaks the running service, not just the next deploy.
# Pruning happens HERE rather than at the end on purpose: the tree just moved
# aside is the newest backup and is always retained, so a rollback target
# survives even if this run fails later.
prune_backups() {
  [ "$KEEP_BACKUPS" -ge 0 ] 2>/dev/null || return 0
  local all count excess freed
  # sort -r on a YYYYMMDDHHMMSS suffix is newest-first lexicographically, so
  # `tail -n excess` is the oldest N. Do not switch to `ls -t`: mv/cp can leave
  # mtimes that do not reflect deploy order, whereas the name always does.
  all="$(ls -1d "${PREFIX}".bak.* 2>/dev/null | sort -r || true)"
  [ -n "$all" ] || return 0
  count="$(printf '%s\n' "$all" | wc -l)"
  excess=$(( count - KEEP_BACKUPS ))

  if [ "$excess" -le 0 ]; then
    log "Backups: $count kept, $(du -shc ${PREFIX}.bak.* 2>/dev/null | tail -1 | cut -f1) total (limit $KEEP_BACKUPS)"
    return 0
  fi

  # Report what this reclaims. Silent deletion of 140 MB directories gives no
  # way to tell pruning ran from pruning being broken.
  freed="$(printf '%s\n' "$all" | tail -n "$excess" | tr '\n' '\0' \
    | du -shc --files0-from=- 2>/dev/null | tail -1 | cut -f1)"
  log "Pruning $excess old backup(s) (${freed:-unknown} reclaimed), keeping the $KEEP_BACKUPS most recent"

  printf '%s\n' "$all" | tail -n "$excess" | while read -r old; do
    [ -n "$old" ] || continue
    run "rm -rf '$old'"
  done

  # Free space after pruning. A deploy that succeeds onto a nearly-full disk is
  # a service outage waiting for the next one.
  local avail
  avail="$(df -h "$(dirname "$PREFIX")" 2>/dev/null | awk 'NR==2 {print $4}')"
  [ -n "$avail" ] && log "Free space on $(dirname "$PREFIX"): $avail"
}
prune_backups

log "Installing to $PREFIX"
run "mkdir -p '$PREFIX'"
run "cp -R '$SRC_DIR'/. '$PREFIX'/"
run "rm -f '$PREFIX/install.sh' '$PREFIX/uninstall.sh' '$PREFIX/harden.sh'"
# The service account OWNS NOTHING it executes: root owns the code, the
# service user only reads it. A compromise of the Node process then cannot
# rewrite the application on disk.
run "chown -R root:$SVC_USER '$PREFIX'"
run "find '$PREFIX' -type d -exec chmod 0750 {} +"
run "find '$PREFIX' -type f -exec chmod 0640 {} +"

# Next writes image and fetch caches at runtime - the one writable path.
run "mkdir -p '$PREFIX/apps/hestia/.next/cache'"
run "chown -R $SVC_USER:$SVC_USER '$PREFIX/apps/hestia/.next/cache'"
run "chmod 0750 '$PREFIX/apps/hestia/.next/cache'"

# ── 5. Runtime environment ──────────────────────────────────────────────
ENV_DIR=/etc/$SERVICE_NAME
RUNTIME_ENV_FILE="$ENV_DIR/$SERVICE_NAME.env"
run "mkdir -p '$ENV_DIR'"

if [ -f "$RUNTIME_ENV_FILE" ] && [ "$REPLACE_ENV" -eq 0 ]; then
  # Existing env is preserved so a redeploy cannot clobber hand-edits made on
  # the server. But that means edits to the SOURCE env file are silently
  # ignored on re-run - surprising when you have just changed GRAPHQL_URL and
  # redeployed. Say so, loudly, when the two differ.
  if [ -n "$ENV_SRC" ] && [ -f "$ENV_SRC" ] && ! cmp -s "$ENV_SRC" "$RUNTIME_ENV_FILE"; then
    warn "Runtime env differs from $ENV_SRC - KEEPING the installed copy.
     Installed: $RUNTIME_ENV_FILE
     Source:    $ENV_SRC
     Re-run with --replace-env to overwrite (the current file is backed up).
     Note NEXT_PUBLIC_* values are compiled in at build time and are not
     affected either way - those need a rebuild."
  else
    log "Keeping existing $RUNTIME_ENV_FILE"
  fi
elif [ -n "$ENV_SRC" ] && [ -f "$ENV_SRC" ]; then
  if [ -f "$RUNTIME_ENV_FILE" ]; then
    log "Replacing runtime env from $ENV_SRC (previous kept as .prev)"
    run "cp -a '$RUNTIME_ENV_FILE' '$RUNTIME_ENV_FILE.prev'"
  else
    log "Installing runtime env from $ENV_SRC"
  fi
  run "install -m 0640 -o root -g $SVC_USER '$ENV_SRC' '$RUNTIME_ENV_FILE'"
elif [ -f "$SRC_DIR/orderbook-fe.env" ]; then
  log "Installing runtime env bundled with the release"
  run "install -m 0640 -o root -g $SVC_USER '$SRC_DIR/orderbook-fe.env' '$RUNTIME_ENV_FILE'"
else
  log "Writing a starter $RUNTIME_ENV_FILE"
  if [ "$DRY_RUN" -eq 0 ]; then
    cat > "$RUNTIME_ENV_FILE" <<EOF
# Runtime environment for $SERVICE_NAME.
# NOTE: NEXT_PUBLIC_* values are compiled into the browser bundle at BUILD
# time and cannot be changed here - rebuild the release to change them.
NODE_ENV=production
PORT=$PORT
HOSTNAME=0.0.0.0

# Server-side settings (safe to change here, then restart the service):
# POLKADEX_CHAIN=wss://...
# GRAPHQL_URL=https://...
EOF
    chown root:"$SVC_USER" "$RUNTIME_ENV_FILE"
    chmod 0640 "$RUNTIME_ENV_FILE"
  fi
fi

# ── 5b. Announcements feed ──────────────────────────────────────────────
# Read at REQUEST time by /api/announcements, so editing this file publishes or
# retracts an announcement with no rebuild and no restart.
#
# It lives here rather than under $PREFIX because deploy.sh replaces the whole
# install tree - anything inside it is lost on every deploy. Never overwritten
# if present: it holds operational state the operator set, not release content.
ANNOUNCEMENTS_FILE="$ENV_DIR/announcements.json"
if [ -f "$ANNOUNCEMENTS_FILE" ]; then
  log "Keeping existing $ANNOUNCEMENTS_FILE"
else
  log "Seeding empty $ANNOUNCEMENTS_FILE"
  if [ "$DRY_RUN" -eq 0 ]; then
    # An empty array, not an absent file: the route treats ENOENT as "nothing to
    # announce" too, but a real file is discoverable and shows the expected shape.
    printf '[]\n' > "$ANNOUNCEMENTS_FILE"
    chown root:"$SVC_USER" "$ANNOUNCEMENTS_FILE"
    # 0644, unlike the env file's 0640: announcement text is public by nature
    # (every visitor sees it) and readability makes it easy to inspect.
    chmod 0644 "$ANNOUNCEMENTS_FILE"
  fi
fi

# ── 5c. Maintenance page ────────────────────────────────────────────────
# Served by nginx when $ENV_DIR/maintenance exists. Written once and never
# overwritten, so wording edits survive deploys. Self-contained: no external
# CSS, fonts or images, because it has to render when the app is down and its
# assets may be unreachable.
MAINTENANCE_PAGE="$ENV_DIR/maintenance.html"
if [ -f "$MAINTENANCE_PAGE" ]; then
  log "Keeping existing $MAINTENANCE_PAGE"
else
  log "Writing $MAINTENANCE_PAGE"
  if [ "$DRY_RUN" -eq 0 ]; then
    cat > "$MAINTENANCE_PAGE" <<'MAINTEOF'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Polkadex Orderbook - back shortly</title>
<style>
  /* Brand tokens copied from themeConfig.ts. Inlined, not imported: this page
     must render when the app is down and its assets may be unreachable. */
  :root {
    color-scheme: dark;
    --pink: #E6007A;
    --pink-soft: #EA268E;
    --orange: #FFA500;
    --green: #0CA564;
    --l0: #0D0D10;
    --l1: #131419;
    --l4: #2B303A;
    --text: #FFFFFF;
    --muted: #A8ADB7;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    padding: 1.5rem; background: var(--l0); color: var(--text);
    font-family: "Work Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    /* Two soft brand glows, so the page is not a flat black rectangle. */
    background-image:
      radial-gradient(60rem 30rem at 15% -10%, rgba(230,0,122,.18), transparent 60%),
      radial-gradient(50rem 26rem at 90% 110%, rgba(255,165,0,.14), transparent 60%);
  }
  .card {
    width: 100%; max-width: 34rem; text-align: center;
    background: linear-gradient(180deg, var(--l1), var(--l0));
    border: 1px solid var(--l4); border-radius: 14px;
    padding: 2.5rem 2rem;
    box-shadow: 0 24px 60px rgba(0,0,0,.55);
  }
  .badge {
    display: inline-flex; align-items: center; gap: .5rem;
    font-size: .75rem; font-weight: 600; letter-spacing: .04em;
    text-transform: uppercase; color: var(--orange);
    border: 1px solid rgba(255,165,0,.35); background: rgba(255,165,0,.10);
    padding: .35rem .7rem; border-radius: 999px; margin-bottom: 1.25rem;
  }
  .dot {
    width: .5rem; height: .5rem; border-radius: 50%; background: var(--orange);
    animation: pulse 1.8s ease-in-out infinite;
  }
  h1 {
    margin: 0 0 .75rem; font-size: 1.6rem; line-height: 1.25; font-weight: 600;
    background: linear-gradient(90deg, var(--pink), var(--pink-soft) 55%, var(--orange));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  p { margin: 0 0 .75rem; line-height: 1.65; color: var(--muted); font-size: .95rem; }
  p.lead { color: #C9CDD6; }
  strong { color: var(--text); font-weight: 600; }
  .safe {
    margin-top: 1.5rem; padding: .85rem 1rem; border-radius: 10px;
    border: 1px solid rgba(12,165,100,.3); background: rgba(12,165,100,.08);
    color: var(--green); font-size: .875rem; font-weight: 500;
  }
  /* Three-dot "working on it" indicator. Decorative only, so aria-hidden. */
  .work { display: flex; gap: .4rem; justify-content: center; margin: 1.5rem 0 .25rem; }
  .work i {
    width: .45rem; height: .45rem; border-radius: 50%; background: var(--pink);
    display: block; animation: bounce 1.4s ease-in-out infinite;
  }
  .work i:nth-child(2) { animation-delay: .18s; background: var(--pink-soft); }
  .work i:nth-child(3) { animation-delay: .36s; background: var(--orange); }
  a { color: var(--pink-soft); text-decoration: none; font-weight: 500; }
  a:hover { text-decoration: underline; }
  .foot { margin-top: 1.75rem; font-size: .8rem; color: #6B7280; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
  @keyframes bounce {
    0%,100% { transform: translateY(0); opacity: .45; }
    50%     { transform: translateY(-.35rem); opacity: 1; }
  }
  /* Respect the OS setting - a looping animation is a real problem for some
     people, and a maintenance page is not worth triggering it. */
  @media (prefers-reduced-motion: reduce) {
    .dot, .work i { animation: none; }
  }
</style>
</head>
<body>
  <main class="card">
    <span class="badge"><span class="dot"></span>Maintenance in progress</span>

    <h1>We are fixing a few things</h1>

    <p class="lead">
      The dev team is working through the bugs you reported. The orderbook is
      paused while those fixes go in, and we will be back as soon as they are
      verified.
    </p>

    <div class="work" aria-hidden="true"><i></i><i></i><i></i></div>

    <p class="safe"><strong>Your funds are safe.</strong> Nothing is at risk
      while the interface is offline, and open orders are untouched.</p>

    <p class="foot">
      Thanks for the reports - they are the reason this is getting fixed.<br>
      Follow along on <a href="https://discord.gg/QNfwPevNG">Discord</a> for
      updates.
    </p>
  </main>
</body>
</html>
MAINTEOF
    chown root:"$SVC_USER" "$MAINTENANCE_PAGE"
    chmod 0644 "$MAINTENANCE_PAGE"
  fi
fi

# ── 6. Service unit ─────────────────────────────────────────────────────
if [ "$INIT" = systemd ]; then
  log "Writing systemd unit"
  if [ "$DRY_RUN" -eq 0 ]; then
    cat > /etc/systemd/system/$SERVICE_NAME.service <<EOF
[Unit]
Description=Orderbook Frontend
Documentation=https://github.com/Polkadex-Substrate
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SVC_USER
Group=$SVC_USER
WorkingDirectory=$PREFIX
EnvironmentFile=$RUNTIME_ENV_FILE
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=HOSTNAME=0.0.0.0
ExecStart=$(command -v node) $PREFIX/apps/hestia/server.js
Restart=always
RestartSec=5

# ── Sandbox ────────────────────────────────────────────────────────────
# The app is a stateless HTTP server: it needs to read its own tree, write
# .next/cache, and make outbound TCP. Everything else is denied.
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectProc=invisible
ProcSubset=pid
ReadWritePaths=$PREFIX/apps/hestia/.next/cache
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true
ProtectClock=true
ProtectHostname=true
RestrictSUIDSGID=true
RestrictRealtime=true
RestrictNamespaces=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
LockPersonality=true
# Must stay false: V8's JIT maps write+execute pages, and the process dies
# immediately with this enabled.
MemoryDenyWriteExecute=false
SystemCallArchitectures=native
SystemCallFilter=@system-service
SystemCallFilter=~@privileged @resources @obsolete @mount @swap @reboot @raw-io
CapabilityBoundingSet=
AmbientCapabilities=
UMask=0077

# Resource ceilings - a runaway or attacked process can't exhaust the host.
LimitNOFILE=65535
LimitNPROC=512
MemoryMax=4G
TasksMax=256

[Install]
WantedBy=multi-user.target
EOF
  fi
  run "systemctl daemon-reload"
  run "systemctl enable $SERVICE_NAME"
  [ "$NO_START" -eq 1 ] || run "systemctl restart $SERVICE_NAME"
else
  log "Writing OpenRC init script"
  if [ "$DRY_RUN" -eq 0 ]; then
    cat > /etc/init.d/$SERVICE_NAME <<EOF
#!/sbin/openrc-run
name="Orderbook Frontend"
description="Orderbook frontend (Next.js standalone)"
command="$(command -v node)"
command_args="$PREFIX/apps/hestia/server.js"
command_user="$SVC_USER:$SVC_USER"
command_background=true
directory="$PREFIX"
pidfile="/run/\${RC_SVCNAME}.pid"
output_log="/var/log/\${RC_SVCNAME}.log"
error_log="/var/log/\${RC_SVCNAME}.err"

depend() {
    need net
}

start_pre() {
    set -a
    [ -f "$RUNTIME_ENV_FILE" ] && . "$RUNTIME_ENV_FILE"
    set +a
    export NODE_ENV=production PORT=$PORT HOSTNAME=0.0.0.0
}
EOF
    chmod +x /etc/init.d/$SERVICE_NAME
  fi
  run "rc-update add $SERVICE_NAME default"
  [ "$NO_START" -eq 1 ] || run "rc-service $SERVICE_NAME restart"
fi

# ── 7. Optional nginx reverse proxy ─────────────────────────────────────
if [ "$WITH_NGINX" -eq 1 ]; then
  log "Configuring nginx reverse proxy"
  command -v nginx >/dev/null || pkg_install nginx

  SERVER_NAME="${DOMAIN:-_}"
  if [ -d /etc/nginx/sites-available ]; then
    VHOST=/etc/nginx/sites-available/$SERVICE_NAME
    LINK=/etc/nginx/sites-enabled/$SERVICE_NAME
  else
    VHOST=/etc/nginx/conf.d/$SERVICE_NAME.conf
    LINK=""
  fi

  # `http2 on;` is nginx >= 1.25.1 only. On older builds (Debian 11, Ubuntu
  # 20.04, RHEL 8) it is an unknown directive and `nginx -t` fails outright,
  # so fall back to the deprecated-but-working `listen ... http2` form.
  NGINX_VER="$(command -v nginx >/dev/null && nginx -v 2>&1 | sed -E 's|.*/([0-9.]+).*|\1|' || true)"
  if [ -z "$NGINX_VER" ] && [ "$DRY_RUN" -eq 1 ]; then
    warn "nginx not installed yet - previewing the pre-1.25 http2 syntax.
     The real run will detect the installed version and may use 'http2 on;'."
  fi
  if [ -n "$NGINX_VER" ] && \
     [ "$(printf '%s\n1.25.1\n' "$NGINX_VER" | sort -V | head -1)" = "1.25.1" ]; then
    HTTP2_DIRECTIVE="    http2 on;"
    LISTEN_443="listen 443 ssl;
    listen [::]:443 ssl;"
  else
    HTTP2_DIRECTIVE=""
    LISTEN_443="listen 443 ssl http2;
    listen [::]:443 ssl http2;"
  fi

  # Rate-limit zones must live in the http{} context, not in a server block.
  # The vhost references these zones, so if conf.d isn't included the config
  # is invalid - create it rather than silently skipping.
  run "mkdir -p /etc/nginx/conf.d"
  if [ "$DRY_RUN" -eq 0 ]; then
    cat > /etc/nginx/conf.d/00-$SERVICE_NAME-limits.conf <<'EOF'
# Defends against crude request floods and slow-loris style connection
# hoarding. Generous enough for a trading UI that polls and holds sockets.
limit_req_zone  $binary_remote_addr zone=ob_req:10m rate=30r/s;
limit_conn_zone $binary_remote_addr zone=ob_conn:10m;
EOF
  fi

  # Cloudflare needs its edge ranges known before nginx config is written:
  # both real_ip and (later) the firewall read the same cached list.
  if [ "$CLOUDFLARE" -eq 1 ] && [ -n "${HARDEN_LIB:-}" ]; then
    # shellcheck disable=SC1090
    . "$HARDEN_LIB"
    cloudflare_fetch_ips || true
    cloudflare_realip_conf
  fi

  # The proxied location block is identical in both modes - define once.
  #
  # Escaping note: this heredoc is unquoted so $PORT interpolates, and nginx
  # variables use a SINGLE backslash (\$host). The value is then inserted into
  # the outer heredoc by parameter expansion, which does not re-process
  # backslashes - so \\\$ here would emit a literal backslash and nginx would
  # refuse to start.
  PROXY_BLOCK=$(cat <<EOF
    limit_req  zone=ob_req burst=60 nodelay;
    limit_conn ob_conn 32;

    # ── Maintenance gate ───────────────────────────────────────────────
    # Presence of the flag file takes the site offline:
    #   sudo touch /etc/$SERVICE_NAME/maintenance    # on
    #   sudo rm -f /etc/$SERVICE_NAME/maintenance    # off
    #
    # Deliberately in nginx rather than the app. MAINTENACE_MODE is read by
    # src/proxy.ts, which is Next middleware running on the EDGE runtime - it
    # cannot read the filesystem, so no config file can drive it, and changing
    # the env var needs a full rebuild. More importantly, maintenance mode is
    # most needed when the app itself is broken, and an in-app gate cannot
    # answer once Node stops responding. This can.
    #
    # \$maintenance via a variable, not a bare \`if ... return\`, so the internal
    # redirect to @maintenance below is not re-tested and cannot loop.
    set \$maintenance 0;
    if (-f /etc/$SERVICE_NAME/maintenance) { set \$maintenance 1; }
    if (\$maintenance = 1) { return 503; }

    error_page 503 @maintenance;

    location @maintenance {
        # 503 + Retry-After tells crawlers this is temporary, so the outage does
        # not cost search ranking the way a 200 or a 404 would.
        default_type text/html;
        add_header Retry-After 300 always;
        add_header Cache-Control "no-store, must-revalidate" always;
        root /etc/$SERVICE_NAME;
        try_files /maintenance.html =503;
    }

    # WebSocket upgrade headers are required: the app holds chain and
    # orderbook subscriptions open from the browser.
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }

    # Content-hashed assets are immutable.
    location /_next/static/ {
        proxy_pass http://127.0.0.1:$PORT;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
EOF
)

  if [ "$DRY_RUN" -eq 0 ]; then
    if [ "$CLOUDFLARE" -eq 1 ]; then
      ORIGIN_PULL=""
      if [ "$CF_ORIGIN_PULL" -eq 1 ]; then
        # Cloudflare presents a client certificate signed by this well-known
        # CA. Requiring it means a direct request to the origin IP is refused
        # even if the attacker knows the IP and sends the right Host header.
        CF_PULL_CA=/etc/ssl/cloudflare/origin-pull-ca.pem
        if [ ! -r "$CF_PULL_CA" ]; then
          mkdir -p /etc/ssl/cloudflare
          curl -fsS --max-time 20 \
            https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem \
            -o "$CF_PULL_CA" 2>/dev/null || true
        fi
        if [ -r "$CF_PULL_CA" ]; then
          ORIGIN_PULL="    ssl_client_certificate $CF_PULL_CA;
    ssl_verify_client on;"
        else
          warn "Could not obtain the Cloudflare origin-pull CA - skipping mTLS.
     Enable it later by adding ssl_client_certificate + ssl_verify_client."
        fi
      fi

      cat > "$VHOST" <<EOF
# HTTP: redirect to HTTPS. Cloudflare should also be set to Full (strict).
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;
    return 301 https://\$host\$request_uri;
}

server {
    $LISTEN_443
$HTTP2_DIRECTIVE
    server_name $SERVER_NAME;

    # Cloudflare Origin CA certificate. Only Cloudflare trusts this cert, so
    # the Cloudflare SSL mode MUST be "Full (strict)" - a browser reaching
    # the origin directly would (correctly) reject it.
    ssl_certificate     $CF_CERT;
    ssl_certificate_key $CF_KEY;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
$ORIGIN_PULL

$(nginx_hardening_snippet)

    # HSTS: safe here because Cloudflare serves this hostname over HTTPS only.
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

$PROXY_BLOCK
}
EOF
    else
      cat > "$VHOST" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;

$(nginx_hardening_snippet)

$PROXY_BLOCK
}
EOF
    fi
    [ -n "$LINK" ] && ln -sf "$VHOST" "$LINK"
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  fi

  run "nginx -t"
  run "systemctl enable nginx" 2>/dev/null || true
  run "systemctl reload nginx 2>/dev/null || systemctl restart nginx"

  if [ -n "$DOMAIN" ] && [ "$CLOUDFLARE" -eq 0 ]; then
    echo
    log "For TLS, run:  certbot --nginx -d $DOMAIN"
  fi
fi

# ── 8. Host hardening (opt-in) ──────────────────────────────────────────
if [ "$HARDEN" -eq 1 ]; then
  if [ -n "${HARDEN_LIB:-}" ]; then
    # shellcheck disable=SC1090
    . "$HARDEN_LIB"
    echo
    log "Applying host hardening"
    harden_sysctl
    harden_firewall "$SSH_PORT" "$CLOUDFLARE"
    harden_fail2ban
    harden_auto_updates
    # Only bind to loopback when something is actually proxying to us,
    # otherwise the app becomes unreachable.
    if [ "$WITH_NGINX" -eq 1 ]; then
      harden_bind_localhost
      run "systemctl restart $SERVICE_NAME" 2>/dev/null || true
    else
      warn "Not binding to localhost: no reverse proxy was configured.
     Re-run with --with-nginx, or put your own proxy in front and set
     HOSTNAME=127.0.0.1 in $RUNTIME_ENV_FILE."
    fi
    [ "$HARDEN_SSH" -eq 1 ] && harden_ssh

    # Record that this host has been hardened, so deploy.sh can skip it on
    # subsequent runs instead of resetting the firewall on every deploy.
    if [ "$DRY_RUN" -eq 0 ]; then
      {
        echo "hardened_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "ssh_hardened=$HARDEN_SSH"
        echo "cloudflare_only=$CLOUDFLARE"
      } > "$ENV_DIR/.hardened"
      chmod 0640 "$ENV_DIR/.hardened"
    fi
  else
    warn "harden.sh not found next to install.sh - skipping host hardening"
  fi
else
  echo
  log "Host hardening not requested (--harden). The systemd sandbox is still applied."
fi

# ── 9. Report ───────────────────────────────────────────────────────────
echo
log "Installed"
[ -f "$PREFIX/RELEASE" ] && sed 's/^/  /' "$PREFIX/RELEASE"
cat <<EOF

  Service : $SERVICE_NAME
  Listen  : http://127.0.0.1:$PORT
  Files   : $PREFIX
  Env     : $RUNTIME_ENV_FILE
EOF

# Cloudflare posture, restated at the end: the mid-run warning scrolls past,
# and "restricted to Cloudflare" vs "open to the internet" is exactly the
# thing an operator must not be wrong about.
if [ "$CLOUDFLARE" -eq 1 ]; then
  echo
  echo "  TLS     : Cloudflare Origin CA ($CF_CERT)"
  echo "            Set the Cloudflare SSL mode to 'Full (strict)'."
  if [ "$HARDEN" -eq 1 ]; then
    if [ -s "${CF_IP_CACHE:-/nonexistent}" ]; then
      echo "  Origin  : 80/443 restricted to $(wc -l < "$CF_IP_CACHE") Cloudflare prefixes"
    else
      warn "Cloudflare IP ranges could not be fetched, so 80/443 are OPEN TO THE
     INTERNET. Anyone who finds this server's IP can bypass Cloudflare's WAF
     and rate limiting by sending the right Host header. Re-run the installer
     once the host can reach https://www.cloudflare.com/ips-v4."
    fi
  fi
fi

cat <<EOF

Manage it with:
EOF
if [ "$INIT" = systemd ]; then
  cat <<EOF
  systemctl status $SERVICE_NAME
  journalctl -u $SERVICE_NAME -f
  systemctl restart $SERVICE_NAME
EOF
else
  cat <<EOF
  rc-service $SERVICE_NAME status
  tail -f /var/log/$SERVICE_NAME.log
EOF
fi

if [ "$NO_START" -eq 0 ] && [ "$DRY_RUN" -eq 0 ]; then
  echo
  log "Waiting for the service to answer…"
  for i in $(seq 1 20); do
    if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null; then
      log "Health check OK - the app is serving on port $PORT"
      exit 0
    fi
    sleep 1
  done
  warn "No response on port $PORT after 20s. Check the logs:"
  [ "$INIT" = systemd ] && echo "  journalctl -u $SERVICE_NAME -n 50 --no-pager" \
                        || echo "  tail -n 50 /var/log/$SERVICE_NAME.err"
  exit 1
fi
