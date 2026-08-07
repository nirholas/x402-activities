# x402-activities

Pay-per-query tours & activities search for AI agents. Give it a coordinate, pay $0.003 in USDC via the x402 protocol, and get back a JSON list of bookable experiences nearby — names, descriptions, prices, ratings, durations, and booking links. Backed by the Amadeus Tours & Activities API when credentials are configured; otherwise returns clearly-labeled deterministic fixtures so the endpoint always works. No account, no API key, no subscription — each request pays for itself.

**Base URL**: `https://YOUR-DEPLOYMENT.example.com` (replace with the deployment you were given; local default `http://localhost:4021`)

**Machine-readable manifest**: `GET /.well-known/x402` (free)

## Endpoints

### GET /search — $0.003

Search tours & activities around a point.

Query parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | number | yes | Latitude, -90..90 |
| `lon` | number | yes | Longitude, -180..180 |
| `radius` | number | no | Search radius in km (default 1, max 20) |

Response `200` (`application/json`):

```json
{
  "source": "amadeus",
  "query": { "latitude": 41.3851, "longitude": 2.1734, "radiusKm": 2 },
  "count": 2,
  "activities": [
    {
      "id": "23642",
      "name": "Sagrada Familia guided tour",
      "shortDescription": "Skip-the-line guided visit with a licensed guide.",
      "latitude": 41.4036,
      "longitude": 2.1744,
      "price": { "amount": "54.00", "currencyCode": "EUR" },
      "rating": 4.6,
      "pictures": ["https://..."],
      "bookingLink": "https://...",
      "minimumDuration": "PT1H30M"
    }
  ],
  "retrievedAt": "2026-01-01T12:00:00.000Z"
}
```

`source` is `"amadeus"` for live data or `"fixture"` for deterministic sample data (server has no Amadeus credentials).

### GET / — free

Service metadata: routes, prices, payment details, backend mode.

### GET /health — free

`{ "status": "ok" }` liveness probe.

## Payment

- **Protocol**: [x402](https://x402.org) (HTTP 402 Payment Required)
- **Network**: `base-sepolia` (testnet default; deployments may use `base` mainnet)
- **Asset**: USDC
- **Facilitator**: `https://x402.org/facilitator`
- **How to pay**: call a paid route; on `402` the response body contains `accepts` payment requirements. Sign an EIP-3009 USDC authorization for the listed `payTo`/amount and retry with the `X-PAYMENT` header. Any x402 client works — e.g. `x402-fetch`:

```ts
import { wrapFetchWithPayment, createSigner } from "x402-fetch";
const signer = await createSigner("base-sepolia", process.env.PRIVATE_KEY!);
const payFetch = wrapFetchWithPayment(fetch, signer);
const res = await payFetch("http://localhost:4021/search?lat=41.3851&lon=2.1734&radius=2");
const activities = await res.json(); // the purchased artifact, in-response
```

The settlement receipt is returned in the `X-PAYMENT-RESPONSE` response header.

## Error codes

| Status | Body `error` | Meaning |
|--------|--------------|---------|
| 400 | `invalid_lat` / `invalid_lon` / `invalid_radius` | Bad query parameter |
| 402 | — | Payment required; body lists `accepts` payment requirements |
| 502 | `upstream_error` | Amadeus upstream failed; retry later |

## Discovery

- This file (`skill.md`) at the repo root is the agent-facing skill description.
- `GET /.well-known/x402` returns the indexable JSON manifest (x402scan.com, x402 Bazaar, agentic.market compatible).
