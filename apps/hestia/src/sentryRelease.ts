/**
 * Which build produced this event?
 *
 * THE PROBLEM THIS FIXES
 * Ten events sampled from ORDERBOOK-TESTNET-R carried, between them:
 *
 *   8 x (no release tag at all)
 *   1 x 477e206577b92010aff1b92999c66e4a66010832   (the plugin's raw git SHA)
 *   1 x 3.8.0-production-8e9556b55                 (not our format in any respect)
 *
 * Not one said `0.1.0-<sha>`, which is what the deploy stamp, the RELEASE file,
 * the deploy log and the served page all say.
 *
 * WHY, AND IT IS NOT THE BUILD SCRIPT
 * The build script is correct: it passes `--build-arg NEXT_BUILD_ID=$STAMP`, the
 * Dockerfile declares it and promotes it to an ENV, and next.config.js feeds it
 * to the Sentry plugin's `release.name`. But `release.name` governs the
 * BUILD-TIME step - creating the release and attaching source maps. The RUNTIME
 * SDK gets its release separately, and both instrumentation files declined to
 * set one, on this reasoning:
 *
 *   // Note: don't set `release` here - use the SENTRY_RELEASE env var so the
 *   // value also gets attached to uploaded source maps.
 *
 * That assumed the plugin injects the value into the client bundle. In practice
 * it mostly did not, so events arrived untagged, and the occasional tag that did
 * appear came from ambient sources - the same way `6.108.0` appeared on 14 Aug.
 *
 * THE SAME BUG AS SENTRY_ENVIRONMENT, ONE STEP LATER
 * On 2026-08-10 `SENTRY_ENVIRONMENT` was set in the deploy env, passed as an
 * ARG, and still read as undefined in the browser, because it was missing from
 * next.config.js's `env` block. That block's comment states the rule: anything
 * read as `process.env.X` in client code and absent from it is dead. This is the
 * same failure, and the fix is the same: inline it, then USE it explicitly
 * rather than trusting a tool to inject it.
 *
 * WHY IT MATTERS MORE THAN IT SOUNDS
 * Release tagging is the only mechanism that answers "did the fixed build
 * produce this error". Without it, an error after a deploy is indistinguishable
 * from a stale bundle in someone's tab - which has already caused wrong
 * conclusions about ORDERBOOK-TESTNET-2, and cost an hour on TESTNET-T, where a
 * 40-character SHA was read as evidence of a two-week-old bundle when the real
 * story was that tagging was broken for everyone.
 *
 * Import-free and pure so the precedence is pinned by tests.
 */

/**
 * The release identifier for this build, or undefined when genuinely unknown.
 *
 * PRECEDENCE: NEXT_BUILD_ID wins. It is the identity used by the artifact
 * stamp, the RELEASE file, the deploy log and the served page, so an operator
 * holding a Sentry issue can match it to a deploy without translating between
 * two identifiers by hand. SENTRY_RELEASE remains an explicit override for
 * anyone who needs one, but it loses by default - something in the deploy
 * environment exports a SENTRY_RELEASE that is not this application's version,
 * and on 14 Aug that value won and tagged every event with an identity matching
 * no build we ship.
 *
 * Returns undefined rather than a placeholder like "unknown": an absent release
 * is visibly absent in Sentry's filter, whereas a fake one looks like a real
 * build that nobody can find.
 */
export const resolveRelease = (
  buildId?: string | null,
  sentryRelease?: string | null
): string | undefined => {
  const pick = (v?: string | null): string | undefined => {
    const t = (v ?? "").trim();
    return t.length > 0 ? t : undefined;
  };
  return pick(buildId) ?? pick(sentryRelease);
};

/**
 * Do the two identifiers disagree in a way worth warning about?
 *
 * Only when BOTH are set and differ. A disagreement means events will be tagged
 * with one identity while something else in the pipeline believes another, which
 * is precisely the confusion this module exists to end.
 */
export const releaseDisagrees = (
  buildId?: string | null,
  sentryRelease?: string | null
): boolean => {
  const a = resolveRelease(buildId, null);
  const b = resolveRelease(sentryRelease, null);
  return !!a && !!b && a !== b;
};
