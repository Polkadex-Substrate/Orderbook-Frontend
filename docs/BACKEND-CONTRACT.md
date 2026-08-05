# Backend contract - what the frontend expects

For whoever owns the Orderbook GraphQL backend, the datafeed gateway and the
chain. Everything here is what the frontend actually does today, with the
reasoning behind each expectation, so you can tell a frontend bug from a backend
one without reading the frontend.

Last verified: 2026-07-31.

---

## 1. Datafeed gateway (chart candles)

`NEXT_PUBLIC_SERVER_BASE_URL` - currently `https://datafeed.polkadex.ee`.

The chart calls this **directly from the browser**. There is no server-side proxy
in front of it. That matters for two things below (CORS and client IPs).

### Request

```
GET /gateway/history
  ?symbol=<baseTicker>&vs_currency=<quoteTicker>
  &resolution=<1|5|60|1D>&from=<epochSeconds>&to=<epochSeconds>
Header: X-Gateway-Secret: <NEXT_PUBLIC_GATEWAY_SECRET>
```

**Symbols are tickers, not asset ids.** `symbol=WETH&vs_currency=USDT`. A
previous frontend bug sent `symbol=8&vs_currency=6` (Polkadex asset ids) and the
gateway correctly returned 404 "asset not found". Fixed on our side.

**Supported resolutions are `1`, `5`, `60`, `1D`** - taken from the gateway's own
rejection message (`Must be one of: 1, 5, 60, 1D, 1d, D, d`). The chart's own
type also defines `15`, `30`, `240` and `1W`; the toolbar hides them, so users
have lost 15m, 30m, 4h and weekly.

> **Request:** can the gateway aggregate those four missing intervals? If 1m
> candles are already stored, 15m/30m/4h are rollups and `1W` follows from `1D`.
> For a trading UI 15m and 4h are conventional and their absence gets noticed.

### Response - UDF

```json
{ "s": "ok", "t": [1785369600], "o": [2370.8], "h": [...], "l": [...],
  "c": [...], "v": [...] }
```

Two properties the frontend depends on:

- **`s: "no_data"` is a success reply**, meaning "this pair has not traded in
  this window". It maps to an empty chart, not an error. Please keep it distinct
  from a genuine failure.
- **`t` is in seconds.** The frontend multiplies by 1000.

> **Open question:** for an **unknown** symbol, does the gateway return 404 or
> `200 + s:"no_data"`? If the latter, "never traded" and "does not exist" are
> indistinguishable in the response, and a typo'd symbol shows as a legitimately
> empty chart. A 404 is preferable.

### Two things worth fixing gateway-side

**1. CORS preflight on every request.** Every `GET` is preceded by an `OPTIONS`.
That is unavoidable client-side - `X-Gateway-Secret` is a custom header, which
makes the request non-simple - but the gateway answers `204` without an
`Access-Control-Max-Age`, so the browser re-preflights every single time. Adding
`Access-Control-Max-Age: 86400` roughly halves the request count for free.

**2. Client IPs collapse to one address.** The gateway logs
`remoteAddress: "172.18.0.1"` - a Docker bridge gateway - for every request. So
the rate limiter counts **all global traffic as one client** and trips
constantly. This is what looked like "the orderbook's IP is blocked": from the
gateway's point of view there is only ever one IP.

The frontend cannot help here. A browser **cannot** send `X-Forwarded-For` (it is
a forbidden header name; `fetch` strips it) and does not know its own public IP.
The real client address is already the TCP source address of the browser's
connection; it is the gateway's own reverse proxy that is dropping it.

```
# reverse proxy
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```
```js
// Fastify
Fastify({ trustProxy: true })   // otherwise request.ip stays 172.18.0.1
```

Then key the rate limiter on `request.ip` (or `CF-Connecting-IP` behind
Cloudflare). Confirm it works by checking that `remoteAddress` **varies** between
visitors in different countries.

### Latency

One request was logged at **45.3s** (`responseTime: 45336`). The frontend now
bounds every request at 20s and skips a poll while one is in flight, so a slow
gateway degrades instead of stacking requests - but 45s is worth explaining.

---

## 2. Orderbook GraphQL backend

`GRAPHQL_URL` - HTTP, currently `https://orderbook-api-test.polkadex.ee`
`GRAPHQL_WS_URL` - subscriptions, `wss://orderbook-api-test.polkadex.ee/ws`

**AWS AppSync is gone.** The frontend previously spoke AppSync's protocol behind
a `USE_NEW_BACKEND` flag; both the flag and the Amplify SDK have been removed.
Everything now goes through Apollo: queries and mutations over HTTP, and
subscriptions over `graphql-ws`.

Consequences for you:

- `/realtime` is no longer requested. If you see it in logs, that is an old
  cached bundle.
- **No trailing slash on `GRAPHQL_URL`.** Amplify used to append its subscription
  path, and a trailing slash produced `wss://host//realtime`, which failed to
  route while HTTP queries kept working - so subscriptions died and it looked
  like an outage. Stripped defensively now, but keep the value clean.
- Auth is `Authorization: <token>`, defaulting to the literal string
  `READ_ONLY` when `READ_ONLY_TOKEN` is unset. That is what the deployment has
  been sending all along.

### Outstanding: `time_bucket`

Chart history no longer depends on this, since candles come from the datafeed.
But the error is still live for any caller of `getKlinesByMarketInterval`:

```
function time_bucket(text, timestamp with time zone) does not exist
```

`time_bucket` is TimescaleDB's, and its real signature is
`time_bucket(interval, timestamptz)`. The call is passing the interval as a
string without a cast - `time_bucket($1::interval, ts)` - or the extension is not
installed on that database.

---

## 3. Chain expectations

**All bridged assets must carry `assets.metadata` with correct decimals.** The
frontend reads decimals from chain metadata per asset, not from config, so a
`forceSetMetadata` is picked up without a rebuild. This was added after the nine
testnet assets were normalised to 12dp while frontend config still described
their ERC-20 values (18 for WETH, 6 for USDC), which made balances wrong by 10⁶
in **both** directions.

Two consequences:

- An asset registered **without** metadata reports a 0 balance and refuses
  withdrawals. Deliberate: refusing to build a transfer beats guessing a scale.
- **Mainnet needs the same normalisation**, or the same class of bug returns.

**Market ids and names are distinct.** `Market.id` is
`"{baseAssetId}-{quoteAssetId}"`; `Market.name` is `"{baseTicker}/{quoteTicker}"`.
Both are used, for different things.

**Snapshot nonce resets are safe.** `seqNum` is carried on orderbook updates but
never compared, so resetting to 0 does not wedge the book.

---

## 4. Where to look when something breaks

| Symptom | Likely owner | First check |
|---|---|---|
| Chart empty or errors | datafeed | Console `[chart] getCandles failed…` prints the full URL and response body |
| No live orderbook/candle updates | GraphQL WS | `GRAPHQL_WS_URL` set, and `[GraphQL WS] Connected` in console |
| Balances wrong by a power of 10 | chain | `assets.metadata` decimals for that asset |
| Rate-limit blocks | datafeed | Does `remoteAddress` vary per visitor? |
| Browser-side errors generally | frontend | Sentry (project `4511826620055552`) |

Server logs: `journalctl -u orderbook-fe -f` is the Next server (route handlers
and `console.error`). Anything happening in the trading UI is in the visitor's
browser and reaches Sentry, not that journal.
