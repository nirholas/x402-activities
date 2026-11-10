---
name: activities-search-api
description: Search bookable tours and activities near a latitude and longitude through a self-hosted x402-activities server. Use when an agent needs real experiences with prices, ratings and booking links, paid per query in USDC.
---

# x402-activities

Express server exposing one paid route, `GET /search`, backed by the Amadeus
Tours and Activities API when `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET`
are set (free credentials from developers.amadeus.com). Without them it returns
deterministic fixtures, and the response `source` field says `"fixture"` or
`"amadeus"`. Always read `source` before treating results as real inventory.

## Run the server

It is a self-hosted Node server (Express, Node 18 or newer). Run it from a clone:

```bash
git clone https://github.com/nirholas/x402-activities && cd x402-activities
npm install
cp .env.example .env     # then adjust; see the comments in the file
npm run dev              # tsx src/server.ts, listens on PORT (default 4021)
```

`npm run build` then `npm start` runs the compiled server. `npm run client`
runs `examples/agent-client.ts`, a reference paying client. Set `PAY_TO_ADDRESS`
and `SOLANA_PAY_TO_ADDRESS` to your own wallets to be paid yourself.

Optional: `AMADEUS_BASE_URL` (default `https://test.api.amadeus.com`).

## Endpoints

| Route | Price | Notes |
| --- | --- | --- |
| `GET /search?lat=&lon=&radius=` | $0.003 | `lat` -90..90, `lon` -180..180 (both required), `radius` km, 0 to 20, default 1 |
| `GET /` | free | service metadata, live prices, active rails, backend status |
| `GET /health` | free | liveness |
| `GET /.well-known/x402` | free | discovery manifest |

Response: `{ source, query, count, activities[], retrievedAt }`. Each activity
has `id`, `name`, `shortDescription`, `latitude`, `longitude`, `price`
(`amount`, `currencyCode`), `rating`, `pictures`, `bookingLink`,
`minimumDuration`.

Errors: 400 `invalid_lat`, `invalid_lon`, `invalid_radius`; 502
`upstream_error` (Amadeus failed, nothing settled); 402 payment required or
rejected.

## Example

```bash
curl -i "http://localhost:4021/search?lat=41.3851&lon=2.1734&radius=2"   # 402 with accepts[]
```

Then pay and retry (see below). The same URL with a valid `X-PAYMENT` returns
the activities list.

## Paying (x402)

Paid routes follow the x402 protocol. An unpaid call returns HTTP 402 with an
`accepts` array listing USDC on Base and USDC on Solana. Sign for one rail,
retry with the base64 payload in the `X-PAYMENT` header, and the 200 body
carries the result; the settlement receipt is in the `X-PAYMENT-RESPONSE`
header. Clients: `x402-fetch` (EVM), `@three-ws/x402-payment-modal` (browser,
both rails), or any x402 client. The rail networks are chosen by `NETWORK`
(EVM, `base-sepolia` by default) and `SOLANA_NETWORK` in `.env`; see
`.env.example`. Settlement moves real USDC on the chosen network: show the user
the recipient, amount and network and get an explicit yes before every paid call.
