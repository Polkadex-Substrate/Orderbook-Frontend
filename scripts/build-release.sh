#!/usr/bin/env bash
#
# Build a release of the Orderbook frontend.
#
# Two modes, same env file, same version stamp:
#
#   docker  (DEFAULT) - build an OCI image from the repo Dockerfile.
#                       Produces <repo>:<version>-<sha> and <repo>:latest.
#   tarball           - build a self-contained tarball for scripts/install.sh
#                       (bare-metal / systemd deploys, no Docker on the host).
#
# IMPORTANT: NEXT_PUBLIC_* and the next.config.js `env:` values are compiled
# into the build. The artifact is therefore specific to ONE environment - to
# build for staging and production, run this twice with different --env files.
# Only genuinely runtime settings (PORT, HOSTNAME, NODE_ENV) can differ later.
#
# This script exports the env file and passes every ARG explicitly, because
# NEXT_PUBLIC_* values are baked in at build time and a missing one does not
# fail the build - it bakes an empty string. NEXT_PUBLIC_PROJECT_ID is the
# sharpest example: empty, and the app throws at boot.
#
# There was a docker-compose.yml here that duplicated the ARG list by hand. It
# was deleted: nothing ran it (the deploy installs the extracted artifact under
# systemd, not a container), it drifted from the Dockerfile every time an ARG
# was added, and compose only interpolates ${VAR} from the shell or a ROOT .env
# - `env_file:` applies to the running container, NOT to build args - so it
# silently baked empty values, which is exactly the failure this script exists
# to prevent.
#
# Usage:
#   scripts/build-release.sh                        # docker image (default)
#   scripts/build-release.sh --tarball              # tarball instead
#   scripts/build-release.sh --env path/to.env      # explicit env file
#   scripts/build-release.sh --repo my/orderbook-fe # image repo name
#   scripts/build-release.sh --tag v1.2.3           # override the tag
#   scripts/build-release.sh --push                 # push after building
#   scripts/build-release.sh --no-preflight         # skip the formatting check
#   scripts/build-release.sh --platform linux/arm64 # cross-build
#   scripts/build-release.sh --skip-install         # tarball: reuse node_modules
#   scripts/build-release.sh --install-docker       # install Docker if missing,
#                                                   # without prompting
#   scripts/build-release.sh --tarball --from-image orderbook-fe:latest
#                                                   # extract the standalone
#                                                   # tree from an image you
#                                                   # already built - no Node,
#                                                   # yarn or 4 GB rebuild
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MODE=docker
BUILD_ENV_FILE="apps/hestia/.env"
# Fast formatting check before the 4.5-minute compile. --no-preflight to skip.
PREFLIGHT=1
SKIP_INSTALL=0
IMAGE_REPO="orderbook-fe"
IMAGE_TAG=""
PUSH=0
PLATFORM=""
FROM_IMAGE=""
INSTALL_DOCKER=0

while [ $# -gt 0 ]; do
  case "$1" in
    --docker)       MODE=docker; shift ;;
    --tarball)      MODE=tarball; shift ;;
    --env)          BUILD_ENV_FILE="$2"; shift 2 ;;
    --no-preflight) PREFLIGHT=0; shift ;;
    --repo)         IMAGE_REPO="$2"; shift 2 ;;
    --tag)          IMAGE_TAG="$2"; shift 2 ;;
    --push)         PUSH=1; shift ;;
    --platform)     PLATFORM="$2"; shift 2 ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    --from-image)   FROM_IMAGE="$2"; MODE=tarball; shift 2 ;;
    --install-docker) INSTALL_DOCKER=1; shift ;;
    # 2,46: the whole usage comment block. Was 2,33, which cut the help off
    # mid-list as options were added.
    -h|--help)      sed -n '2,46p' "$0"; exit 0 ;;
    *)              echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

log()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# Sourced AFTER log/warn/die: the library calls them.
DOCKER_LIB="$REPO_ROOT/scripts/lib/docker-install.sh"
if [ -r "$DOCKER_LIB" ]; then
  # shellcheck disable=SC1090
  . "$DOCKER_LIB"
else
  # Keep the script usable if the lib is missing (e.g. a partial checkout).
  ensure_docker() {
    command -v docker >/dev/null || die "docker is not installed (use --tarball)"
    docker info >/dev/null 2>&1 || die "cannot reach the Docker daemon"
  }
fi

