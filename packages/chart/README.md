# @orderbook/chart

Orderbook-native trading chart. Candles + volume from the exchange's **own**
kline feed (no external datafeed gateway, no secrets), with:

- resolutions 1m…1W, candle/bar/area chart types
- EMA(20/50) & session-VWAP overlays, RSI(14) pane (time-synced)
- **your open orders as price lines and your fills as markers** on the chart
- cumulative depth chart (canvas, price-axis)
- infinite history (older candles load as you scroll left)

Rendering: [lightweight-charts v4] (peer dep). React 18+.

## Integration surface

Implement one small interface and pass data as props:

```ts
import { CandleChart, CandleFeed } from "@orderbook/chart";

const feed: CandleFeed = {
  getCandles: ({ market, resolution, from, to }) =>
    fetchCandles({ market, resolution, from, to }),        // @orderbook/core
  subscribe: ({ market, resolution, onBar }) => {
    onCandleSubscribe({ market, interval: resolution,
      onUpdateTradingViewRealTime: onBar });               // @orderbook/core
    return () => undefined;
  },
};
```

`Candle.time` is in **milliseconds** (matches @orderbook/core); the components
convert to lightweight-charts' seconds internally.

## Usage in this monorepo (hestia)

Already wired: `apps/hestia/.../Graph/GraphV2.tsx`, enabled by
`NEXT_PUBLIC_NATIVE_CHART=true`. `next.config.js` transpiles the package
(`transpilePackages: ["@orderbook/core", "@orderbook/chart"]`).

## Usage in dexifi-orderbook (vendoring)

Same pattern as core/format: copy `packages/chart/src` → `dexifi-orderbook/src/chart`
and add a Vite alias `{ find: "@orderbook/chart", replacement: path.resolve(__dirname, "src/chart") }`.
lightweight-charts is already a dexifi dependency. Build the feed adapter from
the vendored core's `fetchCandles`/subscription exactly as in GraphV2.

## Notes / limits (v1)

- core's kline subscription exposes no teardown; the chart guards against
  stale ticks itself. Add an unsubscribe to core later for cleanliness.
- VWAP is cumulative over the loaded window (not session-anchored).
- RSI pane is a second, time-synced chart instance (lightweight-charts v4 has
  no native panes). Don't upgrade the peer to v5 without migrating series API.
