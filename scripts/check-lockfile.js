#!/usr/bin/env node
/**
 * Does yarn.lock satisfy every range the manifests declare?
 *
 * WHY THIS EXISTS
 * The image installs with `--frozen-lockfile`, so a manifest bump without a
 * matching lockfile entry does not resolve the new version - it fails the build
 * minutes in, from inside Docker, with a yarn error that reads like a network
 * problem. The natural reaction is to run `yarn install` right there on the
 * deploy host, which regenerates the lockfile in a checkout that is supposed to
 * be read-only, and then wants a commit from `root@<deploy-host>`.
 *
 * That happened. The remedy is to notice the drift in one second, BEFORE the
 * build, and say plainly where to fix it: on a development machine, committed
 * and pushed, so the deploy host only ever reads.
 *
 * Exit 0 = lockfile agrees with the manifests. Exit 1 = it does not.
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const lockPath = path.join(root, "yarn.lock");

if (!fs.existsSync(lockPath)) {
  console.error("yarn.lock is missing");
  process.exit(1);
}

const lock = fs.readFileSync(lockPath, "utf8");

/** Every `name@range` key the lockfile declares, as a Set. */
const lockKeys = new Set();
for (const block of lock.split("\n\n")) {
  const head = block.trim().split("\n")[0];
  if (!head || !head.endsWith(":")) continue;
  for (const key of head.slice(0, -1).split(",")) {
    lockKeys.add(key.trim().replace(/^"|"$/g, ""));
  }
}

/** Workspace manifests: root plus every apps/* and packages/*. */
const manifests = [path.join(root, "package.json")];
for (const dir of ["apps", "packages"]) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) continue;
  for (const entry of fs.readdirSync(base)) {
    const p = path.join(base, entry, "package.json");
    if (fs.existsSync(p)) manifests.push(p);
  }
}

/** Workspace package names never appear in the lockfile - they are local. */
const workspaceNames = new Set(
  manifests
    .map((m) => {
      try {
        return JSON.parse(fs.readFileSync(m, "utf8")).name;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
);

const missing = [];
for (const manifest of manifests) {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
  } catch (e) {
    console.error(`${path.relative(root, manifest)}: ${e.message}`);
    process.exit(1);
  }

  for (const field of ["dependencies", "devDependencies"]) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      if (workspaceNames.has(name)) continue;
      // `workspace:` and `file:`/`link:` protocols are not lockfile entries.
      if (/^(workspace|file|link|portal):/.test(range)) continue;
      if (!lockKeys.has(`${name}@${range}`)) {
        missing.push({
          where: path.relative(root, manifest),
          name,
          range,
          field,
        });
      }
    }
  }
}

if (missing.length === 0) {
  console.log("lockfile: in sync with every manifest");
  process.exit(0);
}

console.error("LOCKFILE OUT OF SYNC WITH package.json:");
for (const m of missing) {
  console.error(`  ${m.name}@${m.range}   declared in ${m.where} (${m.field})`);
}
console.error(`
The image installs with --frozen-lockfile, so these ranges would NOT resolve -
the build fails inside Docker with an error that reads like a network problem.

Fix it on a DEVELOPMENT machine, not here:

  yarn install
  git add yarn.lock && git commit -m "lockfile: <what changed>" && git push

Then pull on the deploy host. Running \`yarn install\` on the deploy host
regenerates the lockfile in a checkout that should only ever be read, and
produces a commit authored by root@<host>.`);
process.exit(1);
