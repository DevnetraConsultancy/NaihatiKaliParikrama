"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { Chip, FacilityRow } from "@/components/map/bits";
import { fetchNearby, fetchRoute } from "@/lib/client-api";
import { NAIHATI_CENTER, formatDistance, formatMinutes } from "@/lib/geo";
import { useGeolocation } from "@/lib/hooks";
import type { Facility } from "@/lib/types";

const KIND_CHIPS: { kind: string; emoji: string }[] = [
  { kind: "hospital", emoji: "🏥" },
  { kind: "police", emoji: "🚓" },
  { kind: "toilets", emoji: "🚻" },
  { kind: "restaurant", emoji: "🍽" },
  { kind: "pharmacy", emoji: "💊" },
  { kind: "railway", emoji: "🚉" },
  { kind: "atm", emoji: "🏧" },
  { kind: "parking", emoji: "🅿" },
];

const RADII = [800, 1800, 3500];

/** Emergency and comfort map: nearest hospital, police, toilet, food and help. */
export default function HelpExplorer() {
  const { lang, t } = useI18n();
  const geo = useGeolocation(true);
  const [kinds, setKinds] = useState<string[]>(["hospital", "police", "toilets", "restaurant"]);
  const [radius, setRadius] = useState(1800);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [helplines, setHelplines] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("");
  const [routes, setRoutes] = useState<Record<string, string>>({});

  const origin = geo.position ?? NAIHATI_CENTER;

  const load = useCallback(async () => {
    setLoading(true);
    const [nearby, help] = await Promise.all([
      fetchNearby(origin.lat, origin.lng, kinds, radius),
      fetchNearby(origin.lat, origin.lng, ["help"], 40000),
    ]);
    setFacilities(nearby.facilities);
    setHelplines(help.facilities);
    setSource(nearby.source);
    setLoading(false);
  }, [origin.lat, origin.lng, kinds, radius]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, Facility[]>();
    for (const facility of facilities) {
      const list = map.get(String(facility.kind)) ?? [];
      list.push(facility);
      map.set(String(facility.kind), list);
    }
    return [...map.entries()];
  }, [facilities]);

  const toggleKind = (kind: string) =>
    setKinds((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
    );

  const showRoute = useCallback(
    async (facility: Facility) => {
      const key = `${facility.kind}:${facility.name}`;
      setRoutes((current) => ({ ...current, [key]: "…" }));
      const route = await fetchRoute([origin, { lat: facility.lat, lng: facility.lng }], "foot");
      setRoutes((current) => ({
        ...current,
        [key]: route
          ? `🚶 ${formatMinutes(route.walk_min, lang)} · ${formatDistance(route.distance_m, lang)}`
          : lang === "bn"
            ? "পথ পাওয়া যায়নি"
            : "Route unavailable",
      }));
    },
    [lang, origin],
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-3 pt-4 pb-28">
      <h1 className="text-[21px] font-bold text-white">{t("helpTitle")}</h1>
      <p className="mt-1 text-[12.5px] text-white/60">{t("helpIntro")}</p>

      <section className="glass mt-3 rounded-3xl p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-semibold text-white">{t("emergencyNumbers")}</p>
          <span className="text-[11px] text-white/45">
            {geo.position
              ? lang === "bn"
                ? "আপনার লোকেশন থেকে"
                : "from your location"
              : lang === "bn"
                ? "নৈহাটি কেন্দ্র ধরে"
                : "from Naihati centre"}
          </span>
        </div>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {helplines.map((line) => (
            <a
              key={line.name}
              href={line.phone ? `tel:${line.phone}` : undefined}
              className="liquid-press flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] text-white/85">{line.name}</span>
                <span className="block text-[11px] text-white/45">
                  {lang === "bn" ? "ট্যাপ করে ফোন করুন" : "tap to call"}
                </span>
              </span>
              <span className="shrink-0 text-[14px] font-semibold text-gold">{line.phone ?? "—"}</span>
            </a>
          ))}
        </div>
      </section>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {KIND_CHIPS.map((chip) => (
          <Chip key={chip.kind} active={kinds.includes(chip.kind)} onClick={() => toggleKind(chip.kind)}>
            {chip.emoji} {t(chip.kind)}
          </Chip>
        ))}
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-[11.5px] text-white/45">{t("radiusLabel")}</span>
        {RADII.map((value) => (
          <Chip key={value} active={radius === value} onClick={() => setRadius(value)}>
            {formatDistance(value, lang)}
          </Chip>
        ))}
        <span className="ml-auto text-[10.5px] text-white/35">
          {t("dataSource")}:{" "}
          {source === "osm"
            ? "OpenStreetMap"
            : source === "cache"
              ? lang === "bn"
                ? "সেভ করা ডেটা"
                : "cached OSM data"
              : lang === "bn"
                ? "বিল্ট-ইন তালিকা"
                : "bundled list"}
        </span>
      </div>

      {loading ? (
        <p className="py-8 text-center text-[13px] text-white/60">{t("loading")}</p>
      ) : grouped.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-white/60">{t("noFacilities")}</p>
      ) : (
        <div className="mt-2.5 space-y-4">
          {grouped.map(([kind, list]) => (
            <section key={kind}>
              <h2 className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-white/80">
                {t(kind)}
                <span className="text-[11px] font-normal text-white/40">
                  {list.length} {t("nearbyCount")}
                </span>
              </h2>
              <div className="space-y-1.5">
                {list.slice(0, 6).map((facility) => {
                  const key = `${facility.kind}:${facility.name}`;
                  return (
                    <div key={key}>
                      <FacilityRow
                        facility={facility}
                        lang={lang}
                        onRoute={() => void showRoute(facility)}
                      />
                      {routes[key] ? (
                        <p className="mt-1 pl-12 text-[11.5px] text-gold">{routes[key]}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-white/40">
        {lang === "bn"
          ? "জরুরি অবস্থায় প্রথমে ১১২ নম্বরে ফোন করুন। হাসপাতাল ও থানার অবস্থান OpenStreetMap থেকে আসে — যাওয়ার আগে ফোন করে নিশ্চিত হয়ে নিন।"
          : "In an emergency call 112 first. Hospital and police locations come from OpenStreetMap — call ahead to confirm before travelling."}
      </p>
    </div>
  );
}
