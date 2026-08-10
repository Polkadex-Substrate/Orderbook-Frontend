"use client";

import dynamic from "next/dynamic";
import { defaultConfig } from "@orderbook/core/config";

import { ComingSoon } from "@/components/rewards/comingSoon";

const Template = dynamic(
  () => import("@/components/rewards/template").then((mod) => mod.Template),
  {
    ssr: false,
  }
);

/**
 * The Rewards route is now ALWAYS reachable. What changes with the flag is what
 * renders, not whether the page exists.
 *
 * Previously `enableLmp` hid the nav link and `proxy.ts` redirected /rewards to
 * "/", so the feature was invisible and unlinkable. That is the wrong default
 * for something users should be able to anticipate: a hidden tab cannot be
 * asked about, planned around, or shared.
 *
 * When the programme goes live, set ENABLE_LMP=true and the real leaderboard
 * and claim flow take over with no code change. Note it is a build-time value
 * inlined by next.config.js, so flipping it needs a REBUILD, not a restart.
 */
export default function Page() {
  return defaultConfig.enableLmp ? <Template /> : <ComingSoon />;
}
