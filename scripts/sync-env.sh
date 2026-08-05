#!/usr/bin/env bash
#
# Add missing keys to an env file WITHOUT touching the values already in it.
#
# The problem this solves: every NEXT_PUBLIC_* and next.config.js `env:` value is
# baked into the bundle at build time, and a key that is absent from the env file
# does not fail the build - it bakes an empty string. New keys get added to the
# Dockerfile as features land, and the env file on each host drifts behind. That
# drift is invisible until something is silently broken in production: it is how
# six feature flags shipped unset, and how SENTRY_ORG / SENTRY_PROJECT were absent
# for a full deploy while source maps quietly failed to upload.
#
# Copying a reference env file over the host's copy is not an option either - the
# host's file is the one with the values that actually work. So this script only
# ever APPENDS: existing lines, values, comments and ordering are left byte-for-byte
# intact.
#
# The required-key list comes from the Dockerfile's `ARG` lines, which is the real
# source of truth (apps/hestia/.env.example has historically lagged behind it).
#
# Usage:
#   scripts/sync-env.sh                              # report only, change nothing
#   scripts/sync-env.sh --from ../orderbook-fe.env.testnet
#                                                    # append missing keys, taking
#                                                    # values from the reference
#   scripts/sync-env.sh --into apps/hestia/.env --from ref.env
#   scripts/sync-env.sh --from ref.env --apply        # actually write (default is
#                                                    # a dry run - see below)
#
# DRY RUN BY DEFAULT. This edits the file that determines what gets compiled into
# production, so it does not write unless you pass --apply.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

TARGET="apps/hestia/.env"
REFERENCE=""
APPLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --into)   TARGET="$2"; shift 2 ;;
    --from)   REFERENCE="$2"; shift 2 ;;
    --apply)  APPLY=1; shift ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ -f "$TARGET" ] || die "env file not found: $TARGET
Pass --into <path>, or copy apps/hestia/.env.example first."
[ -z "$REFERENCE" ] || [ -f "$REFERENCE" ] || die "reference not found: $REFERENCE"

# Required keys = ARGs with NO default. An ARG that has a default is not "baked
# empty" when absent, so demanding it in the env file would be wrong.
REQUIRED="$(grep -E '^ARG [A-Z_][A-Z0-9_]*[[:space:]]*$' Dockerfile | awk '{print $2}' | sort -u)"

# A key counts as present if it is assigned at the start of a line. A commented
# "# KEY=" is NOT present - that is how the env files mark optional settings.
is_present() { grep -qE "^[[:space:]]*$1=" "$TARGET"; }

ADD=()
while read -r key; do
  [ -n "$key" ] || continue
  is_present "$key" || ADD+=("$key")
done <<< "$REQUIRED"

if [ ${#ADD[@]} -eq 0 ]; then
  log "$TARGET already has every key the Dockerfile declares. Nothing to do."
  exit 0
fi

# Build the block. Values come from the reference by copying its RAW line, which
# preserves quoting exactly - re-quoting by hand is how a value containing an
# apostrophe ("We'll notify you") breaks the build later.
#
# Two sources, in order:
#   1. --from <reference>, if given: a real env file with the values for THIS
#      deployment. Wins, because it is deployment-specific.
#   2. apps/hestia/.env.example: carries safe defaults for every public endpoint
#      and contract address, so a key picked up from here works unedited.
#      Credentials are deliberately blank in the template (it is committed to git),
#      so those still arrive empty and are reported below.
#
TEMPLATE="apps/hestia/.env.example"
BLOCK=""
FROM_REF=0
FROM_TEMPLATE=0
BLANK=()
for key in "${ADD[@]}"; do
  line=""
  origin=""

  if [ -n "$REFERENCE" ]; then
    line="$(grep -m1 -E "^[[:space:]]*$key=" "$REFERENCE" || true)"
    [ -z "${line#*=}" ] || origin=ref
  fi

  # Fall back to the template when the reference had nothing, or had it blank.
  if [ -z "$origin" ] && [ -f "$TEMPLATE" ] && [ "$TEMPLATE" != "$TARGET" ]; then
    t="$(grep -m1 -E "^[[:space:]]*$key=" "$TEMPLATE" || true)"
    if [ -n "${t#*=}" ]; then line="$t"; origin=template; fi
  fi

  case "$origin" in
    ref)      FROM_REF=$((FROM_REF + 1)) ;;
    template) FROM_TEMPLATE=$((FROM_TEMPLATE + 1)) ;;
    *)        line="$key="; BLANK+=("$key") ;;
  esac

  BLOCK="${BLOCK}${line}"$'\n'
done

echo
log "${#ADD[@]} key(s) missing from $TARGET"
# Key NAMES only. The reference holds the faucet API key and the gateway secret,
# and this output belongs in terminals and paste buffers.
printf '    %s\n' "${ADD[@]}"
echo
echo "  from reference       : $FROM_REF"
echo "  from .env.example    : $FROM_TEMPLATE"
echo "  no value available   : ${#BLANK[@]}"
if [ ${#BLANK[@]} -gt 0 ]; then
  echo
  warn "${#BLANK[@]} key(s) will be added EMPTY:
     ${BLANK[*]}
   These are blank in the template on purpose - it is committed to git, so
   credentials are not stored in it. Fill them in $TARGET by hand.
   Everything else got a working default and needs no editing."
fi

if [ "$APPLY" -eq 0 ]; then
  echo
  log "Dry run. Re-run with --apply to append these to $TARGET."
  exit 0
fi

BACKUP="$TARGET.bak.$(date +%Y%m%d-%H%M%S)"
cp -a "$TARGET" "$BACKUP"

{
  echo
  echo "# ── Added by scripts/sync-env.sh on $(date -u '+%Y-%m-%d %H:%M UTC') ──"
  echo "# These keys are declared as ARGs in the Dockerfile but were absent here."
  echo "# Values above this line were not modified."
  printf '%s' "$BLOCK"
} >> "$TARGET"

# The env file is SOURCED by build-release.sh, so the shell parses every line. A
# bad value here would otherwise surface as a bare "unexpected EOF" mid-deploy.
if ! bash -n "$TARGET" 2>/dev/null; then
  cp -a "$BACKUP" "$TARGET"
  die "Appending produced a file the shell cannot parse - reverted from $BACKUP.
   A value probably needs quoting (' \" \` or \$)."
fi

log "Appended ${#ADD[@]} key(s). Backup: $BACKUP"
echo
echo "NEXT_PUBLIC_* values are compiled in, so this needs a REBUILD to take effect:"
echo "  sudo scripts/deploy.sh"
