# x402-activities

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![x402](https://img.shields.io/badge/payments-x402-0052ff.svg)](https://x402.org)

**Tours and activities search via Amadeus — agents find bookable experiences by
location.** One HTTP call, $0.003 in USDC, and the full activity list comes back
in the response body: names, prices, ratings, durations, booking links.

Docs site: **https://nirholas.github.io/x402-activities/**

## Why x402 for this

Activity search APIs normally mean developer accounts, API keys, and quota
tiers — hostile territory for an autonomous agent that just wants one answer.
With x402 the route itself quotes its price in the 402 response, the agent pays
$0.003 in USDC per query, and there is nothing to sign up for, leak, or rotate.
Pay-per-request also matches how agents actually consume search: sporadically,
across many services.

## Quickstart

```bash
git clone https://github.com/nirholas/x402-activities
cd x402-activities
npm install
PAY_TO_ADDRESS=0xYourAddress npm run dev
```

Then, from an agent (wallet funded with base-sepolia USDC — https://faucet.circle.com):

```bash
PRIVATE_KEY=0xYourTestKey npm run client
```

## API

| Route | Price | What you get back |
|-------|-------|-------------------|
| `GET /search?lat&lon&radius` | **$0.003** | Activities near the coordinate: name, description, geo, price, rating, booking link, duration |
| `GET /` | free | Service metadata + prices |
| `GET /health` | free | Liveness |
| `GET /.well-known/x402` | free | Machine-readable discovery manifest |

Full reference: [docs/api.md](docs/api.md) · [openapi.json](openapi.json)

## How x402 works

1. **402** — `GET /search` without payment returns HTTP 402 plus `accepts`:
   the exact price ($0.003 → `3000` USDC base units), asset, and `payTo`.
2. **Sign** — the client signs an EIP-3009 USDC transfer authorization for that
   amount (no gas needed from the payer).
3. **Settle** — the server passes it to the facilitator
   (`https://x402.org/facilitator` on testnet), which verifies and settles
   on-chain.
4. **200** — the same request returns the artifact in the body, with the
   settlement receipt in the `X-PAYMENT-RESPONSE` header.

Walkthroughs: [examples/curl.md](examples/curl.md) ·
[examples/agent-client.ts](examples/agent-client.ts) ·
[docs/tutorial.md](docs/tutorial.md)

## Real backend / API keys

| Env | Effect |
|-----|--------|
| `AMADEUS_CLIENT_ID` + `AMADEUS_CLIENT_SECRET` | Live [Amadeus Tours & Activities](https://developers.amadeus.com) data (`source: "amadeus"`). Free self-service keys; default base URL is the Amadeus **test** environment (`AMADEUS_BASE_URL` to change). |
| *(unset)* | Deterministic fixtures, honestly labeled `source: "fixture"` in every response. Same query → same results. The demo never requires a key. |

All variables: [.env.example](.env.example)

## For AI agents

- **[skill.md](skill.md)** — agent-facing skill file: endpoints, prices,
  schemas, payment instructions. Point your agent at it.
- **`GET /.well-known/x402`** — discovery manifest indexable by
  [x402scan.com](https://x402scan.com), the x402 Bazaar, and
  [agentic.market](https://agentic.market).
- **MCP** — [examples/mcp-tool.md](examples/mcp-tool.md) shows how to expose
  `/search` as a Claude MCP tool (with per-call spend caps), including a
  `claude_desktop_config.json` example.
- More: [docs/agents.md](docs/agents.md)

## Docs

- Landing: https://nirholas.github.io/x402-activities/
- [Tutorial](docs/tutorial.md) · [API reference](docs/api.md) · [For AI agents](docs/agents.md)

## License

Apache-2.0. Part of the [x402 Suite](https://github.com/nirholas/x402-suite).
