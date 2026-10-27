import type { Pandal } from "./types";

/**
 * Search helpers. Festival names are typed loosely by visitors — "boromaa",
 * "baro maa", "Boroma" — so queries are compared with punctuation and spaces
 * stripped, and Bengali is matched as-is.
 */
export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, "");
}

export function matchesQuery(haystack: string[], query: string): boolean {
  const needle = normalizeText(query);
  if (needle.length === 0) return true;
  return haystack.some((value) => normalizeText(value).includes(needle));
}

export function pandalHaystack(pandal: Partial<Pandal>): string[] {
  return [
    pandal.name_en ?? "",
    pandal.name_bn ?? "",
    pandal.area_en ?? "",
    pandal.area_bn ?? "",
    pandal.committee ?? "",
    pandal.landmark_en ?? "",
    pandal.landmark_bn ?? "",
    pandal.slug ?? "",
  ];
}
