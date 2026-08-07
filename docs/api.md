# API reference — x402-activities

Base URL: `http://localhost:4021` in development.
Machine-readable: [`openapi.json`](https://github.com/nirholas/x402-activities/blob/main/openapi.json) (OpenAPI 3.1).

All paid routes return the purchased artifact in the **200 response body**.

## Payment

Every paid route answers an unpaid request with **402** and an `accepts` array
holding both rails:

| Rail | Network | Asset | payTo |
|------|---------|-------|-------|
| EVM | `base-sepolia` (`base` on mainnet) | USDC | `0x40252CFDF8B20Ed757D61ff157719F33Ec332402` |
| Solana | `solana` (`solana-devnet` on devnet) | USDC | `WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW` |

Prices are quoted in USDC base units (6 decimals) as `maxAmountRequired`.
On success the response carries `X-PAYMENT-RESPONSE`: base64 JSON with
`{ success, rail, network, transaction, payer, amount, asset }`.

---

## `GET /search`

**$0.003** — Search bookable tours and activities around a coordinate

### Parameters

| Param | In | Required | Type | Description |
|-------|----|----------|------|-------------|
| `lat` | query | yes | number | Latitude, -90…90. |
| `lon` | query | yes | number | Longitude, -180…180. |
| `radius` | query | no | number | Search radius in kilometres, 0…20. Default 1. |

### Example request

```bash
curl -s "http://localhost:4021/search?lat=41.3851&lon=2.1734&radius=2" -H "X-PAYMENT: <base64 payload>"
```

### Response `200 application/json`

`source` is `"amadeus"` for live inventory or `"fixture"` for the deterministic demo data. `count` equals `activities.length`.

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

### Errors

| HTTP | `error` | When |
|------|---------|------|
| 400 | `invalid_lat` | `lat` missing or outside -90…90. |
| 400 | `invalid_lon` | `lon` missing or outside -180…180. |
| 400 | `invalid_radius` | `radius` outside 0…20 km. |
| 402 | — | No or invalid `X-PAYMENT`. Body carries `accepts` with both rails. |
| 502 | `upstream_error` | The upstream data source failed or timed out. |


---

## Free routes

### `GET /`

Service metadata: description, live prices, active payment rails, data-source
status, and docs links.

### `GET /health`

```json
{ "status": "ok", "uptime": 12.5 }
```

### `GET /.well-known/x402`

The discovery manifest — every resource with its price, output schema, and both
accepted rails. See [agents.md](agents.md).
