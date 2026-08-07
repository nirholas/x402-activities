# curl walkthrough — 402 → pay → 200

This shows the raw x402 flow against x402-activities with plain HTTP.

## 1. Start the server

```bash
PAY_TO_ADDRESS=0xYourAddress npm run dev
```

## 2. Free routes need no payment

```bash
curl -s http://localhost:4021/ | jq
curl -s http://localhost:4021/health | jq
curl -s http://localhost:4021/.well-known/x402 | jq
```

## 3. Call a paid route without payment → HTTP 402

```bash
curl -si "http://localhost:4021/search?lat=41.3851&lon=2.1734&radius=2"
```

Response (abridged):

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "3000",
      "resource": "http://localhost:4021/search",
      "description": "Tours & activities search by location (Amadeus-backed). ...",
      "payTo": "0xYourAddress",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "maxTimeoutSeconds": 60
    }
  ]
}
```

`maxAmountRequired` is in USDC base units (6 decimals): `3000` = $0.003.

## 4. Pay

Construct an EIP-3009 `transferWithAuthorization` signature for the listed
`payTo` / amount / asset, base64-encode the payment payload, and retry with the
`X-PAYMENT` header. In practice you let a client library do this:

```bash
PRIVATE_KEY=0x... npm run client
```

(or any x402 client — x402-fetch, x402-axios, the x402 MCP tools, etc.)

## 5. Paid response → 200 with the artifact

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-PAYMENT-RESPONSE: eyJzdWNjZXNzIjp0cnVlLCJ0cmFuc2FjdGlvbiI6IjB4...

{
  "source": "fixture",
  "query": { "latitude": 41.3851, "longitude": 2.1734, "radiusKm": 2 },
  "count": 6,
  "activities": [ ... ]
}
```

The body is the purchased artifact; `X-PAYMENT-RESPONSE` is the base64-encoded
settlement receipt (decode it to get the on-chain transaction hash).
