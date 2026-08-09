#!/usr/bin/env bash
#
# Reconcile an env file against the Dockerfile's ARGs and a reference file:
# add missing keys, and with --update, bring stale values into line.
#
# The problem this solves: every NEXT_PUBLIC_* and next.config.js `env:` value is
# baked into the bundle at build time, and a key that is absent from the env file
# does not fail the build - it bakes an empty string. New keys get added to the
# Dockerfile as features land, and the env file on each host drifts behind. That
# drift is invisible until something is silently broken in production: it is how
# six feature flags shipped unset, and how SENTRY_ORG / SENTRY_PROJECT were absent
# for a full deploy while source maps quietly failed to upload.
#
# Copying a reference env file over the host's copy is not an option - the host's
# file holds credentials the reference does not carry, so a wholesale copy wipes
# them. This script is therefore surgical: without --update it only APPENDS, and
# with --update it rewrites ONLY the specific lines whose values differ. Comments,
# ordering and every untouched line stay byte-for-byte intact either way, and a
# blank in the reference never overwrites a set value.
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
# --update ALSO RECONCILES VALUES, not just key presence. Without it this script
# is append-only: it adds absent keys and never touches an existing line, so a key
# whose value went stale stays stale while the run reports success. That is a real
# incident, not a hypothetical - a deploy shipped with a dead RPC endpoint because
# "already has every key ... nothing to do" was read as "the env is current".
#
#   scripts/sync-env.sh --from <ref> --update            # dry run, names only
#   scripts/sync-env.sh --from <ref> --update --apply    # write
#
# --check makes drift an EXIT CODE rather than something to read. Without it the
# script exits 0 whether or not keys are missing, because a dry run that found
# work to do has not failed - it has reported. That is right for a human at a
# terminal and useless in a pipeline: a deploy guard written as
# `if ! scripts/sync-env.sh ...` is dead code, which is exactly how it was first
# written here. --check exits 1 when anything is missing, and never writes.
#
#   scripts/sync-env.sh --check                          # 0 = no drift, 1 = drift
#
# A BLANK value in the reference never overwrites a non-empty value in the target.
# The reference does not carry credentials, so without that rule --update would
# wipe every secret on the box. Consequence: you cannot CLEAR a value with this
# script - do that by hand.
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
UPDATE=0
CHECK=0

while [ $# -gt 0 ]; do
  case "$1" in
    --into)   TARGET="$2"; shift 2 ;;
    --from)   REFERENCE="$2"; shift 2 ;;
    --apply)  APPLY=1; shift ;;
    --update) UPDATE=1; shift ;;
    --check)      CHECK=1; shift ;;
    -h|--help) sed -n '2,40p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

[ "$UPDATE" -eq 0 ] || [ -n "$REFERENCE" ] || {
  echo "--update needs --from <reference>: there is nothing to update from." >&2
  exit 2
}

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

