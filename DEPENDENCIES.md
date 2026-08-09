# Dependency notes

Why the audit output and the install warnings look the way they do. Read this
before re-litigating a red badge.

Last triaged: 2026-08-09, against GitHub Dependabot alerts on `release`
(the default branch). Previous pass: 2026-08-07, against `yarn audit`.

## The advisory count is paths, not problems

`yarn audit` reports one row per dependency path. `elliptic` alone produces
five rows through five different WalletConnect nesting routes. On 2026-08-07 the
raw count went 15 -> 18 while the number of distinct problems went **12 -> 5**,
because fixing five advisories removed the paths that were masking duplicates.

Count distinct advisories, not rows:

```
yarn audit --json | python3 -c "import sys,json;print(len({(json.loads(l)['data']['advisory']['module_name'], json.loads(l)['data']['advisory']['title']) for l in sys.stdin if l.strip() and json.loads(l).get('type')=='auditAdvisory'}))"
```

**Dependabot inflates differently: one alert per MANIFEST, not per path.** On
2026-08-09 it showed 8 open alerts for 6 distinct problems. `sharp` appeared
twice under the *same* advisory id, GHSA-f88m-g3jw-g9cj, once for `yarn.lock`
and once for `apps/hestia/package.json`.

The rule that falls out of it: a package gets two alerts exactly when we
**declare it ourselves**, because it then appears in both a manifest and the
lockfile. Every other alert in the list is transitive and appears once. So
`sharp` is doubled and `glob`, `elliptic`, `@stablelib/ed25519`,
`@opentelemetry/core` and the MetaMask pair are not. It also means clearing
`sharp` needs BOTH files changed, and both alerts then close together.

Read the list without a browser (the Security tab needs a repo-admin session):

```
scripts/check-advisories.sh
```

That wraps the `gh` calls, prints alerts sorted by severity with their manifest
paths, and reports the distinct-advisory count next to the raw one. It is wired
into `build-release.sh` as a **report-only** step and can never fail a build:
`gh` needs a token, the deploy host deliberately has none, and a build step that
requires a credential the build host must not hold either breaks the deploy or
pressures someone into putting a token on it. Absent gh, unauthenticated gh, no
network and a 403 all skip with a reason and exit 0.

`--strict` exits 1 when a high/critical advisory has a published fix. Nothing
calls it that way automatically; it is for a human or a CI job that is allowed
to hold a token. `--json` gives the raw response.

## Fixed 2026-08-07

Five advisories were held open by a stale lockfile rather than by stuck
dependencies - the ranges already admitted the patched versions. The resolution
**floors** were raised to the patched minimums so a future install cannot drift
back down:

| package         | was    | now     | why                                          |
| --------------- | ------ | ------- | -------------------------------------------- |
| brace-expansion | 2.1.2  | ^2.1.4  | 2 high: DoS via unbounded expansion          |
| fast-uri        | 3.1.4  | ^3.1.5  | high: host confusion via backslash authority |
| js-yaml         | 4.3.0  | ^4.3.1  | high: quadratic CPU on `!!omap`              |
| nanoid          | 3.3.16 | ^3.3.17 | high: infinite loop when size is 0           |
| postcss         | 8.5.22 | ^8.5.23 | moderate                                     |

All caret-ranged. **Never use unbounded `>=` or `latest` in `resolutions`** -
that is what produced this repo's version drift previously.

## Added 2026-08-09

| resolution                          | why                                                     |
| ----------------------------------- | ------------------------------------------------------- |
| `debug: ^4.4.3`                     | floor under the MetaMask advisory's actual vector        |
| `@next/eslint-plugin-next/glob: ^10.5.0` | clears the glob CLI advisory without touching v7 users |

`debug` is a **floor, not a fix**. The MetaMask alerts are dismissible on the
grounds that the vulnerable code is not used, because the advisory names
`debug@4.4.2` and this tree resolves 4.4.3. But nothing was stopping a future
install from drifting onto 4.4.2 and making that dismissal quietly false, with
the alert already silenced. The floor makes the claim something the repo
enforces rather than something that happened to be true on the day.

**`scripts/check-lockfile.js` now checks `resolutions` too.** It did not before:
it read only `dependencies` and `devDependencies`, so a resolution added without
regenerating the lockfile went straight past it and into the docker build - the
exact failure that file exists to prevent, through the one door it left open.
Note that a nested key does not name the package yarn looks up
(`@next/eslint-plugin-next/glob` resolves `glob`), and the check reports both.

## Open, with reasons

**sharp** (high, libvips CVEs, patched >= 0.35.0). `apps/hestia` declared
`^0.33.2` while next declares `^0.34.3`; for 0.x those ranges do not overlap, so
yarn installed BOTH - 0.33.5 hoisted from our declaration and 0.34.5 nested
under next. Nothing in our code imports sharp; it exists only for `next/image`.
Aligned to `^0.34.3` to dedupe to the copy next actually uses. Clearing the
advisory needs 0.35.0, which is outside next's declared range - forcing it via a
resolution overrides next and **requires a runtime verification**, because the app
uses `next/image` in 7 places and does not set `images.unoptimized`.

