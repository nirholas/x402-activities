# API reference — x402-activities

Base URL: your deployment (local default `http://localhost:4021`).
Paid routes speak [x402](https://x402.org): unpaid requests get `402` with
payment requirements; paid requests get `200` with the artifact in the body.

## GET /search — $0.003

Search tours & activities around a coordinate.

### Parameters

| Param | In | Type | Required | Description |
|-------|----|------|----------|-------------|
| `lat` | query | number | yes | Latitude, -90..90 |
| `lon` | query | number | yes | Longitude, -180..180 |
| `radius` | query | number | no | Radius in km, 0 < r ≤ 20 (default 1) |

### Example

```bash
curl -s "http://localhost:4021/search?lat=41.3851&lon=2.1734&radius=2" \
  -H "X-PAYMENT: <payment payload>"
```

### Response 200

```json
{
  "source": "amadeus",
  "query": { "latitude": 41.3851, "longitude": 2.1734, "radiusKm": 2 },
  "count": 1,
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

Field notes:

- `source` — `"amadeus"` (live) or `"fixture"` (no Amadeus credentials on the
  server; deterministic sample data).
- `price` — activity list price from the vendor, or `null` if unpublished.
- `minimumDuration` — ISO-8601 duration or `null`.
- `bookingLink` — vendor booking URL (fixtures use `example.com`).

### Errors

| Status | `error` | When |
|--------|---------|------|
| 400 | `invalid_lat` | `lat` missing/out of range |
| 400 | `invalid_lon` | `lon` missing/out of range |
| 400 | `invalid_radius` | `radius` ≤ 0 or > 20 |
| 402 | — | No/invalid `X-PAYMENT` header; body lists `accepts` |
| 502 | `upstream_error` | Amadeus request failed (auth or availability) |

## Free routes

### GET /

Service metadata: name, routes with prices, payment config, backend mode
(`amadeus` live vs `fixture`), docs link.

### GET /health

```json
{ "status": "ok", "uptime": 12.3 }
```

### GET /.well-known/x402

Machine-readable discovery manifest listing every paid resource with price,
network, asset, and output schema. See [agents.md](agents.md).

## 402 response shape

```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "3000",
      "resource": "http://localhost:4021/search",
      "payTo": "0x...",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "maxTimeoutSeconds": 60
    }
  ]
}
```

Amounts are USDC base units (6 decimals): `3000` = $0.003.
