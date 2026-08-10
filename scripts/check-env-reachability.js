#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
//
// Does every environment variable the CODE reads actually reach the bundle?
//
// WHY THIS EXISTS
// Next only exposes two kinds of variable to client code: anything prefixed
// NEXT_PUBLIC_, and whatever is listed in next.config.js's `env:` block.
// A `process.env.FOO` read anywhere else is `undefined` in the browser -
// silently. No build error, no warning, no runtime exception. The code just
// takes its fallback branch forever.
//
// THE FAILURES THIS WOULD HAVE CAUGHT
//   SENTRY_ENVIRONMENT  read by instrumentation-client.ts, never inlined. The
//                       deploy env file said `testnet` and every page reported
//                       `unspecified`. Hours were spent on the env file, the
//                       Docker ARG and the build cache - all of them correct.
//   GA_MEASUREMENT_ID   read by config/index.ts, never inlined, so `gaTrackerKey`
//                       always resolved to a hardcoded fallback id. Analytics
//                       looked configured and fired nothing.
//
// Both look CORRECT from the operations side. `grep` finds the key in the env
// file, the Dockerfile passes it, the build succeeds. Only this list explains
// the behaviour, and nobody thinks to read it.
//
// Exit 0 = every read is reachable, or is a known server-only exception.
// Exit 1 = something is read in code and cannot arrive.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "apps/hestia/next.config.js");

// Variables that are legitimately server-only. They are read in code paths that
// never run in the browser, so they do NOT need inlining - and inlining them
// would be wrong, because the `env:` block is compiled into the client bundle
// and is therefore public.
const SERVER_ONLY = new Set([
  // Next sets this itself inside the server runtime.
  "NEXT_RUNTIME",
  // Read only by the /api/announcements route handler, which is server-side.
  "ANNOUNCEMENTS_FILE",
  // Node's own.
  "NODE_ENV",
]);

// Known-dead reads, tolerated so this check can be wired into the build without
// blocking it on pre-existing rot. Each one resolves to a hardcoded fallback
// and has ZERO consumers, so nothing is broken - but nothing works either, and
// they look like working configuration to anyone reading the env file.
//
// The right fix for both is DELETION, not inlining. Remove the entry from this
// list at the same time.
const KNOWN_DEAD = new Map([
  [
    "GA_MEASUREMENT_ID",
    "gaTrackerKey falls back to a hardcoded G- id and has 0 consumers. " +
      "Analytics looks configured and fires nothing. Delete gaTrackerKey.",
  ],
  [
    "POLKADEX_FEATURE",
    "polkadexFeature has 0 consumers. Delete it.",
  ],
]);

const config = fs.readFileSync(configPath, "utf8");
const envBlock = config.match(/\n {2}env:\s*\{([\s\S]*?)\n {2}\},/);
if (!envBlock) {
  console.error("could not locate the `env:` block in next.config.js");
  process.exit(1);
}
const inlined = new Set(
  [...envBlock[1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1])
);

const out = execSync(
  "grep -rhoE 'process\\.env\\.[A-Z_][A-Z0-9_]*' " +
    "apps/hestia/src packages/core/src packages/format/src || true",
  { cwd: root, encoding: "utf8" }
);
const used = new Set(out.split(/\s+/).filter(Boolean).map((v) => v.split(".").pop()));

const all = [...used]
  .filter(
    (k) => !k.startsWith("NEXT_PUBLIC_") && !inlined.has(k) && !SERVER_ONLY.has(k)
  )
  .sort();

const dead = all.filter((k) => KNOWN_DEAD.has(k));
const unreachable = all.filter((k) => !KNOWN_DEAD.has(k));

if (dead.length > 0) {
  console.log("env reachability: known-dead reads still present (not blocking):");
  for (const k of dead) console.log(`  ${k} - ${KNOWN_DEAD.get(k)}`);
  console.log("");
}

if (unreachable.length === 0) {
  console.log(
    `env reachability: ${used.size} variables read, all reachable ` +
      `(${inlined.size} inlined, ${SERVER_ONLY.size} server-only, ` +
      `${dead.length} known-dead)`
  );
  process.exit(0);
}

console.error("ENV VARIABLES READ IN CODE THAT CANNOT REACH THE BUNDLE:\n");
for (const k of unreachable) {
  const where = execSync(
    `grep -rln 'process\\.env\\.${k}' apps/hestia/src packages/core/src packages/format/src || true`,
    { cwd: root, encoding: "utf8" }
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  console.error(`  ${k}`);
  for (const f of where.slice(0, 3)) console.error(`      ${f}`);
}
console.error(`
These are \`undefined\` in the browser regardless of what the deploy env file
says. The code silently takes its fallback branch.

Fix ONE of:
  1. Add it to the \`env:\` block in apps/hestia/next.config.js
     - but only if the value is safe to publish. That block is compiled into
       the client bundle and is readable by every visitor. Never a credential.
  2. Rename it to NEXT_PUBLIC_<NAME>, which has the same publicity caveat.
  3. If it is genuinely server-only, add it to SERVER_ONLY in this script with
     a comment saying which server-side file reads it.

Do NOT "fix" this by setting the variable in the deploy env file. It is already
set there. That is not the problem.`);
process.exit(1);
