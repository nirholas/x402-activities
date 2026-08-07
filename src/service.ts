/**
 * x402-activities — service layer.
 *
 * Live adapter for the Amadeus Tours & Activities API (Self-Service tier),
 * env-gated by AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET. When the keys are
 * absent the service returns deterministic fixture data so the demo always
 * runs without any paid or gated credentials.
 */

export interface Activity {
  id: string;
  name: string;
  shortDescription: string;
  latitude: number;
  longitude: number;
  price: { amount: string; currencyCode: string } | null;
  rating: number | null;
  pictures: string[];
  bookingLink: string | null;
  minimumDuration: string | null;
}

export interface SearchResult {
  source: "amadeus" | "fixture";
  query: { latitude: number; longitude: number; radiusKm: number };
  count: number;
  activities: Activity[];
  retrievedAt: string;
}

const AMADEUS_BASE =
  process.env.AMADEUS_BASE_URL ?? "https://test.api.amadeus.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

/** True when Amadeus credentials are configured. */
export function hasAmadeusCredentials(): boolean {
  return Boolean(
    process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET,
  );
}

async function getAmadeusToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID ?? "",
      client_secret: process.env.AMADEUS_CLIENT_SECRET ?? "",
    }),
  });
  if (!res.ok) {
    throw new Error(`Amadeus auth failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
  return body.access_token;
}

interface AmadeusActivity {
  id?: string;
  name?: string;
  shortDescription?: string;
  geoCode?: { latitude?: string | number; longitude?: string | number };
  price?: { amount?: string; currencyCode?: string };
  rating?: string;
  pictures?: string[];
  bookingLink?: string;
  minimumDuration?: string;
}

async function searchAmadeus(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Promise<Activity[]> {
  const token = await getAmadeusToken();
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius: String(radiusKm),
  });
  const res = await fetch(
    `${AMADEUS_BASE}/v1/shopping/activities?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Amadeus search failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { data?: AmadeusActivity[] };
  return (body.data ?? []).map((a) => ({
    id: a.id ?? "unknown",
    name: a.name ?? "Unnamed activity",
    shortDescription: a.shortDescription ?? "",
    latitude: Number(a.geoCode?.latitude ?? latitude),
    longitude: Number(a.geoCode?.longitude ?? longitude),
    price:
      a.price?.amount != null
        ? {
            amount: a.price.amount,
            currencyCode: a.price.currencyCode ?? "EUR",
          }
        : null,
    rating: a.rating != null ? Number(a.rating) : null,
    pictures: a.pictures ?? [],
    bookingLink: a.bookingLink ?? null,
    minimumDuration: a.minimumDuration ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Fixture data — used when AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET are unset.
// Deterministic: the same query always produces the same activities.
// ---------------------------------------------------------------------------

/** Small deterministic hash for seeding fixture output. */
function seedFrom(...parts: (string | number)[]): number {
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIXTURE_TEMPLATES = [
  {
    kind: "Walking tour",
    desc: "Guided small-group walking tour of the historic center with a licensed local guide.",
    duration: "PT2H30M",
  },
  {
    kind: "Food tasting",
    desc: "Progressive tasting across five family-run spots: street food, market stalls, and a hidden wine bar.",
    duration: "PT3H",
  },
  {
    kind: "Bike ride",
    desc: "Easy-paced city bike loop covering riverside paths, landmarks, and photo stops. Bikes and helmets included.",
    duration: "PT3H30M",
  },
  {
    kind: "Museum skip-the-line",
    desc: "Priority entrance ticket with optional audio guide to the city's most visited museum.",
    duration: "PT1H30M",
  },
  {
    kind: "Sunset cruise",
    desc: "Golden-hour boat cruise with onboard commentary and a welcome drink.",
    duration: "PT2H",
  },
  {
    kind: "Cooking class",
    desc: "Hands-on cooking class: shop the market with the chef, then cook and eat a three-course regional menu.",
    duration: "PT4H",
  },
  {
    kind: "Day trip",
    desc: "Full-day guided excursion to the region's most scenic nearby town, transport included.",
    duration: "PT8H",
  },
  {
    kind: "Street art tour",
    desc: "Neighborhood street-art walk led by a local artist, ending at a working studio.",
    duration: "PT2H",
  },
];

function fixtureActivities(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Activity[] {
  const seed = seedFrom(latitude.toFixed(3), longitude.toFixed(3), radiusKm);
  const rand = mulberry32(seed);
  const count = 4 + Math.floor(rand() * 5); // 4–8 results
  const out: Activity[] = [];
  for (let i = 0; i < count; i++) {
    const t = FIXTURE_TEMPLATES[Math.floor(rand() * FIXTURE_TEMPLATES.length)];
    const priceAmount = (15 + Math.floor(rand() * 17) * 5).toFixed(2);
    const dLat = (rand() - 0.5) * radiusKm * 0.018;
    const dLon = (rand() - 0.5) * radiusKm * 0.018;
    const id = `FIX-${seed.toString(36).toUpperCase()}-${i + 1}`;
    out.push({
      id,
      name: `${t.kind} near ${latitude.toFixed(2)}, ${longitude.toFixed(2)} #${i + 1}`,
      shortDescription: t.desc,
      latitude: Number((latitude + dLat).toFixed(6)),
      longitude: Number((longitude + dLon).toFixed(6)),
      price: { amount: priceAmount, currencyCode: "EUR" },
      rating: Number((3.5 + rand() * 1.5).toFixed(1)),
      pictures: [],
      bookingLink: `https://example.com/book/${id}`,
      minimumDuration: t.duration,
    });
  }
  return out;
}

/**
 * Search tours & activities around a point. Uses the live Amadeus API when
 * credentials are configured, deterministic fixtures otherwise.
 */
export async function searchActivities(
  latitude: number,
  longitude: number,
  radiusKm: number,
): Promise<SearchResult> {
  const query = { latitude, longitude, radiusKm };
  if (hasAmadeusCredentials()) {
    const activities = await searchAmadeus(latitude, longitude, radiusKm);
    return {
      source: "amadeus",
      query,
      count: activities.length,
      activities,
      retrievedAt: new Date().toISOString(),
    };
  }
  const activities = fixtureActivities(latitude, longitude, radiusKm);
  return {
    source: "fixture",
    query,
    count: activities.length,
    activities,
    retrievedAt: new Date().toISOString(),
  };
}
