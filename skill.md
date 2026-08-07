# x402-activities — agent skill

Find bookable tours, activities, and experiences near a coordinate. You send a
latitude/longitude and a radius; you get back a list of real, bookable
activities with prices, ratings, durations, and booking links. Backed by the
Amadeus Tours & Activities API when credentials are configured, and by
deterministic fixtures otherwise (always labelled in the `source` field).

**Base URL:** `{BASE_URL}` (local default `http://localhost:4021`)

Every paid call returns the purchased artifact **in the 200 response body**.
There is nothing to poll and nothing to collect later.

## Payment

This service speaks **x402** (HTTP 402 Payment Required, <https://x402.org>).

**Pay in USDC on Base or Solana — your client picks the rail.**

| Rail | Network | Asset | payTo |
|------|---------|-------|-------|
| EVM | `base-sepolia` (`base` on mainnet) | USDC | `0x40252CFDF8B20Ed757D61ff157719F33Ec332402` |
| Solana | `solana` (`solana-devnet` on devnet) | USDC | `WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW` |

Facilitator: `https://x402.org/facilitator` (verifies and settles both rails).

Flow:

1. Call the endpoint with no `X-PAYMENT` header. You get **402** with an
   `accepts` array holding **both** rails.
2. Pick a rail, sign the payment, and put the base64 payload in `X-PAYMENT`.
3. Repeat the request. You get **200** with the artifact, and a settlement
   receipt in the `X-PAYMENT-RESPONSE` header (base64 JSON:
   `{ success, rail, network, transaction, payer, amount, asset }`).

Use `x402-fetch` (EVM), a Solana x402 client, or any x402-aware HTTP client —
the wire format is the standard one.

```ts
import { wrapFetchWithPayment, createSigner } from "x402-fetch";
const signer = await createSigner("base-sepolia", process.env.PRIVATE_KEY!);
const pay = wrapFetchWithPayment(fetch, signer);
const res = await pay("{BASE_URL}/search?lat=41.3851&lon=2.1734&radius=2");
const artifact = await res.json();
```

## Endpoints

### `GET /search` — $0.003

Search bookable tours and activities around a coordinate

| Param | In | Required | Type | Description |
|-------|----|----------|------|-------------|
| `lat` | query | yes | number | Latitude, -90…90. |
| `lon` | query | yes | number | Longitude, -180…180. |
| `radius` | query | no | number | Search radius in kilometres, 0…20. Default 1. |

**Returns** (`200 application/json`) — Activities near the coordinate: name, description, geo, price, rating, booking link, duration

```json
{
  "source": "fixture",
  "query": {
    "latitude": 41.3851,
    "longitude": 2.1734,
    "radiusKm": 2
  },
  "count": 5,
  "activities": [
    {
      "id": "FIX-1HQ4KZ-1",
      "name": "Food tasting near 41.39, 2.17 #1",
      "shortDescription": "Progressive tasting across five family-run spots: street food, market stalls, and a hidden wine bar.",
      "latitude": 41.386204,
      "longitude": 2.17198,
      "price": {
        "amount": "55.00",
        "currencyCode": "EUR"
      },
      "rating": 4.6,
      "pictures": [],
      "bookingLink": "https://example.com/book/FIX-1HQ4KZ-1",
      "minimumDuration": "PT3H"
    },
    {
      "id": "FIX-1HQ4KZ-2",
      "name": "Sunset cruise near 41.39, 2.17 #2",
      "shortDescription": "Golden-hour boat cruise with onboard commentary and a welcome drink.",
      "latitude": 41.383911,
      "longitude": 2.176042,
      "price": {
        "amount": "40.00",
        "currencyCode": "EUR"
      },
      "rating": 4.2,
      "pictures": [],
      "bookingLink": "https://example.com/book/FIX-1HQ4KZ-2",
      "minimumDuration": "PT2H"
    }
  ],
  "retrievedAt": "2026-08-07T02:14:33.512Z"
}
```


## Free endpoints

- `GET /` — Service metadata, live prices, active payment rails, backend status
- `GET /health` — Liveness probe
- `GET /.well-known/x402` — Machine-readable discovery manifest

## Error codes

| HTTP | `error` | Meaning |
|------|---------|---------|
| 400 | `invalid_lat` | `lat` missing or outside -90…90. |
| 400 | `invalid_lon` | `lon` missing or outside -180…180. |
| 400 | `invalid_radius` | `radius` outside 0…20 km. |
| 502 | `upstream_error` | Amadeus rejected the request or timed out. |
| 402 | — | Payment required or rejected. Body carries `accepts` (both rails) and an `error` reason. |
| 500 | `no_payment_rail_configured` | Server has neither a valid EVM nor Solana payTo. |

## Data source

Live [Amadeus Tours & Activities](https://developers.amadeus.com) data when
`AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` are set (`source: "amadeus"`).
Without them the service returns deterministic fixtures (`source: "fixture"`) —
the same query always yields the same activities, so the demo runs with no paid
credentials. Always check the `source` field before treating results as real
inventory.

## Discovery

Machine-readable manifest: **`GET /.well-known/x402`**
(also at <https://github.com/nirholas/x402-activities/blob/main/public/.well-known/x402>).
Indexed by [x402scan.com](https://x402scan.com), the x402 Bazaar, and
[agentic.market](https://agentic.market).

OpenAPI 3.1: [`openapi.json`](https://github.com/nirholas/x402-activities/blob/main/openapi.json)

## Contact

nichxbt@gmail.com · <https://github.com/nirholas/x402-activities>