`next build` cannot be that verification. Image optimisation runs at REQUEST
time in `next/dist/server/image-optimizer.js`, behind `/_next/image`, so a green
build would prove nothing and the app would ship broken images. Use
`scripts/verify-sharp-bump.sh`, which forces the version, installs, builds,
starts the server and fetches a real optimised image in both webp and avif.

Encouraging signs, gathered 2026-08-07: next calls only `sharp.concurrency`,
`.resize`, `.timeout`, `.avif`, `.webp`, `.png`, `.jpeg` and `.toBuffer` - all
long-stable - and sharp 0.35.0 requires node >=20.9.0 against this repo's floor
of 22. Run the script on the machine that builds the app: sharp ships prebuilt
per-platform binaries, so a macOS `node_modules` read from a Linux container
fails with a platform error that says nothing about the version.

**@metamask/sdk** and **@metamask/sdk-communication-layer** (moderate, patched
>= 0.33.1, two alerts, one problem). The advisory is about a malicious
`debug@4.4.2` in the SDK's supply chain. Both packages are at 0.27.0 and both
ask for `debug@^4.3.4`; this lockfile resolves that range to **4.4.3**, so the
vector is absent. Bumping means moving `wagmi`/`@wagmi/connectors` - wallet
connection on an exchange, the riskiest change available for the least benefit.
Verify `debug` before acting:
`node -p "require('./node_modules/debug/package.json').version"`.

**glob** (high, patched >= 10.5.0). New on 2026-08-09. CLI command injection:
`glob -c/--cmd` runs its matches with `shell:true`, so a crafted filename
executes. **Not reachable here**, on three counts: it arrives only from
`@next/eslint-plugin-next@14.2.35`, which pins `glob` at exactly `10.3.10`;
that plugin is a devDependency of `packages/core`, so it runs at lint time and
never enters a bundle or the server; and the plugin uses glob as a library,
while nothing in this repo invokes the glob CLI in any script.

Applied 2026-08-09 as a scoped resolution (see below). **Pending `yarn install`**
- the lockfile does not yet carry it, and `scripts/check-lockfile.js` fails
until it does.

**Do not add a blanket `glob` resolution.** It would be worse than the alert.
Three other consumers need v7, whose callback API is nothing like v10's
promise/class API:

| consumer                                                | range    |
| ------------------------------------------------------- | -------- |
| `@jest/reporters`, `jest-config`, `jest-runtime`, `test-exclude` | `^7.1.3` / `^7.1.4` |
| `rimraf@3.0.2`                                          | `^7.1.3` |
| `workbox-build@7.1.0` and `7.1.1`                       | `^7.1.6` |

Forcing those to 10.x breaks the test suite and the PWA service worker build.
The scoped form is the only safe one, and it overrides an exact pin, so it must
be proved by an install plus a lint run - not by reading the lockfile:

```
"resolutions": { "@next/eslint-plugin-next/glob": "^10.5.0" }
```

**@opentelemetry/core** (moderate, patched >= 2.8.0). Needs a 1.x -> 2.x jump
that `@sentry/nextjs` pins. Cannot be forced without breaking Sentry, which is
lazily loaded behind a DSN check anyway (`instrumentation-client.ts`).

**elliptic** and **@stablelib/ed25519**. Both advisories list the patched range
as `<0.0.0`: **no upstream fix exists**. Both arrive via `@walletconnect/utils`.
Nothing to do but track WalletConnect.

## The graphql-request install warning is expected

Every install prints:

```
warning Resolution field "graphql-request@5.1.0" is incompatible with
requested version "graphql-request@^7.1.2"
```

`@aksumite/subscan` pins `5.1.0` exactly, `@hyperbridge/sdk` asks for `^7.1.2`,
and the root resolution gives everyone `5.1.0`. So the bridge SDK runs two
majors below what it declares.

**Investigated 2026-08-07: benign.** The SDK's entire usage of the library is
`new GraphQLClient(url)` plus positional `.request(document, variables)` - 11
call sites, all positional - and that surface is unchanged from v5 to v7. (The
three object-form `.request({ method: ... })` calls in the SDK are EIP-1193
provider calls, not graphql.)

The resolution is kept deliberately: dropping it would add a second copy of
graphql-request to the browser bundle to satisfy a declaration whose extra API
nobody uses.

This is guarded, not just documented:
`apps/hestia/src/lib/hyperbridge/graphqlClientCompat.test.ts` stubs fetch and
asserts the exact call shapes the SDK depends on.

A planted-failure check while writing it disproved an assumption worth recording:
5.1.0 also accepts the v6+ object form `request({ document, variables })` - the
parameter is named `documentOrOptions`. So the margin is wider than the version
numbers imply, and an SDK refactor to the object form would not break us either.
The suite asserts BOTH forms plus the return shape, so what it actually catches
is a future resolution landing on a version that drops one of them.
