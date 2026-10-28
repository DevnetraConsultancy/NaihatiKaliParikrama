"use client";

import type { CrowdInfo, Facility, Pandal, RouteResult } from "./types";

export interface PandalsResponse {
  pandals: Pandal[];
  source: "database" | "seed";
  count: number;
}

let pandalsPromise: Promise<PandalsResponse> | null = null;

/** Pandals rarely change mid-session, so one request is shared app-wide. */
export function loadPandals(force = false): Promise<PandalsResponse> {
  if (!pandalsPromise || force) {
    pandalsPromise = fetch("/api/pandals", { cache: "no-store" })
      .then((response) => response.json() as Promise<PandalsResponse>)
      .catch(() => {
        pandalsPromise = null;
        throw new Error("pandals-unavailable");
      });
  }
  return pandalsPromise;
}

export function invalidatePandals(): void {
  pandalsPromise = null;
}

export async function fetchCrowd(slugs: string[]): Promise<Record<string, CrowdInfo>> {
  if (slugs.length === 0) return {};
  const response = await fetch(`/api/crowd?slugs=${encodeURIComponent(slugs.join(","))}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("crowd-unavailable");
  const payload = (await response.json()) as { levels: Record<string, CrowdInfo> };
  return payload.levels ?? {};
}

export async function reportCrowd(
  slug: string,
  level: 1 | 2 | 3 | 4,
): Promise<{ ok: boolean; info?: CrowdInfo; reason?: string }> {
  const response = await fetch("/api/crowd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, level }),
  });
  const payload = (await response.json()) as {
    ok?: boolean;
    info?: CrowdInfo;
    reason?: string;
    error?: string;
  };
  if (!response.ok) {
    return { ok: false, reason: payload.reason ?? payload.error ?? "failed" };
  }
  return { ok: Boolean(payload.ok), info: payload.info, reason: payload.reason };
}

export async function fetchRoute(
  points: { lat: number; lng: number }[],
  profile: "foot" | "car" = "foot",
): Promise<RouteResult | null> {
  const encoded = points.map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join("|");
  const response = await fetch(`/api/route?points=${encodeURIComponent(encoded)}&profile=${profile}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { route?: RouteResult };
  return payload.route ?? null;
}

const nearbyClientCache = new Map<
  string,
  { data: { facilities: Facility[]; source: string }; timestamp: number }
>();

export async function fetchNearby(
  lat: number,
  lng: number,
  kinds: string[],
  radius = 1800,
): Promise<{ facilities: Facility[]; source: string }> {
  const roundedLat = lat.toFixed(3);
  const roundedLng = lng.toFixed(3);
  const sortedKinds = [...kinds].sort().join(",");
  const cacheKey = `${roundedLat}:${roundedLng}:${radius}:${sortedKinds}`;

  const cached = nearbyClientCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 120_000) {
    return cached.data;
  }

  const query = new URLSearchParams({
    lat: lat.toFixed(5),
    lng: lng.toFixed(5),
    radius: String(radius),
    kinds: kinds.join(","),
  });
  const response = await fetch(`/api/nearby?${query.toString()}`, { cache: "no-store" });
  if (!response.ok) return { facilities: [], source: "unavailable" };
  const payload = (await response.json()) as { facilities?: Facility[]; source?: string };
  const result = { facilities: payload.facilities ?? [], source: payload.source ?? "unknown" };
  nearbyClientCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}
