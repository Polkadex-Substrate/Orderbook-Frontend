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
#
# Hardening (see scripts/lib/harden.sh for what each one defends against):
#   --harden            sysctl + firewall + fail2ban + auto-updates + proxy-only bind
#   --harden-ssh        additionally enforce key-only SSH, no root login
#                       (refuses to run if no authorized_keys exists)
#   --ssh-port <n>      SSH port to keep open in the firewall  (default 22)
#   --no-harden         service sandbox only; skip all host changes
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
    -h|--help)     sed -n '2,42p' "$0"; exit 0 ;;
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

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# harden.sh sits beside this script in the repo, and is bundled into the
# release tarball next to it.
for cand in "$SRC_DIR/lib/harden.sh" "$SRC_DIR/harden.sh"; do
  [ -r "$cand" ] && { HARDEN_LIB="$cand"; break; }
done
[ -f "$SRC_DIR/apps/hestia/server.js" ] || die \
  "apps/hestia/server.js not found next to this script.
Run install.sh from inside an unpacked release tarball."

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
  # ID_LIKE, but Amazon Linux 2 has only yum — so probe rather than assume.
  *rhel*|*centos*|*rocky*|*almalinux*|*amzn*) PKG=$(command -v dnf >/dev/null && echo dnf || echo yum) ;;
  *fedora*)                                   PKG=dnf ;;
  *suse*|*sles*|*opensuse*)                   PKG=zypper ;;
  *arch*|*manjaro*)                           PKG=pacman ;;
  *)
    for c in apt-get dnf yum zypper pacman apk; do
      command -v "$c" >/dev/null && { PKG="${c%-get}"; break; }
    done
    [ -n "$PKG" ] || die "could not determine the package manager for: $OS_NAME"
    warn "Unrecognised distribution '$OS_NAME' — proceeding with $PKG"
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

# ── 2. Node.js 20+ ──────────────────────────────────────────────────────
need_node=1
if command -v node >/dev/null; then
  cur="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "$cur" -ge 20 ]; then
    log "Node $(node -v) already present"
    need_node=0
  else
    warn "Node $(node -v) is too old (need 20+); installing a newer one"
  fi
fi

if [ "$need_node" -eq 1 ]; then
  log "Installing Node.js 20"
  case "$PKG" in
    apt)
      pkg_install curl ca-certificates gnupg
      run "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
      pkg_install nodejs
      ;;
    dnf|yum)
      # Prefer the distro module where available; fall back to NodeSource.
      if run "$PKG module -y enable nodejs:20" 2>/dev/null; then
        pkg_install nodejs
      else
        run "curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -"
        pkg_install nodejs
      fi
      ;;
    zypper) pkg_install nodejs20 || pkg_install nodejs ;;
    pacman) pkg_install nodejs npm ;;
    apk)    pkg_install nodejs npm ;;
  esac
  command -v node >/dev/null || die "Node installation failed"
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
  log "Existing install found — moving to $BACKUP"
  run "mv '$PREFIX' '$BACKUP'"
fi

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

# Next writes image and fetch caches at runtime — the one writable path.
run "mkdir -p '$PREFIX/apps/hestia/.next/cache'"
run "chown -R $SVC_USER:$SVC_USER '$PREFIX/apps/hestia/.next/cache'"
run "chmod 0750 '$PREFIX/apps/hestia/.next/cache'"

# ── 5. Runtime environment ──────────────────────────────────────────────
ENV_DIR=/etc/$SERVICE_NAME
ENV_FILE="$ENV_DIR/$SERVICE_NAME.env"
run "mkdir -p '$ENV_DIR'"

if [ -f "$ENV_FILE" ]; then
  log "Keeping existing $ENV_FILE"
elif [ -n "$ENV_SRC" ] && [ -f "$ENV_SRC" ]; then
  log "Installing runtime env from $ENV_SRC"
  run "install -m 0640 -o root -g $SVC_USER '$ENV_SRC' '$ENV_FILE'"
elif [ -f "$SRC_DIR/orderbook-fe.env" ]; then
  log "Installing runtime env bundled with the release"
  run "install -m 0640 -o root -g $SVC_USER '$SRC_DIR/orderbook-fe.env' '$ENV_FILE'"
else
  log "Writing a starter $ENV_FILE"
  if [ "$DRY_RUN" -eq 0 ]; then
    cat > "$ENV_FILE" <<EOF
# Runtime environment for $SERVICE_NAME.
# NOTE: NEXT_PUBLIC_* values are compiled into the browser bundle at BUILD
# time and cannot be changed here — rebuild the release to change them.
NODE_ENV=production
PORT=$PORT
HOSTNAME=0.0.0.0

# Server-side settings (safe to change here, then restart the service):
# POLKADEX_CHAIN=wss://...
# GRAPHQL_URL=https://...
# API_REGION=...
EOF
    chown root:"$SVC_USER" "$ENV_FILE"
    chmod 0640 "$ENV_FILE"
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
EnvironmentFile=$ENV_FILE
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

# Resource ceilings — a runaway or attacked process can't exhaust the host.
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
    [ -f "$ENV_FILE" ] && . "$ENV_FILE"
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

  # Rate-limit zones must live in the http{} context, not in a server block.
  if [ "$DRY_RUN" -eq 0 ] && [ -d /etc/nginx/conf.d ]; then
    cat > /etc/nginx/conf.d/00-$SERVICE_NAME-limits.conf <<'EOF'
# Defends against crude request floods and slow-loris style connection
# hoarding. Generous enough for a trading UI that polls and holds sockets.
limit_req_zone  $binary_remote_addr zone=ob_req:10m rate=30r/s;
limit_conn_zone $binary_remote_addr zone=ob_conn:10m;
EOF
  fi

  if [ "$DRY_RUN" -eq 0 ]; then
    cat > "$VHOST" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;

$(nginx_hardening_snippet)

    limit_req  zone=ob_req burst=60 nodelay;
    limit_conn ob_conn 32;

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
}
EOF
    [ -n "$LINK" ] && ln -sf "$VHOST" "$LINK"
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  fi

  run "nginx -t"
  run "systemctl enable nginx" 2>/dev/null || true
  run "systemctl reload nginx 2>/dev/null || systemctl restart nginx"

  if [ -n "$DOMAIN" ]; then
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
    harden_firewall "$SSH_PORT"
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
     HOSTNAME=127.0.0.1 in $ENV_FILE."
    fi
    [ "$HARDEN_SSH" -eq 1 ] && harden_ssh
  else
    warn "harden.sh not found next to install.sh — skipping host hardening"
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
  Env     : $ENV_FILE

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
      log "Health check OK — the app is serving on port $PORT"
      exit 0
    fi
    sleep 1
  done
  warn "No response on port $PORT after 20s. Check the logs:"
  [ "$INIT" = systemd ] && echo "  journalctl -u $SERVICE_NAME -n 50 --no-pager" \
                        || echo "  tail -n 50 /var/log/$SERVICE_NAME.err"
  exit 1
fi
