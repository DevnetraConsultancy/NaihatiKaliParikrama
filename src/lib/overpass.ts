import type { Facility, FacilityKind } from "./types";
import { bboxAround } from "./geo";

export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.jp/api/interpreter",
];

/** Per-endpoint budget. Overpass mirrors can be slow under load. */
const ENDPOINT_TIMEOUT_MS = 9000;

/**
 * OpenStreetMap tags for each facility category we surface around a pandal.
 * Everything here is keyless and free — no Google/Mapbox billing required.
 */
const KIND_FILTERS: Record<string, string[]> = {
  hospital: ['nwr["amenity"~"^(hospital|clinic)$"](around:R,LAT,LNG)'],
  police: ['nwr["amenity"="police"](around:R,LAT,LNG)'],
  toilets: ['nwr["amenity"="toilets"](around:R,LAT,LNG)'],
  restaurant: ['nwr["amenity"~"^(restaurant|cafe|fast_food)$"](around:R,LAT,LNG)'],
  pharmacy: ['nwr["amenity"="pharmacy"](around:R,LAT,LNG)'],
  fire_station: ['nwr["amenity"="fire_station"](around:R,LAT,LNG)'],
  railway: ['nwr["railway"~"^(station|halt)$"](around:R,LAT,LNG)'],
  ferry: ['nwr["amenity"="ferry_terminal"](around:R,LAT,LNG)'],
  atm: ['nwr["amenity"~"^(atm|bank)$"](around:R,LAT,LNG)'],
  parking: ['nwr["amenity"="parking"](around:R,LAT,LNG)'],
  market: ['nwr["amenity"="marketplace"](around:R,LAT,LNG)'],
  water: ['nwr["amenity"="drinking_water"](around:R,LAT,LNG)'],
};

export const OVERPASS_KINDS = Object.keys(KIND_FILTERS);

/** Maps an OSM element back to one of our categories. */
function kindFromTags(tags: Record<string, string>): FacilityKind | null {
  if (tags.railway === "station" || tags.railway === "halt") return "railway";
  if (tags.amenity === "ferry_terminal") return "ferry";
  switch (tags.amenity) {
    case "hospital":
    case "clinic":
      return "hospital";
    case "police":
      return "police";
    case "toilets":
      return "toilets";
    case "restaurant":
    case "cafe":
    case "fast_food":
      return "restaurant";
    case "pharmacy":
      return "pharmacy";
    case "fire_station":
      return "fire_station";
    case "atm":
    case "bank":
      return "atm";
    case "parking":
      return "parking";
    case "marketplace":
      return "market";
    case "drinking_water":
      return "water";
    default:
      return null;
  }
}

function buildQuery(lat: number, lng: number, radius: number, kinds: string[]): string {
  const parts: string[] = [];
  for (const kind of kinds) {
    const filters = KIND_FILTERS[kind];
    if (!filters) continue;
    for (const filter of filters) {
      parts.push(
        `  ${filter
          .replace("LAT", lat.toFixed(6))
          .replace("LNG", lng.toFixed(6))
          .replace("R", String(Math.min(Math.max(Math.round(radius), 200), 6000)))};`,
      );
    }
  }
  return `[out:json][timeout:20];\n(\n${parts.join("\n")}\n);\nout center tags 120;`;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Fetches live facilities from OpenStreetMap's Overpass API around a point.
 * Returns an empty array (never throws) so callers can fall back to cached or
 * seeded data when OSM is unreachable or rate limiting.
 */
export async function fetchFacilitiesFromOsm(
  lat: number,
  lng: number,
  radius: number,
  kinds: string[],
): Promise<Facility[]> {
  if (kinds.length === 0) return [];
  const query = buildQuery(lat, lng, radius, kinds);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          // Overpass rejects requests carrying a generic library user agent.
          "User-Agent": "NaihatiKaliParikrama/1.0 (community Kali Puja map for Naihati)",
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(ENDPOINT_TIMEOUT_MS),
        cache: "no-store",
      });
      // Mirrors answer with an HTML gateway page when they are busy, so the
      // content type is checked before parsing rather than trusting the status.
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) continue;
      const payload = (await response.json()) as { elements?: OverpassElement[] };
      const facilities = normaliseElements(payload.elements ?? []);
      if (facilities.length > 0) return facilities;
    } catch {
      // try the next mirror
    }
  }
  return [];
}

export function normaliseElements(elements: OverpassElement[]): Facility[] {
  const facilities: Facility[] = [];
  for (const element of elements) {
    const tags = element.tags ?? {};
    const pointLat = element.lat ?? element.center?.lat;
    const pointLng = element.lon ?? element.center?.lon;
    if (typeof pointLat !== "number" || typeof pointLng !== "number") continue;
    const kind = kindFromTags(tags);
    if (!kind) continue;
    const fallbackName = tags["name:en"] ?? tags.name ?? `${kind} (unnamed in OSM)`;
    facilities.push({
      osm_id: `${element.type}/${element.id}`,
      kind,
      name: fallbackName,
      lat: pointLat,
      lng: pointLng,
      address: tags["addr:street"]
        ? `${tags["addr:housenumber"] ? `${tags["addr:housenumber"]} ` : ""}${tags["addr:street"]}`
        : null,
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      source: "osm",
    });
  }
  return facilities;
}

/** Bounding box used to look up cached facilities in Postgres. */
export function facilityBounds(lat: number, lng: number, radius: number) {
  return bboxAround(lat, lng, radius);
}
