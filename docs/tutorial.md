# Tutorial — x402-activities from zero to paid call

This walks through installing the server, seeing your first HTTP 402, paying it
with the example agent client, and reading the artifact you bought.

## 1. Install

```bash
git clone https://github.com/nirholas/x402-activities
cd x402-activities
npm install
```

Requires Node 18+.

## 2. Environment

Copy the example env and set the payout address:

```bash
cp .env.example .env
```

Minimum config:

```bash
PAY_TO_ADDRESS=0xYourAddress   # where USDC payments land
```

Optional live backend (otherwise deterministic fixtures are served, labeled
`"source": "fixture"`):

```bash
AMADEUS_CLIENT_ID=...          # free at developers.amadeus.com
AMADEUS_CLIENT_SECRET=...
```

## 3. Run the server

```bash
npm run dev
```

You should see a startup banner listing the paid routes:

```
x402-activities v0.1.0 listening on :4021
  network:     base-sepolia
  facilitator: https://x402.org/facilitator
  paid routes:
    GET /search  $0.003
```

## 4. Your first 402

```bash
curl -si "http://localhost:4021/search?lat=41.3851&lon=2.1734&radius=2" | head -20
```

The server answers `402 Payment Required` with a JSON body listing `accepts` —
the exact payment the route requires (asset, amount in USDC base units, payTo
address, network). This is the whole x402 handshake: the route itself tells you
how to pay for it.

## 5. Make the paid call

Fund a throwaway wallet with base-sepolia testnet USDC
(https://faucet.circle.com), then:

```bash
PRIVATE_KEY=0xYourTestKey npm run client
```

`examples/agent-client.ts` wraps `fetch` with `x402-fetch`, which:

1. sends the request, receives the 402,
2. signs an EIP-3009 USDC transfer authorization matching `accepts`,
3. retries with the `X-PAYMENT` header,
4. gets `200` — the artifact — plus an `X-PAYMENT-RESPONSE` settlement receipt.

## 6. Reading the artifact

The 200 body is the product:

```json
{
  "source": "fixture",
  "query": { "latitude": 41.3851, "longitude": 2.1734, "radiusKm": 2 },
  "count": 6,
  "activities": [
    { "id": "FIX-...-1", "name": "Food tasting near 41.39, 2.17 #1",
      "price": { "amount": "45.00", "currencyCode": "EUR" },
      "rating": 4.2, "bookingLink": "https://example.com/book/FIX-...-1" }
  ],
  "retrievedAt": "..."
}
```

- `source: "amadeus"` — live Amadeus data (credentials configured)
- `source: "fixture"` — deterministic sample data (no credentials); same query
  always returns the same activities, so it is safe to build against.

## 7. Going to mainnet

Testnet (`base-sepolia` + the free `https://x402.org/facilitator`) is the
default. For real USDC on Base mainnet:

```bash
NETWORK=base
FACILITATOR_URL=https://your-mainnet-facilitator.example.com
```

Mainnet settlement needs a facilitator that supports `base` (e.g. the Coinbase
CDP facilitator). Everything else — routes, prices, artifacts — is unchanged.
