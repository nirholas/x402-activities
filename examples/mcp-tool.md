# Exposing x402-activities as an MCP tool for Claude

Model Context Protocol (MCP) lets Claude call external tools. This service is a
single HTTP endpoint with x402 payment, so wrapping it as an MCP tool is ~40
lines with the MCP SDK plus `x402-fetch`.

## Minimal MCP server

```ts
// mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { wrapFetchWithPayment, createSigner } from "x402-fetch";

const BASE_URL = process.env.ACTIVITIES_BASE_URL ?? "http://localhost:4021";

const server = new McpServer({ name: "x402-activities", version: "0.1.0" });

server.tool(
  "search_activities",
  "Search bookable tours & activities near a coordinate. Costs $0.003 USDC via x402.",
  {
    lat: z.number().min(-90).max(90).describe("Latitude"),
    lon: z.number().min(-180).max(180).describe("Longitude"),
    radius: z.number().positive().max(20).optional().describe("Radius in km (default 1)"),
  },
  async ({ lat, lon, radius }) => {
    const signer = await createSigner(
      process.env.NETWORK ?? "base-sepolia",
      process.env.PRIVATE_KEY!,
    );
    const payFetch = wrapFetchWithPayment(fetch, signer);
    const qs = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    if (radius != null) qs.set("radius", String(radius));
    const res = await payFetch(`${BASE_URL}/search?${qs}`);
    return { content: [{ type: "text", text: await res.text() }] };
  },
);

await server.connect(new StdioServerTransport());
```

## claude_desktop_config.json

```json
{
  "mcpServers": {
    "x402-activities": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-server.ts"],
      "env": {
        "ACTIVITIES_BASE_URL": "http://localhost:4021",
        "PRIVATE_KEY": "0x...funded base-sepolia key...",
        "NETWORK": "base-sepolia"
      }
    }
  }
}
```

Claude can then call `search_activities` and every invocation pays $0.003 USDC
to the service and returns the activity list directly to the model.

**Budget tip**: `wrapFetchWithPayment` accepts a `maxValue` (base units) third
argument — set it to cap what any single tool call may spend.