[ -f "$BUILD_ENV_FILE" ] || die "env file not found: $BUILD_ENV_FILE
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
# Syntax-check before sourcing. Because the file is sourced, the SHELL parses
# every line - so a value containing an apostrophe, a double quote, a backtick
# or a `$` is a syntax error unless it is quoted. The classic case is a
# user-facing sentence:
#
#   NEXT_PUBLIC_HYPERBRIDGE_MAINTENANCE_MESSAGE=... We'll notify you ...
#
# which aborts the build with a bare
#   apps/hestia/.env: line 109: unexpected EOF while looking for matching `''
# and no indication that the env file is what is wrong, let alone which value.
if ! bash -n "$BUILD_ENV_FILE" 2>/dev/null; then
  echo "Shell syntax error in $BUILD_ENV_FILE:" >&2
  bash -n "$BUILD_ENV_FILE" 2>&1 | sed 's/^/  /' >&2
  die "This file is sourced, so values containing ' \" \` or \$ must be quoted:
    KEY=\"a value with an apostrophe like We'll\"
  The line number above points at where the quote was left open, which is
  usually the line with the unquoted character."
fi

# ── Pre-flight: formatting ──────────────────────────────────────────────────
# `next build` runs ESLint as its LAST step, after the full webpack compile. So a
# one-line prettier violation fails the build 4.5 minutes in, having thrown away
# the entire compile. Prettier alone takes about a second and catches the most
# common class of that failure.
#
# Deliberately only prettier, not the full eslint run: this must stay fast enough
# that nobody is tempted to skip it, and formatting is what actually breaks builds
# in practice. Skip with --no-preflight if you need to build a known-dirty tree.
if [ "$PREFLIGHT" -eq 1 ] && [ -x node_modules/.bin/prettier ]; then
  if ! node_modules/.bin/prettier --check \
      "apps/*/src/**/*.{ts,tsx}" "packages/*/src/**/*.{ts,tsx}" \
      "apps/*/*.js" >/dev/null 2>&1; then
    echo "Formatting problems (these WILL fail next build's lint step):" >&2
    node_modules/.bin/prettier --list-different \
      "apps/*/src/**/*.{ts,tsx}" "packages/*/src/**/*.{ts,tsx}" \
      "apps/*/*.js" 2>/dev/null | sed 's/^/  /' >&2
    die "Run:  node_modules/.bin/prettier --write <the files above>
  Then re-run this script. Or pass --no-preflight to build anyway."
  fi
  log "Pre-flight: formatting ok"

  # ESLint too, errors only. Prettier alone proved insufficient: a build died
  # 4.3 minutes in on import/order errors, which are eslint rules prettier
  # cannot see. This costs ~a minute; the compile it saves costs 4.5. Warnings
  # are not checked - next build does not fail on them.
  if [ -x node_modules/.bin/eslint ]; then
    log "Pre-flight: eslint (errors only, ~1 min)"
    # set -o pipefail is on, so the pipeline carries eslint's exit code.
    if ! node_modules/.bin/eslint apps/hestia/src packages/core/src packages/format/src \
        --ext .ts,.tsx --quiet 2>&1 | sed 's/^/  /'; then
      die "ESLint errors above WILL fail next build's lint step.
  Most are auto-fixable:  node_modules/.bin/eslint <file> --fix
  Or pass --no-preflight to build anyway."
    fi
    log "Pre-flight: eslint ok"
  fi

  # Type check. Neither check above can see a missing import: prettier only
  # formats, and eslint's no-undef is DISABLED for TypeScript on the assumption
  # that tsc owns that job - so if tsc never runs, nothing owns it. A
  # `describeRpcError` used without importing it passed both pre-flights and then
  # failed `next build` at 2m16s, during "Linting and checking validity of types".
  # That is the same check, just 2 minutes later. tsc takes seconds.
  if [ -x node_modules/.bin/tsc ]; then
    log "Pre-flight: tsc (types, ~20s)"

    # STATIC-ASSET IMPORTS ARE IGNORED HERE, ON PURPOSE.
    #
    # `import hero from "../../public/img/hero.webp"` is typed by
    # node_modules/next/image-types/global.d.ts, which is only reachable through
    # apps/hestia/next-env.d.ts - a file Next GENERATES and .gitignores. On a
    # fresh server checkout it does not exist yet, so tsc reported 10 bogus
    # TS2307 "cannot find module ...webp" errors and blocked a deploy. All 10
    # images are committed and present; `next build` never complains, because it
    # regenerates that file before type checking.
    #
    # `next typegen` is the documented way to generate it without a full build,
    # but it is not reliable everywhere (it needs rollup's platform binary, which
    # is absent in some environments), so this gate does not depend on it. Making
    # the check ignore asset imports is strictly more robust than making it
    # depend on a step that can fail.
    #
    # What this still catches is the failure that motivated the gate: a symbol
    # used without being imported is TS2304 "Cannot find name", which no filter
    # here touches. That is the error that reached `next build` and cost 2m16s.
    tsc_out=$(node_modules/.bin/tsc -p apps/hestia/tsconfig.json --noEmit \
                --pretty false 2>&1) || true
    asset_re="error TS2307: Cannot find module '[^']*\.(webp|png|jpe?g|gif|svg|avif|ico)'"
    tsc_real=$(printf '%s\n' "$tsc_out" | grep -E "error TS" | grep -vE "$asset_re" || true)
    tsc_skipped=$(printf '%s\n' "$tsc_out" | grep -cE "$asset_re" || true)

    if [ -n "$tsc_real" ]; then
      printf '%s\n' "$tsc_real" | sed 's/^/  /' >&2
      die "Type errors above WILL fail next build, but 2 minutes later.
  Fix them, then re-run. Or pass --no-preflight to build anyway."
    fi
    if [ "${tsc_skipped:-0}" -gt 0 ]; then
      log "Pre-flight: tsc ok ($tsc_skipped asset-import error(s) ignored - next build generates those types)"
    else
      log "Pre-flight: tsc ok"
    fi
  fi
