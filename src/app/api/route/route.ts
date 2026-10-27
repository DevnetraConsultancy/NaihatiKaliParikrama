import { NextResponse } from "next/server";
import { hasDatabase, getSql } from "@/lib/db";
import { fetchRoute, straightLineRoute } from "@/lib/osrm";
import type { LatLng, RouteResult } from "@/lib/types";

export const dynamic = "force-dynamic";
// Routing may touch an OSRM server that is busy during festival nights.
export const maxDuration = 30;

interface CacheEntry {
  value: RouteResult;
  expiresAt: number;
}

// Warm-instance cache in front of the (rate limited) public OSRM server.
const globalCache = globalThis as unknown as { __nkpRouteCache?: Map<string, CacheEntry> };
const memory = globalCache.__nkpRouteCache ?? (globalCache.__nkpRouteCache = new Map());
const MEMORY_TTL_MS = 15 * 60 * 1000;
const MEMORY_MAX_ENTRIES = 250;

function memoryGet(key: string): RouteResult | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

function memorySet(key: string, value: RouteResult): void {
  if (memory.size >= MEMORY_MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
  memory.set(key, { value, expiresAt: Date.now() + MEMORY_TTL_MS });
}

async function dbGet(key: string): Promise<RouteResult | null> {
  if (!hasDatabase()) return null;
  try {
    const sql = getSql();
    const rows = (await sql.query(
      `select payload from route_cache where cache_key = $1 and created_at > now() - interval '1 day' limit 1`,
      [key],
    )) as { payload: RouteResult }[];
    return rows[0]?.payload ?? null;
  } catch {
    return null;
  }
}

async function dbSet(key: string, profile: string, value: RouteResult): Promise<void> {
  if (!hasDatabase()) return;
  try {
    const sql = getSql();
    await sql.query(
      `insert into route_cache (cache_key, profile, payload) values ($1,$2,$3)
       on conflict (cache_key) do update set payload = excluded.payload, created_at = now()`,
      [key, profile, JSON.stringify(value)],
    );
  } catch {
    // cache writes are best-effort
  }
}

function parsePoints(raw: string | null): LatLng[] | null {
  if (!raw) return null;
  const points: LatLng[] = [];
  for (const chunk of raw.split("|")) {
    const [latText, lngText] = chunk.split(",");
    const lat = Number(latText);
    const lng = Number(lngText);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    // Sanity bounds around West Bengal — catches swapped lat/lng input.
    if (lat < 20 || lat > 28 || lng < 85 || lng > 91) return null;
    points.push({ lat, lng });
  }
  if (points.length < 2 || points.length > 12) return null;
  return points;
}

/**
 * Multi-stop routing through the free OSRM server, in walking or driving mode.
 * Results are cached (memory, then Neon) so a crowd of visitors scanning the
 * same QR code does not hammer the public routing service.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const profile = url.searchParams.get("profile") === "car" ? "car" : "foot";
  const points = parsePoints(url.searchParams.get("points"));

  if (!points) {
    return NextResponse.json({ error: "invalid-points" }, { status: 400 });
  }

  const key = `${profile}:${points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";")}`;

  const fromMemory = memoryGet(key);
  if (fromMemory) {
    return NextResponse.json({ route: { ...fromMemory, cached: true } });
  }

  const fromDb = await dbGet(key);
  if (fromDb) {
    memorySet(key, fromDb);
    return NextResponse.json({ route: { ...fromDb, cached: true } });
  }

  const route = (await fetchRoute(points, profile)) ?? straightLineRoute(points, profile);
  memorySet(key, route);
  void dbSet(key, profile, route);

  return NextResponse.json({ route: { ...route, cached: false } });
}
