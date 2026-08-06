#!/usr/bin/env bash
#
# Remove the Orderbook frontend installed by install.sh.
#
# Usage:
#   sudo ./uninstall.sh                 # stop, disable and remove the service + files
#   sudo ./uninstall.sh --purge         # also remove /etc/orderbook-fe and the service user
#   sudo ./uninstall.sh --keep-backups  # leave /opt/orderbook-fe.bak.* in place
#
set -euo pipefail

SERVICE_NAME=orderbook-fe
PREFIX=/opt/orderbook-fe
SVC_USER=orderbook
PURGE=0
KEEP_BACKUPS=0

while [ $# -gt 0 ]; do
  case "$1" in
    --purge)        PURGE=1; shift ;;
    --keep-backups) KEEP_BACKUPS=1; shift ;;
    --prefix)       PREFIX="$2"; shift 2 ;;
    --user)         SVC_USER="$2"; shift 2 ;;
    -h|--help)      sed -n '2,10p' "$0"; exit 0 ;;
    *)              echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
[ "$(id -u)" -eq 0 ] || { echo "must run as root (use sudo)" >&2; exit 1; }

if command -v systemctl >/dev/null; then
  log "Stopping service"
  systemctl stop    "$SERVICE_NAME" 2>/dev/null || true
  systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  rm -f "/etc/systemd/system/$SERVICE_NAME.service"
  systemctl daemon-reload
else
  log "Stopping service (OpenRC)"
  rc-service "$SERVICE_NAME" stop 2>/dev/null || true
  rc-update del "$SERVICE_NAME" default 2>/dev/null || true
  rm -f "/etc/init.d/$SERVICE_NAME"
fi

log "Removing $PREFIX"
rm -rf "$PREFIX"

if [ "$KEEP_BACKUPS" -eq 0 ]; then
  for b in "${PREFIX}".bak.*; do
    [ -e "$b" ] || continue
    log "Removing backup $b"
    rm -rf "$b"
  done
fi

# nginx vhost, if install.sh created one
for f in "/etc/nginx/sites-enabled/$SERVICE_NAME" \
         "/etc/nginx/sites-available/$SERVICE_NAME" \
         "/etc/nginx/conf.d/$SERVICE_NAME.conf"; do
  [ -e "$f" ] && { log "Removing $f"; rm -f "$f"; }
done
command -v nginx >/dev/null && nginx -t >/dev/null 2>&1 && \
  { systemctl reload nginx 2>/dev/null || true; }

if [ "$PURGE" -eq 1 ]; then
  log "Purging configuration and service user"
  rm -rf "/etc/$SERVICE_NAME"
  if id "$SVC_USER" >/dev/null 2>&1; then
    userdel "$SVC_USER" 2>/dev/null || deluser "$SVC_USER" 2>/dev/null || true
  fi
else
  log "Kept /etc/$SERVICE_NAME and the '$SVC_USER' user (use --purge to remove)"
fi

log "Uninstalled"