if [ ${#ADD[@]} -eq 0 ] && [ "$UPDATE" -eq 0 ]; then
  log "$TARGET already has every key the Dockerfile declares. Nothing to add."
  # This message used to say "Nothing to do", which was actively misleading: the
  # append phase only cares whether a KEY EXISTS. A key can be present with a
  # stale value - which is the normal case after a config change - and this script
  # would report success while changing nothing. That is how a deploy went out
  # still pointing at a dead RPC endpoint.
  if [ -n "$REFERENCE" ]; then
    echo "   To reconcile VALUES against $REFERENCE, re-run with --update."
  else
    echo "   Note: this only checks that keys EXIST, not that values are current."
    echo "   To reconcile values:  $0 --from <reference> --update"
  fi
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
if [ ${#ADD[@]} -gt 0 ]; then
log "${#ADD[@]} key(s) missing from $TARGET"
# Key NAMES only. The reference holds the faucet API key and the gateway secret,
# and this output belongs in terminals and paste buffers.
printf '    %s\n' "${ADD[@]}"
echo
echo "  from reference       : $FROM_REF"
echo "  from .env.example    : $FROM_TEMPLATE"
echo "  no value available   : ${#BLANK[@]}"
fi
# --check: drift as an exit code, for callers that cannot read prose.
if [ "$CHECK" -eq 1 ]; then
  if [ ${#ADD[@]} -gt 0 ]; then
    die "${#ADD[@]} key(s) missing from $TARGET (listed above). They would bake
  as EMPTY STRINGS into the bundle, which does not fail the build."
  fi
  log "$TARGET has every key the Dockerfile declares."
  exit 0
fi

if [ ${#BLANK[@]} -gt 0 ]; then
  echo
  warn "${#BLANK[@]} key(s) will be added EMPTY:
     ${BLANK[*]}
   These are blank in the template on purpose - it is committed to git, so
   credentials are not stored in it. Fill them in $TARGET by hand.
   Everything else got a working default and needs no editing."
fi

# ── Update phase: reconcile VALUES, not just key presence ───────────────────
# Only runs with --update. The append phase above cannot help here, by design:
# it never touches an existing line, so a key whose value went stale stays stale
# and the script still reports success.
#
# THE ONE RULE THAT MATTERS: a blank value in the reference NEVER overwrites a
# non-empty value on the server. The reference does not carry credentials
# (SENTRY_AUTH_TOKEN, the faucet key, the Sentry DSN are blank in it on purpose),
# so without this rule, running --update would silently wipe every secret on the
# box and the next build would come out unauthenticated.
CHANGE_KEYS=()
CHANGE_LINES=()
PROTECTED=()
if [ "$UPDATE" -eq 1 ]; then
  while read -r key; do
    [ -n "$key" ] || continue
    is_present "$key" || continue          # append phase owns absent keys

    ref_line="$(grep -m1 -E "^[[:space:]]*$key=" "$REFERENCE" || true)"
    [ -n "$ref_line" ] || continue         # reference says nothing about this key

    ref_val="${ref_line#*=}"
    cur_line="$(grep -m1 -E "^[[:space:]]*$key=" "$TARGET" || true)"
    cur_val="${cur_line#*=}"

    [ "$ref_val" != "$cur_val" ] || continue

    if [ -z "$ref_val" ] && [ -n "$cur_val" ]; then
      PROTECTED+=("$key")                  # blank in reference, set here: keep ours
      continue
    fi

    CHANGE_KEYS+=("$key")
    CHANGE_LINES+=("$ref_line")            # RAW line, so quoting survives verbatim
  done <<< "$REQUIRED"

  echo
  if [ ${#CHANGE_KEYS[@]} -eq 0 ]; then
    log "All values in $TARGET already match $REFERENCE."
  else
    log "${#CHANGE_KEYS[@]} value(s) differ and would be UPDATED in $TARGET"
    printf '    %s\n' "${CHANGE_KEYS[@]}"
  fi
  if [ ${#PROTECTED[@]} -gt 0 ]; then
    echo
    echo "  ${#PROTECTED[@]} key(s) left alone - blank in the reference, set here:"
    printf '    %s\n' "${PROTECTED[@]}"
    echo "  (these are credentials the reference does not carry - not a problem)"
  fi
fi

if [ "$APPLY" -eq 0 ]; then
  echo
  if [ ${#ADD[@]} -gt 0 ] && [ ${#CHANGE_KEYS[@]} -gt 0 ]; then
    log "Dry run. --apply would append ${#ADD[@]} key(s) and update ${#CHANGE_KEYS[@]} value(s)."
  elif [ ${#CHANGE_KEYS[@]} -gt 0 ]; then
    log "Dry run. Re-run with --apply to update ${#CHANGE_KEYS[@]} value(s) in $TARGET."
  elif [ ${#ADD[@]} -gt 0 ]; then
    log "Dry run. Re-run with --apply to append these to $TARGET."
  else
    log "Dry run. Nothing would change."
  fi
  exit 0
fi

BACKUP="$TARGET.bak.$(date +%Y%m%d-%H%M%S)"
cp -a "$TARGET" "$BACKUP"

if [ ${#ADD[@]} -gt 0 ]; then
  {
    echo
    echo "# ── Added by scripts/sync-env.sh on $(date -u '+%Y-%m-%d %H:%M UTC') ──"
    echo "# These keys are declared as ARGs in the Dockerfile but were absent here."
    echo "# Values above this line were not modified."
    printf '%s' "$BLOCK"
  } >> "$TARGET"
fi

# Rewrite changed values in place. Line-by-line rather than sed -i so that a value
# containing / & \ or $ cannot be mangled by substitution syntax, and so untouched
# lines - including every comment - stay byte-for-byte identical.
if [ ${#CHANGE_KEYS[@]} -gt 0 ]; then
  TMP="$TARGET.sync.$$"
  : > "$TMP"
  while IFS= read -r line || [ -n "$line" ]; do
    replaced=0
    i=0
    for k in "${CHANGE_KEYS[@]}"; do
      case "$line" in
        "$k"=*|" $k"=*|"	$k"=*)
          printf '%s\n' "${CHANGE_LINES[$i]}" >> "$TMP"
          replaced=1
          break ;;
      esac
      i=$((i + 1))
    done
    [ "$replaced" -eq 1 ] || printf '%s\n' "$line" >> "$TMP"
  done < "$TARGET"
  mv "$TMP" "$TARGET"
fi

# The env file is SOURCED by build-release.sh, so the shell parses every line. A
# bad value here would otherwise surface as a bare "unexpected EOF" mid-deploy.
if ! bash -n "$TARGET" 2>/dev/null; then
  cp -a "$BACKUP" "$TARGET"
  die "The result is a file the shell cannot parse - reverted from $BACKUP.
   A value probably needs quoting (' \" \` or \$)."
fi

# Every required key must still be assigned. This catches the disaster case for
# the update phase: a bug in the rewrite dropping a line instead of replacing it.
LOST=""
while read -r key; do
  [ -n "$key" ] || continue
  is_present "$key" || LOST="$LOST $key"
done <<< "$REQUIRED"
if [ -n "$LOST" ]; then
  cp -a "$BACKUP" "$TARGET"
  die "Key(s) went missing during the rewrite - reverted from $BACKUP:$LOST"
fi

log "Appended ${#ADD[@]} key(s), updated ${#CHANGE_KEYS[@]} value(s). Backup: $BACKUP"
echo
echo "NEXT_PUBLIC_* values are compiled in, so this needs a REBUILD to take effect:"
echo "  sudo scripts/deploy.sh"
