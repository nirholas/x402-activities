# x402-activities

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![x402](https://img.shields.io/badge/payments-x402-0052ff.svg)](https://x402.org)
[![USDC on Base](https://img.shields.io/badge/USDC-Base-0052ff.svg)](https://base.org)
[![USDC on Solana](https://img.shields.io/badge/USDC-Solana-14f195.svg)](https://solana.com)

**Tours and activities search via Amadeus — agents find bookable experiences by
location.** One HTTP call, $0.003 in USDC on Base *or* Solana, and the full
activity list comes back in the response body: names, prices, ratings,
durations, booking links.

Docs site: **https://nirholas.github.io/x402-activities/**

## Why x402 for this

Activity search APIs normally mean developer accounts, API keys, and quota
tiers — hostile territory for an autonomous agent that just wants one answer.
With x402 the route itself quotes its price in the 402 response, the agent pays
$0.003 in USDC per query on whichever chain it holds funds on, and there is
nothing to sign up for, leak, or rotate. Pay-per-request also matches how agents
actually consume search: sporadically, across many services, with no way to
predict a monthly tier in advance.

## Quickstart

```bash
git clone https://github.com/nirholas/x402-activities
cd x402-activities
npm install
npm run dev            # http://localhost:4021 — no configuration needed
```

See the price with no wallet at all:

```bash
curl -s "http://localhost:4021/search?lat=41.3851&lon=2.1734&radius=2" | jq
# 402 + accepts: [ USDC on Base, USDC on Solana ]
```

Then buy it, from an agent (wallet funded with Base Sepolia USDC —
https://faucet.circle.com):

```bash
PRIVATE_KEY=0xYourTestKey npm run client
```

## API

| Route | Price | What you get back |
|-------|-------|-------------------|
| `GET /search` | **$0.003** | Activities near the coordinate: name, description, geo, price, rating, booking link, duration |
| `GET /` | free | Service metadata, live prices, active payment rails, backend status |
| `GET /health` | free | Liveness probe |
| `GET /.well-known/x402` | free | Machine-readable discovery manifest |

Full reference: [docs/api.md](docs/api.md) · [openapi.json](openapi.json)

## How x402 works

**Pay in USDC on Base or Solana — your client picks the rail.**

1. **402** — the route, called without payment, replies HTTP 402 with an
   `accepts` array holding **both** rails: exact price
   ($0.003 → `3000` USDC base units), asset, and `payTo`.
2. **Sign** — on Base, the client signs an EIP-3009 USDC authorization (no gas
   from the payer). On Solana, it signs an SPL `transferChecked` whose fee payer
   is the facilitator's sponsor account (so the buyer needs USDC only, no SOL).
3. **Settle** — the server hands the payload to the facilitator
   (`https://x402.org/facilitator`), which verifies and settles on the chosen chain.
4. **200** — the same request returns the artifact in the body, with the
   settlement receipt in the `X-PAYMENT-RESPONSE` header.

| Rail | Network | Asset | payTo |
|------|---------|-------|-------|
| EVM | `base-sepolia` (`base` on mainnet) | USDC | `0x40252CFDF8B20Ed757D61ff157719F33Ec332402` |
| Solana | `solana` (`solana-devnet` on devnet) | USDC | `WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW` |

Those are the suite's public receive addresses and the server's defaults. Set
`PAY_TO_ADDRESS` / `SOLANA_PAY_TO_ADDRESS` to be paid yourself.

Walkthroughs: [examples/curl.md](examples/curl.md) ·
[examples/agent-client.ts](examples/agent-client.ts) ·
[docs/tutorial.md](docs/tutorial.md)

## Real backend / API keys

| Env | Effect |
|-----|--------|
| `AMADEUS_CLIENT_ID` + `AMADEUS_CLIENT_SECRET` | Live [Amadeus Tours & Activities](https://developers.amadeus.com) data (`source: "amadeus"`). Free self-service keys; defaults to the Amadeus **test** environment — set `AMADEUS_BASE_URL=https://api.amadeus.com` for production. |
| *(unset)* | Deterministic fixtures, honestly labelled `source: "fixture"` in every response. Same query → same results. The demo never requires a key. |

All variables: [.env.example](.env.example)

## For AI agents

- **[skill.md](skill.md)** — agent-facing skill file: endpoints, prices,
  schemas, both payment rails. Point your agent at it.
- **`GET /.well-known/x402`** — discovery manifest listing every resource with
  both networks. Indexable by [x402scan.com](https://x402scan.com), the x402
  Bazaar, and [agentic.market](https://agentic.market).
- **MCP** — [examples/mcp-tool.md](examples/mcp-tool.md) exposes these routes as
  Claude MCP tools, with per-wallet spend caps and a
  `claude_desktop_config.json` example.
- More: [docs/agents.md](docs/agents.md)

## Docs

- Landing: https://nirholas.github.io/x402-activities/
- [Tutorial](docs/tutorial.md) · [API reference](docs/api.md) · [For AI agents](docs/agents.md)

## Support

Questions, bugs, or a listing request: **nichxbt@gmail.com** ·
[open an issue](https://github.com/nirholas/x402-activities/issues)

## License

Apache-2.0. Part of the [x402 Suite](https://github.com/nirholas/x402-suite).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=nirholas/x402-activities&type=Date)](https://www.star-history.com/#nirholas/x402-activities&Date)

<!-- three.ws:growth -->
## Support the project

If x402-activities saves you time, **[star it on GitHub](https://github.com/nirholas/x402-activities)**. Stars are how other developers and AI agents find the repositories worth trusting, and they cost you one click.

Know someone who would use it? [Post on X](https://twitter.com/intent/tweet?text=x402-activities%3A%20Tours%20and%20activities%20search%20via%20Amadeus%3A%20agents%20find%20bookable%20experiences%20by%20location%2C%20paid%20per&url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-activities) · [Share on Bluesky](https://bsky.app/intent/compose?text=x402-activities%3A%20Tours%20and%20activities%20search%20via%20Amadeus%3A%20agents%20find%20bookable%20experiences%20by%20location%2C%20paid%20per%20https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-activities) · [Share on LinkedIn](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-activities) · [Submit to Hacker News](https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-activities&t=x402-activities%3A%20Tours%20and%20activities%20search%20via%20Amadeus%3A%20agents%20find%20bookable%20experiences%20by%20location%2C%20paid%20per) · [Share on Reddit](https://www.reddit.com/submit?url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-activities&title=x402-activities%3A%20Tours%20and%20activities%20search%20via%20Amadeus%3A%20agents%20find%20bookable%20experiences%20by%20location%2C%20paid%20per)

## Built for AI agents too

Coding agents and LLM tooling can read this repo directly: [AGENTS.md](./AGENTS.md), [llms.txt](./llms.txt), [llms-full.txt](./llms-full.txt). Point an agent at `https://github.com/nirholas/x402-activities` and it has the context it needs.

## More from the same author

- [All repositories by nirholas](https://github.com/nirholas/nirholas#readme): the full catalog, grouped by topic
- [three.ws](https://three.ws): the platform for 3D AI agents with Solana wallets, a skill marketplace and x402 payments
- Questions or ideas: [open an issue](https://github.com/nirholas/x402-activities/issues) or [start a discussion](https://github.com/nirholas/x402-activities/discussions)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=nirholas/x402-activities)](https://github.com/nirholas/x402-activities/graphs/contributors)

<!-- /three.ws:growth -->
