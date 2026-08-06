"use client";

/**
 * The trading chart.
 *
 * This file used to be a 759-line component (GraphV1) plus a
 * NEXT_PUBLIC_NATIVE_CHART flag that chose between it and GraphV2. Both are
 * gone, and the flag caused a genuinely expensive confusion while it existed:
 * the deployed server set it to `true` while a developer's env file omitted it
 * entirely, and the check was a strict `=== "true"`, so the two environments
 * silently rendered *different chart components reading from different
 * backends*. Days were spent debugging a data path that production was not
 * even using.
 *
 * There is one chart now. It renders GraphV2's UI - resolution picker, chart
 * types, indicators, depth chart, order and fill markers - against the REST
 * datafeed gateway that GraphV1 used to call. See ./datafeed.ts for the UDF
 * adapter.
 *
 * GraphV1 itself is in git history if any of its behaviour is ever wanted back.
 */

export { GraphV2 as Graph } from "./GraphV2";
