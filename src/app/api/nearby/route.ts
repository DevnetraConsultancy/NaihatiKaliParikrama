import { NextResponse } from "next/server";
import { bboxAround, haversine } from "@/lib/geo";
import { fetchFacilitiesFromOsm, OVERPASS_KINDS } from "@/lib/overpass";
import {
  bundledFacilities,
  cachedFacilities,
  facilityCacheIsThin,
  storeFacilities,
} from "@/lib/repo";
import type { Facility } from "@/lib/types";

export const dynamic = "force-dynamic";
// Overpass mirrors can take several seconds; give the function room to wait
// instead of returning a gateway timeout to the visitor.
export const maxDuration = 30;

/**
 * Warm-instance cache. Dozens of visitors scanning the same QR code around the
 * same pandal share one Overpass lookup instead of each triggering their own.
 */
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
 * Order of preference: Neon cache → live OpenStreetMap (Overpass) → bundled
 * seed list, so the Help screen keeps working even when OSM is rate limiting.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const radius = Math.min(Math.max(Number(url.searchParams.get("radius") ?? 1800), 300), 6000);
  const requested = (url.searchParams.get("kinds") ?? "hospital,police,toilets,restaurant")
    .split(",")
    .map((kind) => kind.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 20 || lat > 28 || lng < 85 || lng > 91) {
    return NextResponse.json({ error: "invalid-location" }, { status: 400 });
  }

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
    facilities = cached;
    source = "cache";
  }

  if (networkKinds.length > 0 && facilityCacheIsThin(cached)) {
    const live = await fetchFacilitiesFromOsm(lat, lng, radius, networkKinds);
    if (live.length > 0) {
      facilities = dedupe([...live, ...cached]);
      source = "osm";
      void storeFacilities(live);
    }
  }

  if (facilities.length === 0) {
    facilities = seedInRange;
    source = "seed";
  } else if (seedInRange.length > 0) {
    // Fold in seeded landmarks (e.g. the two run-rate parking grounds) that OSM
    // may not tag at all.
    facilities = dedupe([...facilities, ...seedInRange]);
  }

  if (seedOnly.length > 0) {
    facilities = dedupe([
      ...facilities,
      ...bundledFacilities().filter((facility) => seedOnly.includes(facility.kind)),
    ]);
  }

  const withDistance = facilities
    .map((facility) => ({ ...facility, distance: Math.round(haversine({ lat, lng }, facility)) }))
    .filter((facility) => (facility.distance ?? 0) <= radius)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    .slice(0, 150);

  const payload = {
    facilities: withDistance,
    source,
    count: withDistance.length,
    radius,
    time: new Date().toISOString(),
  };

  // Only remember results that are not a bare seed fallback, so a temporary
  // OpenStreetMap outage does not get pinned in the cache for ten minutes.
  if (source !== "seed") {
    if (cache.size > 200) cache.clear();
    cache.set(cacheKey, { value: payload, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  return NextResponse.json(payload);
}
