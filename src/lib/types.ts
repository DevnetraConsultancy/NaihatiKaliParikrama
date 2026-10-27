export const PANDAL_CATEGORIES = ["heritage", "large", "small"] as const;
export type PandalCategory = (typeof PANDAL_CATEGORIES)[number];

export const FACILITY_KINDS = [
  "hospital",
  "police",
  "toilets",
  "restaurant",
  "pharmacy",
  "fire_station",
  "railway",
  "ferry",
  "atm",
  "parking",
  "market",
  "water",
  "help",
] as const;
export type FacilityKind = (typeof FACILITY_KINDS)[number];

export type Lang = "bn" | "en";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Pandal extends LatLng {
  slug: string;
  name_en: string;
  name_bn: string;
  category: PandalCategory;
  area_en: string;
  area_bn: string;
  landmark_en?: string | null;
  landmark_bn?: string | null;
  committee?: string | null;
  established?: number | null;
  description_en?: string | null;
  description_bn?: string | null;
  featured?: boolean;
  verified?: boolean;
  photo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Facility extends LatLng {
  id?: string | number;
  kind: FacilityKind | string;
  name: string;
  address?: string | null;
  phone?: string | null;
  source: "osm" | "seed" | "manual";
  osm_id?: string | null;
  distance?: number;
}

export interface CrowdLevelNumber {
  1: "free";
  2: "moderate";
  3: "busy";
  4: "heavy";
}

export interface CrowdInfo {
  slug: string;
  /** 1 = free, 2 = moderate, 3 = busy, 4 = very busy */
  level: 1 | 2 | 3 | 4;
  reports: number;
  source: "live" | "estimate";
  updated_at: string | null;
}

export interface RouteStep {
  instruction_en: string;
  instruction_bn: string;
  distance: number;
  duration: number;
}

export interface RouteResult {
  profile: "foot" | "car";
  distance_m: number;
  duration_min: number;
  walk_min: number;
  drive_min: number;
  /** [lat, lng] pairs, ready for Leaflet */
  geometry: [number, number][];
  steps: RouteStep[];
  legs: { distance_m: number; duration_min: number }[];
  source: string;
  cached?: boolean;
}

export interface PandalWithDistance extends Pandal {
  distance_m?: number;
  crowd?: CrowdInfo;
}
