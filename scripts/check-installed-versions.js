#!/usr/bin/env node
/**
 * Does the node_modules on THIS machine match what the manifests ask for?
 *
 * THE FAILURE THIS EXISTS TO NAME
 * `@aksumite/ui` 1.0.5 added `appearance="brand"` to `Button.Solid`, and
 * `comingSoon.tsx` uses it. On a host whose node_modules predates that release,
 * the pre-flight tsc reports:
 *
 *   error TS2322: Type '"brand"' is not assignable to type
 *   '"success" | "danger" | ... | undefined'
 *
 * which reads as a code error and is not one. The code is correct, the lockfile
 * is correct, and the docker build - which runs its own
 * `yarn install --frozen-lockfile` - would have compiled it fine. Only the
 * host's stale install disagreed, and it disagreed in a language (a type error
 * on a union of string literals) that points at the wrong file entirely.
 *
 * WHY A SEPARATE CHECK RATHER THAN A BETTER tsc MESSAGE
 * tsc cannot know. It sees the types it is given. The information that they are
 * the WRONG types lives in package.json and yarn.lock, so the check has to
 * happen before tsc runs, or the first symptom will always be a misleading type
 * error somewhere downstream.
 *
 * `check-lockfile.js` does not cover this: it compares the lockfile against the
 * manifests, both of which are git-tracked and were both correct here. This
 * compares what is ON DISK against them, which is the axis that drifts, because
 * node_modules is the one input to the build that git does not carry.
 *
 * SCOPE
 * First-party scopes only (@aksumite, @mitrabook). Checking every dependency
 * would flag the ordinary hoisting and deduping that yarn does on purpose. The
 * first-party packages are the ones that get published and adopted mid-session,
 * which is exactly when a host falls behind.
 *
 * Exit 0 when everything satisfies its range, 1 otherwise. Report only - it
 * never modifies anything.
 */

const fs = require("fs");
const path = require("path");
const semver = require("semver");

const ROOT = path.resolve(__dirname, "..");
const SCOPES = ["@aksumite/", "@mitrabook/"];

const isFirstParty = (name) => SCOPES.some((s) => name.startsWith(s));

const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

/** Every place a first-party version range is declared, with its source. */
const collectRequirements = () => {
  const out = []; // { name, range, source }

  const root = readJson(path.join(ROOT, "package.json")) || {};
  for (const [name, range] of Object.entries(root.resolutions || {})) {
    if (isFirstParty(name)) out.push({ name, range, source: "resolutions" });
  }

  // Workspace manifests. Read from the workspaces globs rather than a hardcoded
  // list, so a new package cannot silently escape the check.
  const globs = Array.isArray(root.workspaces)
    ? root.workspaces
    : root.workspaces?.packages || [];
  const dirs = new Set();
  for (const g of globs) {
    const base = g.replace(/\/\*+$/, "");
    const full = path.join(ROOT, base);
    if (!fs.existsSync(full)) continue;
    if (g.endsWith("*")) {
      for (const entry of fs.readdirSync(full)) {
        const d = path.join(full, entry);
        if (fs.existsSync(path.join(d, "package.json"))) dirs.add(d);
      }
    } else if (fs.existsSync(path.join(full, "package.json"))) {
      dirs.add(full);
    }
  }

  for (const dir of dirs) {
    const m = readJson(path.join(dir, "package.json"));
    if (!m) continue;
    const deps = { ...m.dependencies, ...m.devDependencies };
    for (const [name, range] of Object.entries(deps)) {
      if (isFirstParty(name)) {
        out.push({ name, range, source: path.relative(ROOT, dir) });
      }
    }
  }

  return out;
};

/** What is actually installed, hoisted at the root of node_modules. */
const installedVersion = (name) => {
  const m = readJson(path.join(ROOT, "node_modules", name, "package.json"));
  return m?.version || null;
};

const main = () => {
  const requirements = collectRequirements();
  if (requirements.length === 0) {
    console.log("No first-party dependencies declared; nothing to check.");
    return 0;
  }

  const missing = [];
  const stale = [];

  for (const { name, range, source } of requirements) {
    const version = installedVersion(name);
    if (!version) {
      // Only a problem if nothing else resolved it either; a package may be
      // nested rather than hoisted. The nested-copy guard in build-release.sh
      // covers that case, so this only reports a total absence.
      if (!fs.existsSync(path.join(ROOT, "node_modules", name))) {
        missing.push({ name, range, source });
      }
      continue;
    }
    // A range yarn cannot parse (a git url, a file: path) is not something this
    // check can judge, so it is skipped rather than guessed at.
    if (!semver.validRange(range)) continue;
    if (!semver.satisfies(version, range)) {
      stale.push({ name, range, source, version });
    }
  }

  if (missing.length === 0 && stale.length === 0) {
    console.log(
      `node_modules matches the manifests (${requirements.length} first-party range(s) checked).`
    );
    return 0;
  }

  console.error("node_modules on this machine is out of date.\n");
  for (const { name, version, range, source } of stale) {
    console.error(
      `  ${name}  installed ${version}  but ${source} asks for ${range}`
    );
  }
  for (const { name, range, source } of missing) {
    console.error(`  ${name}  NOT INSTALLED  but ${source} asks for ${range}`);
  }
  console.error(
    "\n  Run `yarn install` in this checkout, then build again.\n" +
      "  This is not a code error. The type errors it would otherwise cause -\n" +
      "  a prop or variant that 'does not exist' - point at the wrong file."
  );
  return 1;
};

process.exit(main());
