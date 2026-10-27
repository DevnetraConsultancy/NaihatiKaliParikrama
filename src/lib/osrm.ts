import type { LatLng, RouteResult, RouteStep } from "./types";
import { walkMinutes, driveMinutes } from "./geo";

const DEFAULT_OSRM = "https://router.project-osrm.org";

function osrmBase(): string {
  return (process.env.OSRM_BASE_URL ?? DEFAULT_OSRM).replace(/\/$/, "");
}

interface OsrmStep {
  distance: number;
  duration: number;
  name?: string;
  maneuver?: {
    type?: string;
    modifier?: string;
    exit?: number;
  };
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry?: { coordinates: [number, number][] };
  legs?: { distance: number; duration: number; steps?: OsrmStep[] }[];
}

function roadName(step: OsrmStep): string {
  const name = (step.name ?? "").trim();
  return name.length > 0 ? name : "";
}

function describe(step: OsrmStep): { en: string; bn: string } {
  const type = step.maneuver?.type ?? "continue";
  const modifier = step.maneuver?.modifier ?? "";
  const name = roadName(step);
  const on = name ? ` on ${name}` : "";
  const bnOn = name ? ` — ${name}` : "";

  const sides: Record<string, { en: string; bn: string }> = {
    left: { en: `Turn left${on}`, bn: `বাঁ দিকে ঘুরুন${bnOn}` },
    right: { en: `Turn right${on}`, bn: `ডান দিকে ঘুরুন${bnOn}` },
    "slight left": { en: `Bear left${on}`, bn: `একটু বাঁ দিকে যান${bnOn}` },
    "slight right": { en: `Bear right${on}`, bn: `একটু ডান দিকে যান${bnOn}` },
    "sharp left": { en: `Sharp left${on}`, bn: `খুব বাঁ দিকে ঘুরুন${bnOn}` },
    "sharp right": { en: `Sharp right${on}`, bn: `খুব ডান দিকে ঘুরুন${bnOn}` },
    straight: { en: `Continue straight${on}`, bn: `সোজা এগিয়ে যান${bnOn}` },
    uturn: { en: `Make a U-turn${on}`, bn: `ইউ-টার্ন নিন${bnOn}` },
  };

  switch (type) {
    case "depart":
      return {
        en: name ? `Head out on ${name}` : "Start from your location",
        bn: name ? `${name} ধরে যাত্রা শুরু করুন` : "আপনার অবস্থান থেকে যাত্রা শুরু করুন",
      };
    case "arrive":
      return { en: "Arrive at destination", bn: "গন্তব্যে পৌঁছে গেছেন" };
    case "roundabout":
    case "rotary":
      return {
        en: `At the roundabout take exit ${step.maneuver?.exit ?? ""}`.trim(),
        bn: `গোল চক্কর থেকে ${step.maneuver?.exit ?? ""} নম্বর রাস্তা ধরুন`.trim(),
      };
    case "merge":
      return { en: `Merge${on}`, bn: `মিলিত হন${bnOn}` };
    case "fork":
      return sides[modifier] ?? { en: `Keep going${on}`, bn: `এগিয়ে চলুন${bnOn}` };
    case "end of road":
      return sides[modifier] ?? { en: `Turn${on}`, bn: `ঘুরুন${bnOn}` };
    case "new name":
    case "continue":
      return {
        en: name ? `Continue on ${name}` : "Continue straight",
        bn: name ? `${name} ধরে এগিয়ে যান` : "সোজা এগিয়ে যান",
      };
    default:
      return sides[modifier] ?? { en: `Continue${on}`, bn: `এগিয়ে চলুন${bnOn}` };
  }
}

function toSteps(route: OsrmRoute): RouteStep[] {
  const steps: RouteStep[] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const text = describe(step);
      steps.push({
        instruction_en: text.en,
        instruction_bn: text.bn,
        distance: step.distance ?? 0,
        duration: step.duration ?? 0,
      });
    }
  }
  return steps;
}

/**
 * Routes between two (or more) points using free OSRM mirrors.
 * Tries dedicated foot/car OSRM servers first, then standard OSRM fallback.
 */
export async function fetchRoute(
  points: LatLng[],
  profile: "foot" | "car" = "foot",
): Promise<RouteResult | null> {
  if (points.length < 2) return null;
  const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(";");
  const osrmProfile = profile === "foot" ? "foot" : "driving";

  const endpoints = [
    `https://routing.openstreetmap.de/routed-${profile === "foot" ? "foot" : "car"}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`,
    `${osrmBase()}/route/v1/${osrmProfile}/${coordinates}?overview=full&geometries=geojson&steps=true`,
    `${osrmBase()}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "NaihatiKaliParikrama/1.0" },
        signal: AbortSignal.timeout(7_500),
        cache: "no-store",
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as { code?: string; routes?: OsrmRoute[] };
      if (payload.code !== "Ok" || !payload.routes?.length) continue;
      return buildResult(payload.routes[0], profile, `osrm-${osrmProfile}`);
    } catch {
      // Try next mirror
    }
  }
  return null;
}

export function buildResult(
  route: OsrmRoute,
  profile: "foot" | "car",
  source: string,
): RouteResult {
  const geometry: [number, number][] = (route.geometry?.coordinates ?? []).map(
    ([lng, lat]) => [lat, lng] as [number, number],
  );
  const distance = route.distance ?? 0;
  return {
    profile,
    distance_m: Math.round(distance),
    duration_min: Math.max(1, Math.round((route.duration ?? 0) / 60)),
    walk_min: walkMinutes(distance),
    drive_min: driveMinutes(distance),
    geometry,
    steps: toSteps(route),
    legs: (route.legs ?? []).map((leg) => ({
      distance_m: Math.round(leg.distance ?? 0),
      duration_min: Math.max(1, Math.round((leg.duration ?? 0) / 60)),
    })),
    source,
  };
}

/** Straight-line fallback so the map can still draw a guide line offline. */
export function straightLineRoute(points: LatLng[], profile: "foot" | "car"): RouteResult {
  let distance = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dLat = (b.lat - a.lat) * 111_320;
    const dLng = (b.lng - a.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
    distance += Math.sqrt(dLat * dLat + dLng * dLng);
  }
  const routed = distance * 1.25;
  const durationMin = Math.max(1, Math.round(distance / (profile === "foot" ? 1.3 : 5.3) / 60));
  return {
    profile,
    distance_m: Math.round(routed),
    duration_min: durationMin,
    walk_min: walkMinutes(routed),
    drive_min: driveMinutes(routed),
    geometry: points.map((point) => [point.lat, point.lng] as [number, number]),
    steps: [
      {
        instruction_en: "Head towards destination along the highlighted route",
        instruction_bn: "চিহ্নিত পথ ধরে গন্তব্যের দিকে এগিয়ে যান",
        distance: Math.round(routed),
        duration: durationMin * 60,
      },
      {
        instruction_en: "Arrive at destination",
        instruction_bn: "গন্তব্যে পৌঁছে গেছেন",
        distance: 0,
        duration: 0,
      },
    ],
    legs: [
      {
        distance_m: Math.round(routed),
        duration_min: durationMin,
      },
    ],
    source: "straight-line-fallback",
  };
}
