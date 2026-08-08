# Dependency notes

Why the audit output and the install warnings look the way they do. Read this
before re-litigating a red badge.

Last triaged: 2026-08-07, against `yarn audit` on `release`.

## The advisory count is paths, not problems

`yarn audit` reports one row per dependency path. `elliptic` alone produces
five rows through five different WalletConnect nesting routes. On 2026-08-07 the
raw count went 15 -> 18 while the number of distinct problems went **12 -> 5**,
because fixing five advisories removed the paths that were masking duplicates.

Count distinct advisories, not rows:

```
yarn audit --json | python3 -c "import sys,json;print(len({(json.loads(l)['data']['advisory']['module_name'], json.loads(l)['data']['advisory']['title']) for l in sys.stdin if l.strip() and json.loads(l).get('type')=='auditAdvisory'}))"
```

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

## Open, with reasons

**sharp** (high, libvips CVEs, patched >= 0.35.0). `apps/hestia` declared
`^0.33.2` while next declares `^0.34.3`; for 0.x those ranges do not overlap, so
yarn installed BOTH - 0.33.5 hoisted from our declaration and 0.34.5 nested
under next. Nothing in our code imports sharp; it exists only for `next/image`.
Aligned to `^0.34.3` to dedupe to the copy next actually uses. Clearing the
advisory needs 0.35.0, which is outside next's declared range - forcing it via a
resolution overrides next and **requires a build verification**, because the app
uses `next/image` in 7 places and does not set `images.unoptimized`.

**@metamask/sdk** (moderate, patched >= 0.33.1). The advisory is about a
malicious `debug@4.4.2` in the SDK's supply chain. This lockfile resolves `debug`
to **4.4.3**, so the vector is absent. Bumping means moving
`wagmi`/`@wagmi/connectors` - wallet connection on an exchange, the riskiest
change available for the least benefit. Verify `debug` before acting:
`node -p "require('./node_modules/debug/package.json').version"`.

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
