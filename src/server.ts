/**
 * x402-activities — Express server with x402 payment middleware.
 *
 * Paid routes return the purchased artifact directly in the 200 response body.
 */
import "dotenv/config";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { paymentMiddleware } from "x402-express";
import { hasAmadeusCredentials, searchActivities } from "./service.js";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const payTo = process.env.PAY_TO_ADDRESS;
if (!payTo || !payTo.startsWith("0x")) {
  console.error(
    "FATAL: PAY_TO_ADDRESS is not set.\n" +
      "Set PAY_TO_ADDRESS to the EVM address that should receive USDC payments,\n" +
      'e.g. PAY_TO_ADDRESS=0xYourAddress npm run dev  (see .env.example)"',
  );
  process.exit(1);
}

const network = (process.env.NETWORK ?? "base-sepolia") as
  | "base"
  | "base-sepolia";
const facilitatorUrl = (process.env.FACILITATOR_URL ??
  "https://x402.org/facilitator") as `${string}://${string}`;

const PRICES: Record<string, string> = {
  "GET /search": "$0.003",
};

const app = express();
app.use(express.json());

// x402 payment middleware — free routes are not listed here.
app.use(
  paymentMiddleware(
    payTo as `0x${string}`,
    {
      "GET /search": {
        price: PRICES["GET /search"],
        network,
        config: {
          description:
            "Tours & activities search by location (Amadeus-backed). Returns activities with prices and booking links.",
          mimeType: "application/json",
        },
      },
    },
    { url: facilitatorUrl },
  ),
);

// Static site (includes /.well-known/x402 as a plain file).
app.use(express.static(publicDir));

// Serve the discovery manifest with an explicit JSON content type.
app.get("/.well-known/x402", (_req, res) => {
  res
    .type("application/json")
    .sendFile(join(publicDir, ".well-known", "x402"));
});

// Free: service info.
app.get("/", (_req, res) => {
  res.json({
    name: "x402-activities",
    description:
      "Tours and activities search via Amadeus — agents find bookable experiences by location",
    payment: { protocol: "x402", network, asset: "USDC", payTo },
    backend: hasAmadeusCredentials()
      ? { source: "amadeus", live: true }
      : {
          source: "fixture",
          live: false,
          note: "Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET for live data.",
        },
    routes: {
      "GET /search": {
        price: PRICES["GET /search"],
        params: "lat, lon, radius (km, optional, default 1, max 20)",
      },
      "GET /health": { price: "free" },
      "GET /.well-known/x402": { price: "free" },
    },
    docs: "https://nirholas.github.io/x402-activities/",
  });
});

// Free: health check.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Paid: $0.003 — activities search. Artifact returned in this response body.
app.get("/search", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const radius = req.query.radius != null ? Number(req.query.radius) : 1;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    res.status(400).json({
      error: "invalid_lat",
      message: "Query param 'lat' must be a number between -90 and 90.",
    });
    return;
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    res.status(400).json({
      error: "invalid_lon",
      message: "Query param 'lon' must be a number between -180 and 180.",
    });
    return;
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > 20) {
    res.status(400).json({
      error: "invalid_radius",
      message: "Query param 'radius' must be a number of km between 0 and 20.",
    });
    return;
  }
  try {
    const result = await searchActivities(lat, lon, radius);
    res.json(result);
  } catch (err) {
    res.status(502).json({
      error: "upstream_error",
      message: err instanceof Error ? err.message : "Upstream request failed",
    });
  }
});

const port = Number(process.env.PORT ?? 4021);
app.listen(port, () => {
  const pkg = require("../package.json") as { version: string };
  console.log(`x402-activities v${pkg.version} listening on :${port}`);
  console.log(`  network:     ${network}`);
  console.log(`  facilitator: ${facilitatorUrl}`);
  console.log(`  payTo:       ${payTo}`);
  console.log(
    `  backend:     ${hasAmadeusCredentials() ? "Amadeus (live)" : "fixtures (set AMADEUS_CLIENT_ID/SECRET for live data)"}`,
  );
  console.log("  paid routes:");
  for (const [route, price] of Object.entries(PRICES)) {
    console.log(`    ${route}  ${price}`);
  }
  console.log("  free routes: GET /, GET /health, GET /.well-known/x402");
});
