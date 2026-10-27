import type { Lang, LatLng } from "./types";

/** Naihati town centre — Naihati Junction / Boro Bazar area. */
export const NAIHATI_CENTER: LatLng = { lat: 22.8878, lng: 88.4183 };
export const NAIHATI_BOUNDS = { south: 22.855, west: 88.39, north: 22.902, east: 88.442 };
export const DEFAULT_ZOOM = 15;

const EARTH_RADIUS_M = 6371008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Bounding box of `radiusMeters` around a point, for SQL / Overpass queries. */
export function bboxAround(lat: number, lng: number, radiusMeters: number) {
  const dLat = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.max(0.15, Math.cos(toRad(lat)));
  return {
    south: lat - dLat,
    north: lat + dLat,
    west: lng - dLng,
    east: lng + dLng,
  };
}

/**
 * Walking speed slows down as the pandal area fills up. This is what makes the
 * ETA react to the live crowd level instead of being a flat estimate.
 */
export const CROWD_SLOWDOWN: Record<number, number> = { 1: 1, 2: 1.08, 3: 1.22, 4: 1.4 };
export const WALK_SPEED_MPS = 1.3; // ~4.7 km/h through festival lanes
export const DRIVE_SPEED_MPS = 19000 / 3600; // ~19 km/h realistic town average

export function walkMinutes(meters: number, crowdLevel = 1): number {
  const speed = WALK_SPEED_MPS / (CROWD_SLOWDOWN[crowdLevel] ?? 1);
  return Math.max(1, Math.round(meters / speed / 60));
}

export function driveMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / DRIVE_SPEED_MPS / 60));
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Bengali numerals for Bengali UI text (৳ 320 মিটার, ১২ মিনিট …). */
export function toBengaliDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export function formatDistance(meters: number, lang: Lang): string {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return lang === "bn" ? `${toBengaliDigits(rounded)} মি` : `${rounded} m`;
  }
  const km = meters / 1000;
  const text = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return lang === "bn" ? `${toBengaliDigits(text)} কিমি` : `${text} km`;
}

export function formatMinutes(minutes: number, lang: Lang): string {
  const value = Math.max(1, Math.round(minutes));
  if (value >= 60) {
    const h = Math.floor(value / 60);
    const m = value % 60;
    return lang === "bn"
      ? `${toBengaliDigits(h)} ঘণ্টা ${toBengaliDigits(m)} মিনিট`
      : `${h} hr ${m} min`;
  }
  return lang === "bn" ? `${toBengaliDigits(value)} মিনিট` : `${value} min`;
}

/** Closest `count` items to a point, each annotated with `distance_m`. */
export function nearestTo<T extends LatLng>(
  items: T[],
  from: LatLng,
  count?: number,
): (T & { distance_m: number })[] {
  const withDistance = items
    .map((item) => ({ ...item, distance_m: haversine(from, item) }))
    .sort((a, b) => a.distance_m - b.distance_m);
  return typeof count === "number" ? withDistance.slice(0, count) : withDistance;
}

/**
 * Greedy nearest-neighbour ordering for a pandal-hopping itinerary. It is not an
 * exact travelling-salesman solution, but for a town of walking distances it
 * produces the natural "closest next stop" order that visitors actually follow.
 */
export function orderByNearest<T extends LatLng>(start: LatLng, stops: T[]): T[] {
  const remaining = [...stops];
  const ordered: T[] = [];
  let cursor: LatLng = start;
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const distance = haversine(cursor, remaining[i]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    cursor = next;
  }
  return ordered;
}

/** Straight-line walking ETA used before a real route is fetched. */
export function roughWalkMinutes(meters: number, crowdLevel = 1): number {
  // Streets are never straight: apply a 1.25 routing factor to the crow-flies hop.
  return walkMinutes(meters * 1.25, crowdLevel);
}