fi

# ── Guard: no credential-shaped strings in git-tracked files ────────────────
# NOT part of --no-preflight, and not skippable. A failed build costs minutes; a
# key committed to history costs a rotation and cannot be un-published.
#
# The real hazard is specific and recurring: RPC providers hand out endpoints
# with the key embedded in the URL, those URLs go in NEXT_PUBLIC_* vars, and the
# obvious place to paste one is the default in src/config/bridge.ts or
# apps/hestia/.env.example - both tracked. Keyed URLs belong ONLY in the
# untracked env file on the deploy host.
#
# Patterns are split mid-literal ('AIza' 'Sy') so this script does not match
# itself. Shape-matched on purpose: high confidence, no false positives on the
# public identifiers that legitimately live in tracked files.
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
  # GOCSPX- is a Google OAuth CLIENT SECRET. Added 2026-08-09 after a
  # `client_secret_*.json` was downloaded from the Google console for the GDrive
  # backup feature: the guard would have let that file straight through, because
  # it only knew about API keys (AIzaSy) and Sentry tokens. The download is the
  # normal way Google hands you an OAuth client, so the file lands in Downloads
  # and gets copied next to the code it configures - which is exactly the
  # sequence this guard exists to interrupt.
  #
  # Note the frontend never needs the secret at all: the GDrive flow is
  # browser-side and uses only the client ID. So any GOCSPX- string in this repo
  # is by definition misplaced, which makes this the rare pattern with no
  # legitimate exception.
  secret_pat="AIza""Sy[0-9A-Za-z_-]{33}|sntry""s_[A-Za-z0-9]|sntry""u_[A-Za-z0-9]|GOCS""PX-[A-Za-z0-9_-]{20}"
  # Tracked files AND untracked-but-unignored ones. The tracked-only version
  # missed the real near-miss: sync-env.sh's .env.bak.<timestamp> backups carry
  # credentials and were not ignored, so they sat in the tree one `git add -A`
  # away from being committed. A file the guard can see before it is staged is a
  # file the guard should refuse to build over.
  #
  # The two cases must be reported SEPARATELY, because the remedy differs and one
  # of them ends in "rotate the key". The first version lumped them together
  # under "These files are committed - the value would be public", which fired on
  # a merely-untracked file (a stray copy of the env reference sitting in
  # apps/hestia/) and told the operator to treat a never-committed key as leaked.
  # A guard that cries "rotate" when nothing escaped trains people to ignore it,
  # which is precisely how the real case gets waved through.
  #
  # TRACKED     -> in history, may be pushed: rotate.
  # UNTRACKED   -> one `git add -A` from disaster, but nothing has escaped:
  #                move or ignore it, no rotation.
  tracked_hits=$(git ls-files -z \
    | xargs -0 grep -lEI "$secret_pat" 2>/dev/null || true)
  untracked_hits=$(git ls-files -z --others --exclude-standard \
    | xargs -0 grep -lEI "$secret_pat" 2>/dev/null || true)

  if [ -n "$tracked_hits" ]; then
    echo "CREDENTIAL-SHAPED STRING IN GIT-TRACKED FILES:" >&2
    printf '%s\n' "$tracked_hits" | sed 's/^/  /' >&2
    die "Refusing to build. These files are IN GIT - the value is public to anyone
  with repo access, and if the commit was pushed it is leaked for good.
  1. ROTATE the credential at the provider. Removing the line is not enough.
  2. Keep the tracked default keyless; keyed URLs live only in the deploy
     host's untracked env file."
  fi

  if [ -n "$untracked_hits" ]; then
    echo "CREDENTIAL-SHAPED STRING IN UNTRACKED FILES:" >&2
    printf '%s\n' "$untracked_hits" | sed 's/^/  /' >&2
    die "Refusing to build. Nothing has leaked - these files are NOT in git and
  NOT ignored, so no rotation is needed. But they are one \`git add -A\` from
  being committed, which is the point at which rotation would be needed.
  Delete the stray copy, move it outside the repo, or add it to .gitignore.
  (apps/hestia/.env itself is already ignored - copies under other names are not.)"
  fi

  log "Pre-flight: no credentials in tracked or untracked files"
fi

# ── Guard: a published fix must be the copy that actually ships ─────────────
# Declaring "@aksumite/ui": "^1.0.3" in apps/hestia was NOT enough. @mitrabook/ux
# depends on "@aksumite/ui": "^1.0.0" and yarn gave it its OWN nested copy at
# 1.0.2 - the burned version without the Passcode fix. Every Passcode in this
# app is imported from @mitrabook/ux, so the fixed 1.0.3 sat hoisted at the root
# being used by nothing, while the crash shipped from a directory nobody looks
# in. A `resolutions` entry forces one copy; this checks that it worked.
#
# Nested copies are legitimate in general. What is not legitimate is a nested
# copy of a package we just published a fix to.
if [ -d node_modules ]; then
  nested=$(find node_modules -path "*/node_modules/@aksumite/*/package.json" \
             -not -path "node_modules/@aksumite/*" 2>/dev/null || true)
  if [ -n "$nested" ]; then
    echo "DUPLICATE @aksumite COPIES - a published fix may not be the one shipping:" >&2
    printf '%s\n' "$nested" | while read -r f; do
      [ -n "$f" ] || continue
      name=$(node -p "require('./$f').name" 2>/dev/null || echo "?")
      ver=$(node -p "require('./$f').version" 2>/dev/null || echo "?")
      under=${f%%/node_modules/@aksumite/*}
      echo "  $name@$ver  nested under  $under" >&2
    done
    die "Add a \`resolutions\` entry in the root package.json pinning these to the
  published version, then re-run \`yarn install\` so the lockfile agrees.
  A hoisted fix that no importer resolves to is not a fix."
  fi
  log "Pre-flight: one copy of each @aksumite package"
fi

# ── Pre-flight: lockfile agrees with the manifests ──────────────────────────
# One second here, versus a failure minutes into the docker build whose obvious
# remedy - `yarn install` on the deploy host - writes to a checkout that should
# only ever be read, and then asks root@<host> for a commit.
if [ -f scripts/check-lockfile.js ] && command -v node >/dev/null 2>&1; then
  node scripts/check-lockfile.js >/dev/null 2>&1 || {
    node scripts/check-lockfile.js || true
    die "Regenerate the lockfile on a development machine and push it."
  }
  log "Pre-flight: lockfile in sync"
fi

# ── Informational: open Dependabot advisories ───────────────────────────────
# REPORT ONLY. This must never fail a build, for a reason worth stating: `gh`
# needs a GitHub token, the deploy host deliberately has none, and a build step
# that requires a credential the build host must not hold is a step that either
# breaks the deploy or pressures someone into putting a token on it. So the
# script skips itself - cleanly, with a reason - whenever gh is absent,
# unauthenticated, or offline, which is every build on the deploy host.
#
# It is here rather than in deploy.sh because deploy.sh only ever runs on that
# host, where this would print "skipped" and nothing else, forever.
#
# Run it with --strict by hand (or in CI) to get a non-zero exit for a
# high/critical advisory that has a published fix.
# `-f` and an explicit `bash`, NOT `-x` and a direct call: if the exec bit does
# not survive a checkout (git records mode 100644 unless it was staged 100755),
# an `-x` test would skip this step forever and silently. A check that quietly
# stops running is worse than no check.
if [ "$PREFLIGHT" -eq 1 ] && [ -f scripts/check-advisories.sh ]; then
  bash scripts/check-advisories.sh || true
fi

# `set -a` exports everything sourced, which is what makes the values visible
# to `docker build --build-arg` below and to `next build` in tarball mode.
set -a
# shellcheck disable=SC1090
. "$BUILD_ENV_FILE"
set +a

: "${NEXT_PUBLIC_PROJECT_ID:?NEXT_PUBLIC_PROJECT_ID is required - the app throws at boot without it}"

log "orderbook-fe $STAMP  (mode: $MODE, env: $BUILD_ENV_FILE)"

# ════════════════════════════════════════════════════════════════════════
# Docker mode
# ════════════════════════════════════════════════════════════════════════
if [ "$MODE" = docker ]; then
  ensure_docker "$INSTALL_DOCKER"

  # Derive the build-arg list from the Dockerfile itself, so a newly added ARG
  # is passed automatically instead of silently defaulting to empty. That is
  # exactly the bug that left six feature flags unset in every image built so
  # far: compose passed them, the Dockerfile never declared them.
  BUILD_ARGS=()
  MISSING=()
  DELIBERATELY_EMPTY=()
  RESOLVED=0
  while read -r name; do
    [ -n "$name" ] || continue
    #
    # `${!name+x}` tests EXISTENCE; `${!name:-}` tested for a non-empty value. The
    # difference matters: several vars are documented in the env file as "leave
    # EMPTY, do not omit" (DISABLED_FEATURES defaults to a non-empty list when
    # absent, BLOCKED_ASSETS, UNDER_MAINTENACE, READ_ONLY_TOKEN). The old test
    # reported all of those as missing on every single build, so the warning
    # routinely listed ~8 benign names - and the three that actually mattered
    # (SENTRY_ORG, SENTRY_PROJECT, SENTRY_ENVIRONMENT) were lost among them.
    #
    # A warning that cries wolf on every build is not a warning.
    #
    if [ -z "${!name+x}" ]; then
      MISSING+=("$name")            # absent from the env file entirely
    else
      # Present, empty or not. An empty value is legitimate and is passed through
      # explicitly rather than left to the ARG default, so the image reflects the
      # env file exactly.
      # Two array elements per arg - count separately, don't use ${#BUILD_ARGS[@]}.
      BUILD_ARGS+=(--build-arg "$name=${!name}")
      RESOLVED=$((RESOLVED + 1))
      [ -n "${!name}" ] || DELIBERATELY_EMPTY+=("$name")
    fi
    # Only ARGs WITHOUT a default in the Dockerfile (`ARG NAME`, not
    # `ARG NAME=value`). One with a default is not "baked empty" when unset,
    # so warning about it would be wrong and would train you to ignore the
    # warning that matters.
  done < <(grep -E '^ARG [A-Z_][A-Z0-9_]*[[:space:]]*$' Dockerfile | awk '{print $2}' | sort -u)

  if [ ${#MISSING[@]} -gt 0 ]; then
    warn "${#MISSING[@]} build arg(s) ABSENT from $BUILD_ENV_FILE, baked empty:
     ${MISSING[*]}
   Add them with:  scripts/sync-env.sh --from <reference.env>
   (that only appends what is missing; it never touches existing values)"
  fi
  # Not a warning: these are present and intentionally blank. Counted, not listed,
  # so the absent list above stays readable.
  if [ ${#DELIBERATELY_EMPTY[@]} -gt 0 ]; then
    log "${#DELIBERATELY_EMPTY[@]} build arg(s) present but empty (intentional for flags/opt-outs)"
  fi

  # A faucet that is switched on but has no endpoint fails at the point of use,
  # after the user has already been sent to /faucet from the Fund Account modal.
  if [ "${NEXT_PUBLIC_ENABLE_FAUCET:-}" = "true" ] && [ -z "${NEXT_PUBLIC_FAUCET_URL:-}" ]; then
    warn "NEXT_PUBLIC_ENABLE_FAUCET=true but NEXT_PUBLIC_FAUCET_URL is empty -
     the faucet page will be reachable and non-functional."
  fi

  log "Building ${IMAGE_REPO}:${IMAGE_TAG}  ($RESOLVED build args)"
  # Explicit, not derived from the env file: this is build metadata, not config.
  # A unique value per build is what keeps /_next/static/<buildId>/ from being
  # served stale out of a year-long immutable cache after a deploy.
  BUILD_ARGS+=(--build-arg "NEXT_BUILD_ID=$STAMP")

  # Sentry source map upload. The token is passed as a BuildKit SECRET, never a
  # build arg: an arg is readable from `docker history` by anyone with the image.
  #
  # Read from the env file like everything else (`set -a` above exports it), but
  # deliberately NOT via the generated --build-arg list, since it must not become
  # an ARG. `env=` hands Docker the variable NAME, so the value itself never
  # appears in the process table or in any file on disk.
  SECRET_ARGS=()
  if [ -n "${SENTRY_AUTH_TOKEN:-}" ]; then
    log "Source maps: uploading (SENTRY_AUTH_TOKEN present)"
    SECRET_ARGS+=(--secret "id=sentry_auth_token,env=SENTRY_AUTH_TOKEN")
    for v in SENTRY_ORG SENTRY_PROJECT; do
      [ -n "${!v:-}" ] || warn "$v is unset - Sentry upload will be a no-op even with a token."
    done
  elif [ -n "${SENTRY_DSN:-}" ]; then
    warn "SENTRY_AUTH_TOKEN unset: errors will report, but stack traces will be
     MINIFIED and unreadable. Add it to the env file to enable source maps."
  fi

  docker build \
    ${PLATFORM:+--platform "$PLATFORM"} \
    "${BUILD_ARGS[@]}" \
    "${SECRET_ARGS[@]+"${SECRET_ARGS[@]}"}" \
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

  # Repeated here on purpose. The warning above is emitted BEFORE a build that
  # takes several minutes and prints hundreds of lines, so by the time anyone
  # reads the outcome it has scrolled out of view - which is how a deploy shipped
  # with SENTRY_ORG and SENTRY_PROJECT unset and nobody noticed. Same facts, at
  # the point where the operator is actually looking.
  if [ ${#MISSING[@]} -gt 0 ]; then
    echo
    warn "This image was built with ${#MISSING[@]} build arg(s) EMPTY:
     ${MISSING[*]}
   Each was absent from $BUILD_ENV_FILE. NEXT_PUBLIC_* values are baked in at
   build time, so fixing the env file requires a REBUILD, not a restart."
  fi
  echo
  echo "Run it (ad-hoc, for a smoke test):"
  echo "  docker run --rm -p 3000:3000 --env-file $BUILD_ENV_FILE ${IMAGE_REPO}:${IMAGE_TAG}"
  echo
  echo "Deploy it (extracts the artifact and installs it under systemd):"
  echo "  sudo scripts/deploy.sh"
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════
# Tarball mode
# ════════════════════════════════════════════════════════════════════════
OUT_DIR="$REPO_ROOT/dist"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
PKG="$STAGE/orderbook-fe"

if [ -n "$FROM_IMAGE" ]; then
  # The runner stage IS the assembled standalone tree at /app - static assets
  # and public/ already copied in. Extracting it avoids a second full build
  # (and its 4 GB peak) on a host that has already produced the image.
  # No auto-install here: --from-image extracts an image that must already
  # exist locally, so a fresh Docker install could not satisfy the request.
  ensure_docker 0
  docker image inspect "$FROM_IMAGE" >/dev/null 2>&1 \
    || die "image not found locally: $FROM_IMAGE"

  log "Extracting standalone tree from $FROM_IMAGE"
  CID="$(docker create "$FROM_IMAGE")"
  # shellcheck disable=SC2064
  trap "docker rm -f '$CID' >/dev/null 2>&1; rm -rf '$STAGE'" EXIT
  mkdir -p "$PKG"
  docker cp "$CID:/app/." "$PKG/"
  docker rm "$CID" >/dev/null

  [ -f "$PKG/apps/hestia/server.js" ] \
    || die "extracted tree has no apps/hestia/server.js - is $FROM_IMAGE an orderbook-fe image?"
  [ -d "$PKG/apps/hestia/.next/static" ] \
    || die "extracted tree is missing .next/static"
else
  command -v node >/dev/null || die "node is not installed (or use --from-image)"
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  # 22, not 20: @hyperbridge/sdk declares engines.node ">=22.x.x", so yarn
  # refuses to install on 20. Node 20 also went EOL in April 2026.
  [ "$NODE_MAJOR" -ge 22 ] || die "Node 22+ required (@hyperbridge/sdk), found $(node -v)"
  command -v yarn >/dev/null \
    || die "yarn is not installed (corepack enable; corepack prepare yarn@1.22.22 --activate)"

  if [ "$SKIP_INSTALL" -eq 0 ]; then
    log "Installing dependencies (frozen lockfile)"
    yarn install --frozen-lockfile
  fi

  log "Running production build"
  NODE_OPTIONS="${NODE_OPTIONS:---max_old_space_size=4096}" \
  NEXT_TELEMETRY_DISABLED=1 \
    yarn build

  STANDALONE="apps/hestia/.next/standalone"
  [ -d "$STANDALONE" ] || die "standalone output missing - is output:'standalone' still set in next.config.js?"

  log "Assembling release tree"
  mkdir -p "$PKG"
  cp -R "$STANDALONE"/. "$PKG"/

  # Next deliberately excludes these two from the standalone output.
  mkdir -p "$PKG/apps/hestia/.next"
  cp -R apps/hestia/.next/static "$PKG/apps/hestia/.next/static"
  cp -R apps/hestia/public       "$PKG/apps/hestia/public"
fi

# ── What commit is ACTUALLY in this artifact? ───────────────────────────────
#
# Not necessarily HEAD. In --from-image mode (which is how deploy.sh always
# repacks) the payload is extracted from a prebuilt image, and that image may
# have been built from an earlier commit - most commonly because the newer
# commit changed nothing inside the Docker build context, so every layer was
# cached and `latest` still points at the older build.
#
# THE BUG THIS FIXES, observed 2026-08-10: RELEASE said commit=0dfc0b4d while
# the served bundle reported release 0.1.0-a10811ad. RELEASE had simply recorded
# `git rev-parse HEAD` of the checkout doing the packaging. An operator reading
# RELEASE to answer "what is running?" got a confident wrong answer, which is
# worse than no answer - it is the file you consult during an incident.
#
# Next writes generateBuildId's output to .next/BUILD_ID, and that value IS
# NEXT_BUILD_ID, i.e. "<version>-<sha>". So the artifact carries its own
# provenance and we read it back rather than assuming.
ARTIFACT_STAMP=""
if [ -r "$PKG/apps/hestia/.next/BUILD_ID" ]; then
  ARTIFACT_STAMP="$(cat "$PKG/apps/hestia/.next/BUILD_ID" 2>/dev/null | tr -d '[:space:]')"
fi

TRUE_COMMIT="$GITSHA$DIRTY"
if [ -n "$ARTIFACT_STAMP" ]; then
  # BUILD_ID is "<version>-<sha>"; strip the version prefix to get the sha.
  TRUE_COMMIT="${ARTIFACT_STAMP#"$VERSION"-}"
  if [ "$ARTIFACT_STAMP" != "$STAMP" ]; then
    warn "ARTIFACT IS NOT BUILT FROM THIS CHECKOUT.
     checkout HEAD : $STAMP
     artifact      : $ARTIFACT_STAMP   (from .next/BUILD_ID)
   RELEASE will record the ARTIFACT's commit, which is what is actually running.
   This is normal when the newer commit changed nothing inside the Docker build
   context - the image layers were cached and ${FROM_IMAGE:-the image} still
   holds the earlier build. If you expected a rebuild, the change was outside
   the build context (a script, a doc) or .dockerignore excluded it."
  fi
fi

# Runtime metadata, so a deployed host can report what it is running.
#
# `commit` is the artifact's own build id, NOT the packaging checkout's HEAD.
# `packaged_from_head` records the checkout separately so a mismatch stays
# visible on the host rather than being silently reconciled.
cat > "$PKG/RELEASE" <<EOF
name=orderbook-fe
version=$VERSION
commit=$TRUE_COMMIT
build_id=${ARTIFACT_STAMP:-$STAMP}
packaged_from_head=$GITSHA$DIRTY
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
built_from=$(hostname 2>/dev/null || echo unknown)
node=$(node -v 2>/dev/null || echo "n/a (extracted from image)")
source=${FROM_IMAGE:-source-build}
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
