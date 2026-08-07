/**
 * x402-activities — Express server with the dual-rail x402 paywall.
 *
 * Paid routes return the purchased artifact directly in the 200 response body.
 * Buyers pay in USDC on Base (EVM) or on Solana; the 402 challenge advertises
 * both rails and the client picks.
 */
import "dotenv/config";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  facilitatorUrl,
  paywall,
  rails,
  solanaCheckoutRouter,
  usingSuiteDefaultPayTo,
  type RoutePrices,
} from "./payments.js";
import { ROUTE_SCHEMAS } from "./schemas.js";
import { hasAmadeusCredentials, searchActivities } from "./service.js";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

/** Paid routes. Anything not listed here is free. */
const ROUTES: RoutePrices = {
  "GET /search": {
    price: "$0.003",
    description:
      "Tours & activities search by location (Amadeus-backed). Returns activities with prices, ratings, durations and booking links.",
    outputSchema: ROUTE_SCHEMAS["GET /search"],
  },
};

const app = express();
app.disable("x-powered-by");
app.use(express.json());

// Dual-rail x402 paywall: USDC on Base or Solana.
app.use(paywall(ROUTES, { service: "x402-activities" }));

// Optional: browser (Phantom) Solana checkout helper. No-op when the modal
// package is not installed — agent clients never need it.
const checkoutRouter = await solanaCheckoutRouter();
if (checkoutRouter) app.use("/api/x402-checkout", checkoutRouter);

// Discovery manifest — registered before express.static so it keeps an explicit
// application/json content type (the file has no extension).
app.get("/.well-known/x402", (_req, res) => {
  res.type("application/json").sendFile(join(publicDir, ".well-known", "x402"));
});

// Static site. `index: false` keeps `GET /` on the handler below, which serves
// the landing page to browsers and the JSON service descriptor to agents.
app.use(express.static(publicDir, { index: false }));

// Free: service info. Content-negotiated — `Accept: text/html` (a browser, or a
// crawler looking for title/description/favicon/og:image) gets the landing page;
// everything else, including `Accept: */*`, gets the JSON descriptor.
app.get("/", (req, res) => {
  if (req.accepts(["json", "html"]) === "html") {
    res.sendFile(join(publicDir, "index.html"));
    return;
  }
  res.json({
    name: "x402-activities",
    description:
      "Tours and activities search via Amadeus — agents find bookable experiences by location",
    payment: {
      protocol: "x402",
      note: "Pay in USDC on Base or Solana — your client picks the rail.",
      facilitator: facilitatorUrl(),
      rails: rails(),
    },
    backend: hasAmadeusCredentials()
      ? { source: "amadeus", live: true }
      : {
          source: "fixture",
          live: false,
          note: "Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET for live data.",
        },
    routes: {
      "GET /search": {
        price: "$0.003",
        params: "lat, lon, radius (km, optional, default 1, max 20)",
        returns: "activities with prices, ratings, durations and booking links",
      },
      "GET /health": { price: "free" },
      "GET /.well-known/x402": { price: "free" },
    },
    docs: "https://nirholas.github.io/x402-activities/",
    skill: "https://github.com/nirholas/x402-activities/blob/main/skill.md",
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
    res.json(await searchActivities(lat, lon, radius));
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
  console.log("  payment rails:");
  for (const rail of rails()) {
    console.log(
      `    ${rail.rail === "evm" ? "EVM   " : "Solana"}  ${rail.network.padEnd(14)} ${rail.asset} → ${rail.payTo}`,
    );
  }
  console.log(`  facilitator: ${facilitatorUrl()}`);
  if (usingSuiteDefaultPayTo()) {
    console.log(
      "  note:        using suite default payTo — set PAY_TO_ADDRESS/SOLANA_PAY_TO_ADDRESS to receive funds yourself",
    );
  }
  console.log(
    `  backend:     ${hasAmadeusCredentials() ? "Amadeus (live)" : "fixtures (set AMADEUS_CLIENT_ID/SECRET for live data)"}`,
  );
  console.log("  paid routes:");
  for (const [route, spec] of Object.entries(ROUTES)) {
    console.log(`    ${route.padEnd(28)} ${typeof spec === "string" ? spec : spec.price}`);
  }
  console.log("  free routes: GET /, GET /health, GET /.well-known/x402");
});
