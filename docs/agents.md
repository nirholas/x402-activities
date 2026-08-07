# For AI agents — x402-activities

This service is built to be consumed by autonomous agents: machine-readable
discovery, per-request USDC payment, and the purchased artifact always in the
response body.

## Discovery

Two artifacts describe this service to agents:

1. **[`skill.md`](https://github.com/nirholas/x402-activities/blob/main/skill.md)**
   (repo root) — the agent-facing skill file: endpoints, prices, parameter and
   response schemas, payment instructions, error codes. Load it into your
   agent's context and it knows how to use the service.
2. **`GET /.well-known/x402`** (on the running server, free) — JSON manifest in
   the x402 discovery format: every paid resource with `price`, `network`,
   `asset`, and `outputSchema`. Indexers like x402scan.com, the x402 Bazaar,
   and agentic.market can crawl this.

## Paying

Any x402 client works. With `x402-fetch`:

```ts
import { wrapFetchWithPayment, createSigner } from "x402-fetch";

const signer = await createSigner("base-sepolia", process.env.PRIVATE_KEY!);
const payFetch = wrapFetchWithPayment(fetch, signer);
const res = await payFetch(`${BASE}/search?lat=41.3851&lon=2.1734`);
const artifact = await res.json();
```

The client handles the 402 → sign → retry loop. The `X-PAYMENT-RESPONSE`
header on the 200 carries the settlement receipt (decode with
`decodeXPaymentResponse`).

## What you get back

`GET /search` returns the full activity list *in the paid response* — there is
no follow-up call, webhook, or account. Check the `source` field: `"amadeus"`
is live inventory; `"fixture"` is deterministic demo data (the server has no
Amadeus credentials configured).

## MCP integration

See [`examples/mcp-tool.md`](https://github.com/nirholas/x402-activities/blob/main/examples/mcp-tool.md)
for a complete MCP server exposing `search_activities` to Claude, including a
`claude_desktop_config.json` snippet and a note on per-call spending caps.

## Listing this service

If you deploy your own instance and want agents to find it:

- **x402scan.com** — crawls `/.well-known/x402`; submit your base URL.
- **x402 Bazaar** — the discovery layer around the x402 facilitator; make your
  routes `discoverable` and register the service endpoint.
- **agentic.market** — lists agent-payable services; the same manifest applies.

Keep `skill.md` and `/.well-known/x402` in sync with your actual routes — they
are the contract agents rely on.
