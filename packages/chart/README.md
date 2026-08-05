# @orderbook/chart

Trading chart: candles + volume, with

- candle/bar/area chart types; resolutions come from the feed (see below)
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
    fetchUdfHistory({ market, resolution, from, to }),   // UDF REST gateway
  subscribe: ({ market, resolution, onBar }) => {
    // REST-only feed: poll, and return a real teardown.
    const id = setInterval(/* refetch trailing bars, call onBar */, 15_000);
    return () => clearInterval(id);
  },
};
```

`Candle.time` is in **milliseconds** (matches @orderbook/core); the components
convert to lightweight-charts' seconds internally.

## Usage in this monorepo (hestia)

Wired in `apps/hestia/src/components/trading/Graph/` - `GraphV2.tsx` builds the
feed, `datafeed.ts` is the UDF adapter. `next.config.js` transpiles the package
(`transpilePackages: ["@orderbook/core", "@orderbook/chart"]`).

There is no chart switch any more. `NEXT_PUBLIC_NATIVE_CHART` chose between two
chart components reading from two different backends; the server set it and a
developer env omitted it, so the two environments silently rendered different
charts against different data. Both the flag and the second component (GraphV1)
are gone.

**Candles come from the REST datafeed gateway, not the exchange's klines.**
`NEXT_PUBLIC_SERVER_BASE_URL` and `NEXT_PUBLIC_GATEWAY_SECRET` are required. The
gateway speaks UDF (TradingView's Universal Data Feed): parallel arrays plus an
`s` status, where `s: "no_data"` is a SUCCESS reply meaning "this pair has not
traded", and `t` is in SECONDS while `CandleFeed` is specified in milliseconds.

**Only four resolutions are served**: `1`, `5`, `60`, `1D` (the gateway also
accepts `1d`/`D`/`d` as daily aliases). The chart's Resolution type also defines
`15`, `30`, `240` and `1W`; those are NOT available, and the Toolbar is given the
supported subset via its `resolutions` prop so it does not render buttons that
always error. Unsupported intervals are deliberately not mapped to a nearest
neighbour - serving 5m candles to someone who asked for 15m makes the chart
silently wrong rather than visibly limited.

`market` must be a TICKER pair (`Market.name`, e.g. `"WETH/USDT"`), never
`Market.id` - that is `"{baseAssetId}-{quoteAssetId}"` like `"8-6"`, and the
gateway answers asset ids with 404 "asset not found".

## Usage in dexifi-orderbook (vendoring)

Same pattern as core/format: copy `packages/chart/src` → `dexifi-orderbook/src/chart`
and add a Vite alias `{ find: "@orderbook/chart", replacement: path.resolve(__dirname, "src/chart") }`.
lightweight-charts is already a dexifi dependency. Copy `datafeed.ts` alongside
and build the feed adapter from it, as `GraphV2.tsx` does.

## Notes / limits (v1)

- live bars POLL the REST gateway (it has no streaming endpoint). The adapter
  caps the interval at 15s, skips a tick while one is in flight, and bounds each
  request at 20s - the gateway has been observed taking 45s, and without those
  guards requests stack up precisely when it is already struggling.
- the chart also guards against stale ticks itself, matching bars on `time`.
- VWAP is cumulative over the loaded window (not session-anchored).
- RSI pane is a second, time-synced chart instance (lightweight-charts v4 has
  no native panes). Don't upgrade the peer to v5 without migrating series API.
