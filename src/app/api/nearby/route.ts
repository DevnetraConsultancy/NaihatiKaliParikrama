import { NextResponse } from "next/server";
import { bboxAround, haversine } from "@/lib/geo";
import { fetchFacilitiesFromOsm, OVERPASS_KINDS } from "@/lib/overpass";
import {
  bundledFacilities,
  cachedFacilities,
  storeFacilities,
} from "@/lib/repo";
import type { Facility } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const nearbyCache = globalThis as unknown as {
  __nkpNearbyCache?: Map<string, { value: unknown; expiresAt: number }>;
};
const cache = nearbyCache.__nkpNearbyCache ?? (nearbyCache.__nkpNearbyCache = new Map());
const CACHE_TTL_MS = 10 * 60 * 1000;

/** Seed-only categories (helplines) never come from OpenStreetMap. */
const SEED_ONLY_KINDS = new Set(["help"]);

function dedupe(facilities: Facility[]): Facility[] {
  const seen = new Set<string>();
  const output: Facility[] = [];
  for (const facility of facilities) {
    const key = facility.osm_id ?? `${facility.kind}:${facility.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(facility);
  }
  return output;
}

/**
 * Nearby hospitals, police stations, toilets, food and transport.
 * Instant response from Neon cache + verified local seed list; never blocks
 * waiting on slow external Overpass mirrors when local data is already present.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLat = Number(url.searchParams.get("lat"));
  const rawLng = Number(url.searchParams.get("lng"));
  const inBengal =
    Number.isFinite(rawLat) &&
    Number.isFinite(rawLng) &&
    rawLat >= 20 &&
    rawLat <= 28 &&
    rawLng >= 85 &&
    rawLng <= 91;

  const lat = inBengal ? rawLat : 22.8929;
  const lng = inBengal ? rawLng : 88.422;
  const radius = Math.min(Math.max(Number(url.searchParams.get("radius") ?? 3500), 300), 6000);
  const requested = (
    url.searchParams.get("kinds") ??
    "hospital,police,toilets,pharmacy,railway,help,parking,atm,restaurant"
  )
    .split(",")
    .map((kind) => kind.trim())
    .filter(Boolean)
    .slice(0, 12);

  const networkKinds = requested.filter((kind) => OVERPASS_KINDS.includes(kind));
  const seedOnly = requested.filter((kind) => SEED_ONLY_KINDS.has(kind));
  const bounds = bboxAround(lat, lng, radius);

  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)},${radius},${[...requested].sort().join("+")}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    return NextResponse.json({ ...(hit.value as Record<string, unknown>), cached: true });
  }

  const seedInRange = bundledFacilities().filter(
    (facility) =>
      requested.includes(facility.kind) &&
      facility.lat >= bounds.south &&
      facility.lat <= bounds.north &&
      facility.lng >= bounds.west &&
      facility.lng <= bounds.east,
  );

  let source: "cache" | "osm" | "seed" = "seed";
  let facilities: Facility[] = [];

  const cached = await cachedFacilities(lat, lng, radius, networkKinds);
  if (cached.length > 0) {
    facilities = dedupe([...cached, ...seedInRange]);
    source = "cache";
  } else if (seedInRange.length > 0) {
    facilities = seedInRange;
    source = "seed";
  } else {
    facilities = bundledFacilities().filter((facility) => requested.includes(facility.kind));
    source = "seed";
  }

  // Only query external Overpass asynchronously in the background if cache was empty
  if (cached.length === 0 && networkKinds.length > 0) {
    void fetchFacilitiesFromOsm(lat, lng, radius, networkKinds).then((live) => {
      if (live.length > 0) void storeFacilities(live);
    });
  }

  if (seedOnly.length > 0) {
    facilities = dedupe([
      ...facilities,
      ...bundledFacilities().filter((facility) => seedOnly.includes(facility.kind)),
    ]);
  }

  const distanceOriginLat = inBengal ? rawLat : lat;
  const distanceOriginLng = inBengal ? rawLng : lng;

  const withDistance = facilities
    .map((facility) => ({
      ...facility,
      distance: Math.round(haversine({ lat: distanceOriginLat, lng: distanceOriginLng }, facility)),
    }))
    .filter((facility) => facility.kind === "help" || (facility.distance ?? 0) <= Math.max(radius, 3500))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    .slice(0, 150);

  const payload = {
    facilities: withDistance,
    source,
    count: withDistance.length,
    radius,
    time: new Date().toISOString(),
  };

  if (cache.size > 200) cache.clear();
  cache.set(cacheKey, { value: payload, expiresAt: Date.now() + CACHE_TTL_MS });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
