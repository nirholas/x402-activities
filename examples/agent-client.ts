/**
 * x402-activities — example agent client.
 *
 * Full x402 payment flow with x402-fetch:
 *   1. GET /search → 402 with payment requirements
 *   2. x402-fetch signs a USDC authorization and retries with X-PAYMENT
 *   3. 200 with the purchased artifact + X-PAYMENT-RESPONSE settlement receipt
 *
 * Usage:
 *   PRIVATE_KEY=0x... BASE_URL=http://localhost:4021 npx tsx examples/agent-client.ts
 *
 * The wallet needs base-sepolia testnet USDC (https://faucet.circle.com).
 */
import {
  wrapFetchWithPayment,
  createSigner,
  decodeXPaymentResponse,
} from "x402-fetch";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4021";
const NETWORK = process.env.NETWORK ?? "base-sepolia";
const privateKey = process.env.PRIVATE_KEY;

async function main(): Promise<void> {
  if (!privateKey) {
    console.error("Set PRIVATE_KEY to a funded base-sepolia wallet key.");
    process.exit(1);
  }

  const signer = await createSigner(NETWORK, privateKey);
  const payFetch = wrapFetchWithPayment(fetch, signer);

  // Free route first — no payment involved.
  const info = await fetch(`${BASE_URL}/`);
  console.log("service info:", JSON.stringify(await info.json(), null, 2));

  // Paid route — x402-fetch handles the 402 → pay → retry loop.
  const url = `${BASE_URL}/search?lat=41.3851&lon=2.1734&radius=2`;
  console.log(`\nPaying for GET /search ...`);
  const res = await payFetch(url);
  if (!res.ok) {
    console.error(`Request failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  const artifact = await res.json();
  console.log("\n=== purchased artifact ===");
  console.log(JSON.stringify(artifact, null, 2));

  const receiptHeader = res.headers.get("x-payment-response");
  if (receiptHeader) {
    console.log("\n=== X-PAYMENT-RESPONSE (settlement receipt) ===");
    console.log(JSON.stringify(decodeXPaymentResponse(receiptHeader), null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
