#!/usr/bin/env bash
#
# Decide, with evidence, whether sharp can be forced to >=0.35.0.
#
# WHY A SCRIPT AND NOT JUST "TRY IT"
# sharp is patched at >=0.35.0, but next 15.5.21 declares `^0.34.3`, and for 0.x
# versions that range means >=0.34.3 <0.35.0. Forcing 0.35.0 through a
# `resolutions` entry overrides what next asked for. That is allowed to work and
# allowed to fail, and the failure mode is the part that matters:
#
#   `next build` DOES NOT EXERCISE SHARP AT ALL.
#
# Image optimisation happens at REQUEST time, in
# next/dist/server/image-optimizer.js, behind the /_next/image route. So a green
# build proves nothing here - the app would build perfectly and then serve
# broken images in production. This script therefore builds AND serves AND
# fetches an actual optimised image, checking the bytes that come back.
#
# The API surface at risk is small, which is the encouraging part. next calls
# only: sharp.concurrency, .resize, .timeout, .avif, .webp, .png, .jpeg,
# .toBuffer - all long-stable. sharp 0.35.0 requires node >=20.9.0; this repo
# pins 22, so the engine is fine.
#
# WHERE TO RUN IT
# On the machine that actually builds the app. sharp ships PREBUILT NATIVE
# BINARIES per platform, so a node_modules installed on macOS is not loadable
# from a Linux container and vice versa - the failure looks like "Could not load
# the sharp module using the linux-arm64 runtime" and says nothing about the
# version. For a release build, the honest place to run this is inside the
# Docker image; for local work, your Mac.
#
# Usage:
#   bash scripts/verify-sharp-bump.sh            # test, then restore
#   bash scripts/verify-sharp-bump.sh --keep     # test, keep the bump if it passes
#
# Exit 0 = the bump is safe on this machine. Exit 1 = it is not; do not ship it.

set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

TARGET="^0.35.0"
PORT="${SHARP_TEST_PORT:-3987}"
IMAGE="/icon-512x512.png"
BACKUP="$(mktemp)"
SERVER_LOG="$(mktemp)"
SERVER_PID=""

log()  { printf '\n==> %s\n' "$*"; }
fail() { printf '\nFAIL: %s\n' "$*" >&2; exit 1; }

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  if [ "$KEEP" = "0" ] || [ "${PASSED:-0}" != "1" ]; then
    cp "$BACKUP" package.json
    log "package.json restored. Run 'yarn install' to put the lockfile back."
  fi
  rm -f "$BACKUP"
}
trap cleanup EXIT

cp package.json "$BACKUP"

log "Node engine check"
node -e '
const v = process.versions.node.split(".").map(Number);
const ok = v[0] > 20 || (v[0] === 20 && v[1] >= 9);
console.log("  node " + process.versions.node + (ok ? " satisfies sharp 0.35 (>=20.9.0)" : " is TOO OLD for sharp 0.35"));
process.exit(ok ? 0 : 1);
' || fail "node is older than sharp 0.35 requires"

log "Forcing sharp $TARGET via resolutions"
node -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.resolutions = pkg.resolutions || {};
pkg.resolutions.sharp = process.argv[1];
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
console.log("  resolutions.sharp = " + process.argv[1]);
' "$TARGET"

log "Installing (this rewrites yarn.lock)"
yarn install --silent || fail "install failed with sharp $TARGET - the bump is not viable"

INSTALLED=$(node -p "require('./node_modules/sharp/package.json').version")
echo "  hoisted sharp: $INSTALLED"
NESTED=$(node -p "try{require('./node_modules/next/node_modules/sharp/package.json').version}catch(e){'none'}")
echo "  nested under next: $NESTED"
[ "$NESTED" = "none" ] || fail "next still has its own $NESTED - the resolution did not take, so the vulnerable copy is still being served"

log "Proving sharp itself works before blaming next"
# Separate "the library is broken" from "the native binary does not match this
# machine". sharp ships prebuilt binaries per platform, so a node_modules
# installed on macOS and read from a Linux container fails here with a
# platform message that has nothing to do with the version bump. Conflating
# the two would condemn a perfectly good version.
node -e '
const sharp = require("sharp");
sharp({ create: { width: 8, height: 8, channels: 3, background: "#123456" } })
  .png().toBuffer()
  .then(b => { if (!b || b.length < 8) throw new Error("empty buffer"); console.log("  sharp encodes a PNG: " + b.length + " bytes"); })
  .catch(e => { console.error("  encode failed: " + e.message); process.exit(1); });
' 2>&1 | sed 's/^/  /' || {
  if node -e 'require("sharp")' 2>&1 | grep -q "runtime\|platform\|Could not load"; then
    fail "sharp's native binary does not match this machine ($(uname -s)/$(uname -m)).
  This is a PLATFORM problem, not a verdict on sharp $INSTALLED. Run this
  script where the app is actually built - your Mac for local builds, or
  inside the Docker image for a release build - not across a mounted
  node_modules from another OS."
  fi
  fail "sharp $INSTALLED cannot encode on this machine"
}

log "Building (standalone)"
yarn --cwd apps/hestia build > "$SERVER_LOG" 2>&1 || {
  tail -40 "$SERVER_LOG" >&2
  fail "next build failed with sharp $INSTALLED"
}
echo "  build ok"

log "Serving and fetching a REAL optimised image"
# This is the step a build cannot replace: /_next/image runs the optimiser.
( cd apps/hestia && PORT="$PORT" yarn start > "$SERVER_LOG" 2>&1 ) &
SERVER_PID=$!

for i in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:$PORT/" -o /dev/null 2>/dev/null; then break; fi
  sleep 1
  [ "$i" = "45" ] && { tail -30 "$SERVER_LOG" >&2; fail "server never came up"; }
done
echo "  server up on $PORT"

OUT="$(mktemp)"
for FMT in "image/webp" "image/avif"; do
  CODE=$(curl -s -o "$OUT" -w '%{http_code}' \
    -H "Accept: $FMT" \
    "http://127.0.0.1:$PORT/_next/image?url=$(printf '%s' "$IMAGE" | sed 's|/|%2F|g')&w=256&q=75")
  TYPE=$(file -b --mime-type "$OUT" 2>/dev/null || echo unknown)
  SIZE=$(wc -c < "$OUT" | tr -d ' ')
  echo "  Accept:$FMT -> HTTP $CODE, $TYPE, $SIZE bytes"

  [ "$CODE" = "200" ] || { head -c 400 "$OUT" >&2; fail "/_next/image returned $CODE - the optimiser is broken with sharp $INSTALLED"; }
  case "$TYPE" in
    image/*) ;;
    *) fail "/_next/image returned $TYPE, not an image - sharp $INSTALLED is not encoding" ;;
  esac
  [ "$SIZE" -gt 100 ] || fail "/_next/image returned $SIZE bytes - truncated output"
done
rm -f "$OUT"

PASSED=1
log "PASS - sharp $INSTALLED builds, serves and optimises images"
echo "  advisory GHSA/libvips CVE-2026-33327 and friends are cleared at this version."
if [ "$KEEP" = "1" ]; then
  echo "  Keeping the bump (--keep). Commit package.json AND yarn.lock together."
else
  echo "  Re-run with --keep to retain it, or apply resolutions.sharp = $TARGET by hand."
fi
