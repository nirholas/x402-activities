# Tutorial — x402-activities

From a clean checkout to a paid API call, on either payment rail.

## 1. Install

```bash
git clone https://github.com/nirholas/x402-activities
cd x402-activities
npm install
```

Node 18 or newer.

## 2. Configure (optional)

```bash
cp .env.example .env
```

Nothing is required. Out of the box the server:

- listens on port `4021`,
- accepts USDC on **Base Sepolia** and on **Solana**, paying out to the suite's
  public receive addresses,
- serves deterministic fixture activities (no Amadeus key needed).

To be paid yourself, change these two lines:

```bash
PAY_TO_ADDRESS=0xYourEvmAddress
SOLANA_PAY_TO_ADDRESS=YourSolanaAddress
```

To return **live** Amadeus inventory, add free self-service credentials from
<https://developers.amadeus.com>:

```bash
AMADEUS_CLIENT_ID=your_client_id
AMADEUS_CLIENT_SECRET=your_client_secret
```

Responses then come back with `"source": "amadeus"` instead of
`"source": "fixture"`. Everything else — routes, prices, payment — is identical.

## 3. Run the server

```bash
npm run dev
```

```
x402-activities v0.1.0 listening on :4021
  payment rails:
    EVM     base-sepolia  USDC → 0x40252CFDF8B20Ed757D61ff157719F33Ec332402
    Solana  solana         USDC → WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW
  facilitator: https://x402.org/facilitator
  paid routes:
    GET /search                  $0.003
  free routes: GET /, GET /health, GET /.well-known/x402
```

Check it is alive:

```bash
curl -s http://localhost:4021/health
# {"status":"ok","uptime":1.2}
```

## 4. Your first 402

```bash
curl -s "http://localhost:4021/search?lat=41.3851&lon=2.1734&radius=2" | jq
```

You get HTTP **402** and a challenge listing **both** rails:

```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    { "scheme": "exact", "network": "base-sepolia", "maxAmountRequired": "3000",
      "payTo": "0x40252CFDF8B20Ed757D61ff157719F33Ec332402", "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
    { "scheme": "exact", "network": "solana", "maxAmountRequired": "3000",
      "payTo": "WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW", "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
  ]
}
```

That is the whole price negotiation: no key, no signup, no account. The price
is `3000` USDC base units (6 decimals) = **$0.003**.

## 5. Pay for real

Get a Base Sepolia test wallet and fund it with test USDC from
<https://faucet.circle.com>. Then:

```bash
PRIVATE_KEY=0xYourTestKey npm run client
```

[`examples/agent-client.ts`](../examples/agent-client.ts) does the full flow:

1. Calls the route unpaid and prints both rails from the 402.
2. Signs an EIP-3009 USDC authorization for exactly $0.003.
3. Retries with the `X-PAYMENT` header.
4. Prints the artifact and decodes the `X-PAYMENT-RESPONSE` receipt.

Prefer Solana? The bottom of that file shows the equivalent flow — the server
needs no changes, since the same 402 already advertises the `solana` rail.

## 6. Read the artifact

The 200 body **is** the purchase:

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

Check `source` first: `"amadeus"` means live inventory, `"fixture"` means the
deterministic demo data. Each activity carries a `bookingLink` you can hand
straight to a user or a downstream booking agent.

Full field-by-field reference: [api.md](api.md).

## 7. Going to mainnet

```bash
# EVM: Base mainnet
NETWORK=base
PAY_TO_ADDRESS=0xYourRealAddress

# Solana: mainnet (this is already the default)
SOLANA_NETWORK=mainnet-beta
SOLANA_PAY_TO_ADDRESS=YourRealSolanaAddress
SOLANA_RPC_URL=https://your-dedicated-rpc.example.com

# A facilitator that settles on the networks you accept
FACILITATOR_URL=https://x402.org/facilitator
```

Then run `npm run build && npm start`. Nothing else changes: the same routes,
the same prices, real USDC.

> Use a dedicated Solana RPC in production. The public endpoint is heavily
> rate-limited.

## Where to go next

- [api.md](api.md) — every endpoint, parameter, and error
- [agents.md](agents.md) — discovery, MCP, and listing your instance
- [../skill.md](https://github.com/nirholas/x402-activities/blob/main/skill.md) — the agent-facing skill file
- [../examples/curl.md](https://github.com/nirholas/x402-activities/blob/main/examples/curl.md) — the same flow in raw curl
