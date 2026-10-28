"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { Chip, FacilityRow } from "@/components/map/bits";
import { fetchNearby, fetchRoute } from "@/lib/client-api";
import { NAIHATI_CENTER, formatDistance, formatMinutes, haversine } from "@/lib/geo";
import { useGeolocation } from "@/lib/hooks";
import type { Facility, LatLng } from "@/lib/types";
import seedFacilitiesJson from "@/data/facilities.seed.json";
import {
  AtmIcon,
  HospitalIcon,
  MapPinIcon,
  NavigationIcon,
  ParkingIcon,
  PharmacyIcon,
  PhoneIcon,
  PoliceIcon,
  RestaurantIcon,
  ToiletIcon,
  TrainIcon,
  WalkIcon,
} from "@/components/Icons";

const SEED_FACILITIES = ((seedFacilitiesJson as any).facilities ?? []) as Facility[];
const INITIAL_HELPLINES = SEED_FACILITIES.filter((f) => f.kind === "help");
const INITIAL_FACILITIES = SEED_FACILITIES.filter((f) => f.kind !== "help");

function FacilityChipIcon({ kind }: { kind: string }) {
  const size = 13;
  switch (kind) {
    case "hospital":
      return <HospitalIcon size={size} className="stroke-current" />;
    case "police":
      return <PoliceIcon size={size} className="stroke-current" />;
    case "toilets":
      return <ToiletIcon size={size} className="stroke-current" />;
    case "restaurant":
      return <RestaurantIcon size={size} className="stroke-current" />;
    case "pharmacy":
      return <PharmacyIcon size={size} className="stroke-current" />;
    case "railway":
      return <TrainIcon size={size} className="stroke-current" />;
    case "atm":
      return <AtmIcon size={size} className="stroke-current" />;
    case "parking":
      return <ParkingIcon size={size} className="stroke-current" />;
    default:
      return <MapPinIcon size={size} className="stroke-current" />;
  }
}

const KIND_CHIPS: { kind: string }[] = [
  { kind: "hospital" },
  { kind: "police" },
  { kind: "toilets" },
  { kind: "pharmacy" },
  { kind: "railway" },
  { kind: "restaurant" },
  { kind: "atm" },
  { kind: "parking" },
];

const RADII = [1800, 3500, 5000];

