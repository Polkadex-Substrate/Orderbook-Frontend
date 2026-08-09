#!/usr/bin/env bash
#
# Read the repo's open Dependabot alerts without a browser.
#
# WHY THIS EXISTS
# The Security tab needs a repo-admin GitHub session, so it cannot be read from
# a script, a CI job, or by anyone helping debug a build. `yarn audit` is not a
# substitute: it counts dependency PATHS, Dependabot counts MANIFESTS, and
# neither counts problems. On 2026-08-09 the same tree was simultaneously "15
# vulnerabilities" (the push warning), "8 alerts" (Dependabot) and 6 distinct
# problems. Three numbers, one tree, and no way to reconcile them by hand.
#
# This prints the list Dependabot actually holds, plus the distinct count, so
# the three numbers stop being mysterious.
#
# THIS NEVER FAILS A BUILD.
# `gh` is not installed on the deploy host and never will be - the host has no
# GitHub credentials by design, and giving it some would be a downgrade. A build
# step that needs a token the build host must not have is a step that either
# breaks the deploy or pressures someone into putting a token on it. So: absent
# gh, unauthenticated gh, no network, or a private-repo 403 all SKIP with a
# reason and exit 0. Only --strict can exit non-zero, and nothing calls it with
# --strict automatically.
#
# Usage:
#   scripts/check-advisories.sh              # list open alerts, exit 0 always
#   scripts/check-advisories.sh --strict     # exit 1 if a FIXABLE high/critical
#                                            # alert is open (for a human or CI)
#   scripts/check-advisories.sh --json       # raw JSON, for piping
#
set -euo pipefail

STRICT=0
JSON=0
TIMEOUT=20

while [ $# -gt 0 ]; do
  case "$1" in
    --strict)  STRICT=1; shift ;;
    --json)    JSON=1; shift ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    -h|--help) sed -n '2,31p' "$0"; exit 0 ;;
    *)         echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2; }
skip() { printf '\033[1;36m==>\033[0m Advisories: skipped (%s)\n' "$*"; exit 0; }

command -v gh >/dev/null 2>&1 || skip "gh is not installed"
gh auth status >/dev/null 2>&1 || skip "gh is not authenticated (run: gh auth login)"
git rev-parse --git-dir >/dev/null 2>&1 || skip "not a git checkout"

# `{owner}/{repo}` is resolved by gh from the checkout's remote, so this script
# is not pinned to one fork and keeps working after a rename.
ALERTS_JSON=$(
  timeout "$TIMEOUT" gh api \
    "repos/{owner}/{repo}/dependabot/alerts?state=open&per_page=100" \
    --paginate 2>/dev/null
) || skip "could not reach the Dependabot API (no network, or no admin access to this repo)"

[ -n "$ALERTS_JSON" ] || skip "empty response from the Dependabot API"

if [ "$JSON" -eq 1 ]; then
  printf '%s\n' "$ALERTS_JSON"
  exit 0
fi

# python3 rather than jq: jq is not guaranteed present, python3 already gates
# other checks in this repo. Reads the whole array from stdin.
SUMMARY=$(printf '%s\n' "$ALERTS_JSON" | python3 -c '
import sys, json, collections

raw = sys.stdin.read().strip()
if not raw:
    sys.exit(0)

# --paginate concatenates JSON arrays; parse each one and flatten.
alerts, dec, idx = [], json.JSONDecoder(), 0
while idx < len(raw):
    while idx < len(raw) and raw[idx].isspace():
        idx += 1
    if idx >= len(raw):
        break
    obj, idx = dec.raw_decode(raw, idx)
    alerts.extend(obj if isinstance(obj, list) else [obj])

alerts = [a for a in alerts if a.get("state") == "open"]

RANK = {"critical": 0, "high": 1, "medium": 2, "moderate": 2, "low": 3}

rows = []
for a in alerts:
    adv = a.get("security_advisory") or {}
    vuln = a.get("security_vulnerability") or {}
    dep = a.get("dependency") or {}
    patched = (vuln.get("first_patched_version") or {}).get("identifier") or "no fix"
    rows.append({
        "sev": (adv.get("severity") or "?").lower(),
        "pkg": (dep.get("package") or {}).get("name") or "?",
        "patched": patched,
        "manifest": dep.get("manifest_path") or "?",
        "ghsa": adv.get("ghsa_id") or "?",
        "num": a.get("number"),
    })

rows.sort(key=lambda r: (RANK.get(r["sev"], 9), r["pkg"]))

# Distinct problem = one advisory id. A package we DECLARE ourselves yields two
# alerts under the same id (its manifest and yarn.lock); a transitive one yields
# one. That is the whole reason the alert count exceeds the problem count.
by_ghsa = collections.OrderedDict()
for r in rows:
    by_ghsa.setdefault(r["ghsa"], []).append(r)

print("  %-9s %-34s %-10s %s" % ("SEVERITY", "PACKAGE", "PATCHED", "MANIFEST"))
for r in rows:
    print("  %-9s %-34s %-10s %s" % (r["sev"], r["pkg"], r["patched"], r["manifest"]))

fixable = [g for g, rs in by_ghsa.items()
           if rs[0]["sev"] in ("critical", "high") and rs[0]["patched"] != "no fix"]
nofix = [g for g, rs in by_ghsa.items() if rs[0]["patched"] == "no fix"]

print()
print("  %d open alert(s), %d distinct advisory id(s)" % (len(rows), len(by_ghsa)))
print("  %d high/critical with a fix available, %d with no upstream fix"
      % (len(fixable), len(nofix)))
print("FIXABLE_COUNT=%d" % len(fixable))
')

FIXABLE=$(printf '%s\n' "$SUMMARY" | sed -n 's/^FIXABLE_COUNT=//p')
printf '%s\n' "$SUMMARY" | grep -v '^FIXABLE_COUNT='

echo
echo "  Context and per-package reasoning: DEPENDENCIES.md"
echo "  Do not read the raw count as a problem count - see the section"
echo "  \"The advisory count is paths, not problems\"."

if [ "$STRICT" -eq 1 ] && [ "${FIXABLE:-0}" -gt 0 ]; then
  warn "$FIXABLE high/critical advisory(ies) have a published fix."
  exit 1
fi
exit 0
