"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { Chip, FacilityRow } from "@/components/map/bits";
import { fetchNearby, fetchRoute } from "@/lib/client-api";
import { NAIHATI_CENTER, formatDistance, formatMinutes } from "@/lib/geo";
import { useGeolocation } from "@/lib/hooks";
import type { Facility } from "@/lib/types";
import {
  AtmIcon,
  HospitalIcon,
  MapPinIcon,
  ParkingIcon,
  PharmacyIcon,
  PhoneIcon,
  PoliceIcon,
  RestaurantIcon,
  ToiletIcon,
  TrainIcon,
  WalkIcon,
} from "@/components/Icons";

function FacilityChipIcon({ kind }: { kind: string }) {
  const size = 13;
  switch (kind) {
    case "hospital": return <HospitalIcon size={size} className="stroke-current" />;
    case "police": return <PoliceIcon size={size} className="stroke-current" />;
    case "toilets": return <ToiletIcon size={size} className="stroke-current" />;
    case "restaurant": return <RestaurantIcon size={size} className="stroke-current" />;
    case "pharmacy": return <PharmacyIcon size={size} className="stroke-current" />;
    case "railway": return <TrainIcon size={size} className="stroke-current" />;
    case "atm": return <AtmIcon size={size} className="stroke-current" />;
    case "parking": return <ParkingIcon size={size} className="stroke-current" />;
    default: return <MapPinIcon size={size} className="stroke-current" />;
  }
}

const KIND_CHIPS: { kind: string }[] = [
  { kind: "hospital" },
  { kind: "police" },
  { kind: "toilets" },
  { kind: "restaurant" },
  { kind: "pharmacy" },
  { kind: "railway" },
  { kind: "atm" },
  { kind: "parking" },
];

const RADII = [800, 1800, 3500];

/** Emergency and safety map: nearest hospital, police, toilet, food and help. */
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
      <section className="glass mt-3.5 rounded-3xl p-3.5 border border-white/10">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-semibold text-white">{t("emergencyNumbers")}</p>
          <span className="text-[11px] text-white/45">
            {geo.position
              ? lang === "bn"
                ? "আপনার অবস্থান থেকে"
                : "from your location"
              : lang === "bn"
                ? "নৈহাটি কেন্দ্র"
                : "Naihati Center"}
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {helplines.map((item) => (
            <a
              key={item.name}
              href={`tel:${item.phone}`}
              className="liquid-press flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-center transition-colors hover:border-gold/40 hover:bg-white/[0.08]"
            >
              <span className="text-[11px] text-white/60">{item.name}</span>
              <span className="mt-1 flex items-center gap-1 text-[13px] font-bold text-gold">
                <PhoneIcon size={12} className="stroke-gold" />
                <span>{item.phone}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Filters */}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {KIND_CHIPS.map((chip) => (
          <Chip
            key={chip.kind}
            active={kinds.includes(chip.kind)}
            onClick={() => toggleKind(chip.kind)}
          >
            <FacilityChipIcon kind={chip.kind} />
            <span>{t(chip.kind)}</span>
          </Chip>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <p className="text-[11px] text-white/50">
          {facilities.length} {lang === "bn" ? "জায়গা পাওয়া গেছে" : "places found"}
          {source === "seed"
            ? ` · ${lang === "bn" ? "যাচাইকৃত স্থানীয় তালিকা" : "verified local list"}`
            : ""}
        </p>
        <div className="flex gap-1">
          {RADII.map((r) => (
            <Chip key={r} active={radius === r} onClick={() => setRadius(r)}>
              {r < 1000 ? `${r}m` : `${r / 1000}km`}
            </Chip>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {grouped.map(([kind, items]) => (
            <section key={kind}>
              <div className="flex items-center gap-1.5 px-1 pb-1.5">
                <FacilityChipIcon kind={kind} />
                <h2 className="text-[12.5px] font-semibold text-white/80">
                  {t(kind)} · {items.length}
                </h2>
              </div>
              <div className="space-y-1.5">
                {items.map((facility) => {
                  const routeText = routes[`${facility.kind}:${facility.name}`];
                  return (
                    <div key={`${facility.kind}-${facility.name}`} className="space-y-1">
                      <FacilityRow
                        facility={facility}
                        lang={lang}
                        onRoute={() => void showRoute(facility)}
                      />
                      {routeText ? (
                        <p className="flex items-center gap-1.5 px-3 text-[11px] text-gold">
                          <WalkIcon size={12} className="stroke-gold" />
                          <span>{routeText}</span>
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