/** Emergency and safety directory: nearest hospital, police, toilet, food and help. */
export default function HelpExplorer() {
  const { lang, t } = useI18n();
  const geo = useGeolocation(true);
  const [kinds, setKinds] = useState<string[]>([
    "hospital",
    "police",
    "toilets",
    "pharmacy",
    "railway",
    "restaurant",
  ]);
  const [radius, setRadius] = useState(3500);

  // Initialize immediately with bundled seed data for instant 0ms initial load
  const [facilities, setFacilities] = useState<Facility[]>(INITIAL_FACILITIES);
  const [helplines, setHelplines] = useState<Facility[]>(INITIAL_HELPLINES);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>("seed");
  const [routes, setRoutes] = useState<Record<string, string>>({});

  const origin = geo.position ?? NAIHATI_CENTER;
  const lastFetchedOriginRef = useRef<LatLng | null>(null);

  const load = useCallback(async (forced = false) => {
    // Only re-fetch if forced or if origin has moved more than 150 meters
    if (
      !forced &&
      lastFetchedOriginRef.current &&
      haversine(origin, lastFetchedOriginRef.current) < 150
    ) {
      return;
    }

    lastFetchedOriginRef.current = origin;
    setLoading(true);

    try {
      const [nearby, help] = await Promise.all([
        fetchNearby(origin.lat, origin.lng, kinds, radius),
        fetchNearby(NAIHATI_CENTER.lat, NAIHATI_CENTER.lng, ["help"], 6000),
      ]);
      if (nearby.facilities.length > 0) {
        setFacilities(nearby.facilities);
        setSource(nearby.source);
      }
      if (help.facilities.length > 0) {
        setHelplines(help.facilities);
      }
    } catch (err) {
      console.warn("Help data load fallback to seed", err);
    } finally {
      setLoading(false);
    }
  }, [origin, kinds, radius]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, Facility[]>();
    for (const facility of facilities) {
      if (!kinds.includes(facility.kind)) continue;
      const list = map.get(String(facility.kind)) ?? [];
      list.push(facility);
      map.set(String(facility.kind), list);
    }
    return [...map.entries()];
  }, [facilities, kinds]);

  const toggleKind = (kind: string) =>
    setKinds((current) =>
      current.includes(kind)
        ? current.length > 1
          ? current.filter((item) => item !== kind)
          : current
        : [...current, kind],
    );

  const showRoute = useCallback(
    async (facility: Facility) => {
      const key = `${facility.kind}:${facility.name}`;
      setRoutes((current) => ({ ...current, [key]: "…" }));
      const route = await fetchRoute([origin, { lat: facility.lat, lng: facility.lng }], "foot");
      setRoutes((current) => ({
        ...current,
        [key]: route
          ? `${formatMinutes(route.walk_min, lang)} · ${formatDistance(route.distance_m, lang)}`
          : lang === "bn"
            ? "পথ পাওয়া যায়নি"
            : "Route unavailable",
      }));
    },
    [lang, origin],
  );

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
      <h1 className="text-[20px] font-bold text-white">{t("helpTitle")}</h1>
      <p className="mt-0.5 text-[12px] text-white/55">{t("helpIntro")}</p>

      {/* Emergency numbers */}
      <section className="glass mt-3.5 rounded-3xl border border-white/10 p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-semibold text-white">{t("emergencyNumbers")}</p>
          <span className="text-[11px] text-white/45">
            {geo.position
              ? lang === "bn"
                ? "আপনার অবস্থান থেকে"
                : "from your location"
              : lang === "bn"
                ? "নৈহাটি স্টেশন কেন্দ্র"
                : "Naihati center"}
          </span>
        </div>

        <div className="mt-2.5 divide-y divide-white/5">
          {helplines.map((item) => (
            <div
              key={`${item.name}-${item.phone}`}
              className="flex items-center justify-between py-2 text-[12.5px]"
            >
              <div>
                <p className="font-medium text-white">{item.name}</p>
                {item.address ? <p className="text-[11px] text-white/50">{item.address}</p> : null}
              </div>
              {item.phone ? (
                <a
                  href={`tel:${item.phone}`}
                  className="liquid-press inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[12px] font-bold text-gold hover:bg-gold hover:text-ink"
                >
                  <PhoneIcon size={12} className="stroke-current" />
                  <span>{item.phone}</span>
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Facility filters */}
      <section className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-semibold text-white">
            {lang === "bn" ? "প্রয়োজনীয় পরিষেবা ফিল্টার" : "Filter essential stops"}
          </p>
          <div className="flex items-center gap-1 text-[11px]">
            {RADII.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setRadius(val)}
                className={`liquid-press rounded-full px-2 py-0.5 font-medium transition-colors ${
                  radius === val
                    ? "bg-gold text-ink font-bold"
                    : "border border-white/10 bg-white/5 text-white/60"
                }`}
              >
                {val >= 1000 ? `${val / 1000} km` : `${val} m`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {KIND_CHIPS.map((chip) => {
            const active = kinds.includes(chip.kind);
            return (
              <button
                key={chip.kind}
                type="button"
                onClick={() => toggleKind(chip.kind)}
                className={`liquid-press inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white border border-white/25 shadow-sm"
                    : "border border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/8"
                }`}
              >
                <FacilityChipIcon kind={chip.kind} />
                <span>{t(chip.kind as Parameters<typeof t>[0])}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Directory list */}
      <section className="mt-4 space-y-4">
        {loading && facilities.length === 0 ? (
          <div className="space-y-2 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center text-[13px] text-white/55">
            {t("noFacilitiesInRange")}
          </div>
        ) : (
          grouped.map(([kind, list]) => (
            <div key={kind}>
              <div className="flex items-center gap-2 px-1">
                <FacilityChipIcon kind={kind} />
                <h2 className="text-[13.5px] font-bold text-white">
                  {t(kind as Parameters<typeof t>[0])} ({list.length})
                </h2>
              </div>

              <div className="mt-2 divide-y divide-white/5 rounded-3xl border border-white/10 bg-white/[0.03] p-2">
                {list.map((facility) => {
                  const key = `${facility.kind}:${facility.name}`;
                  const routeInfo = routes[key];
                  return (
                    <FacilityRow
                      key={key}
                      facility={facility}
                      routeInfo={routeInfo}
                      lang={lang}
                      onRoute={() => void showRoute(facility)}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
