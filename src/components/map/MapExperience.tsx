"use client";

import {
  AtmIcon,
  CarIcon,
  CloseIcon,
  CompassIcon,
  CrosshairIcon,
  HospitalIcon,
  ListIcon,
  MapIcon,
  MapPinIcon,
  MinusIcon,
  MoonIcon,
  NavigationIcon,
  ParkingIcon,
  PharmacyIcon,
  PhoneIcon,
  PlusIcon,
  PoliceIcon,
  RestaurantIcon,
  SearchIcon,
  ShareIcon,
  SunIcon,
  TempleIcon,
  ToiletIcon,
  TrainIcon,
  TurnArrowIcon,
  WalkIcon,
} from "@/components/Icons";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { useI18n } from "@/components/LanguageProvider";
import {
  Chip,
  CrowdPill,
  CrowdReporter,
  CategoryTag,
  PandalRow,
} from "@/components/map/bits";
import { levelLabel, levelReason, type CrowdLevel } from "@/lib/crowd";
import { fetchNearby, fetchRoute, reportCrowd } from "@/lib/client-api";
import {
  NAIHATI_CENTER,
  formatDistance,
  formatMinutes,
  haversine,
  nearestTo,
  roughWalkMinutes,
  driveMinutes,
} from "@/lib/geo";
import { facilityLabel } from "@/lib/i18n";
import { matchesQuery, pandalHaystack } from "@/lib/search";
import { useCrowdLevels, useGeolocation, usePandals } from "@/lib/hooks";
import {
  PANDAL_CATEGORIES,
  type Facility,
  type FacilityKind,
  type LatLng,
  type PandalCategory,
  type RouteResult,
} from "@/lib/types";

const LeafletCanvas = dynamic(() => import("./LeafletCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-ink">
      <div className="flex flex-col items-center gap-3">
        <span className="size-9 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
        <p className="text-[13px] font-medium text-white/70">Loading Naihati Live Map…</p>
      </div>
    </div>
  ),
});

function FacilityChipIcon({ kind, size = 14 }: { kind: string; size?: number }) {
  switch (kind) {
    case "hospital":
      return <HospitalIcon size={size} className="stroke-current" />;
    case "police":
      return <PoliceIcon size={size} className="stroke-current" />;
    case "toilets":
      return <ToiletIcon size={size} className="stroke-current" />;
    case "pharmacy":
      return <PharmacyIcon size={size} className="stroke-current" />;
    case "railway":
      return <TrainIcon size={size} className="stroke-current" />;
    case "help":
      return <PhoneIcon size={size} className="stroke-current" />;
    case "restaurant":
      return <RestaurantIcon size={size} className="stroke-current" />;
    case "atm":
      return <AtmIcon size={size} className="stroke-current" />;
    case "parking":
      return <ParkingIcon size={size} className="stroke-current" />;
    default:
      return <MapPinIcon size={size} className="stroke-current" />;
  }
}

const FACILITY_CHIPS: { kind: string; color: string }[] = [
  { kind: "hospital", color: "#ef4444" },
  { kind: "police", color: "#0284c7" },
  { kind: "toilets", color: "#0d9488" },
  { kind: "pharmacy", color: "#10b981" },
  { kind: "railway", color: "#6366f1" },
  { kind: "parking", color: "#3b82f6" },
  { kind: "atm", color: "#8b5cf6" },
  { kind: "restaurant", color: "#f97316" },
];

const DEFAULT_FACILITY_KINDS = [
  "hospital",
  "police",
  "toilets",
  "pharmacy",
  "railway",
  "parking",
];

function facilityKey(facility: Facility): string {
  return facility.osm_id ?? `${facility.kind}:${facility.name}:${facility.lat.toFixed(5)},${facility.lng.toFixed(5)}`;
}

function stepDirection(text: string): "left" | "right" | "straight" {
  const lower = text.toLowerCase();
  if (lower.includes("left") || lower.includes("বাঁ")) return "left";
  if (lower.includes("right") || lower.includes("ডান")) return "right";
  return "straight";
}

export default function MapExperience() {
  const { lang, t } = useI18n();
  const { pandals, loading } = usePandals();
  const geo = useGeolocation(true);
  const { levels, setLevel } = useCrowdLevels(
    useMemo(() => pandals.map((p) => p.slug), [pandals]),
  );

  const mapRef = useRef<LeafletMap | null>(null);
  const lastRoutedOriginRef = useRef<LatLng | null>(null);

  const [manualPosition, setManualPosition] = useState<LatLng | null>(null);
  const [follow, setFollow] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [categories, setCategories] = useState<PandalCategory[]>([...PANDAL_CATEGORIES]);
  const [facilityKinds, setFacilityKinds] = useState<string[]>(DEFAULT_FACILITY_KINDS);
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);

  // Active pin selection: either a Pandal slug OR an Emergency Facility
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeFacility, setActiveFacility] = useState<Facility | null>(null);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [showListDrawer, setShowListDrawer] = useState(false);
  const [showStepsDrawer, setShowStepsDrawer] = useState(false);
  const [query, setQuery] = useState("");

  // Live Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeDestinationPoints, setRouteDestinationPoints] = useState<LatLng[]>([]);
  const [routeTitle, setRouteTitle] = useState<{ bn: string; en: string } | null>(null);
  const [profile, setProfile] = useState<"foot" | "car">("foot");
  const [routeLoading, setRouteLoading] = useState(false);
  const [fitRoute, setFitRoute] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);

  const gpsInNaihati = useMemo(() => {
    if (!geo.position) return false;
    return haversine(geo.position, NAIHATI_CENTER) <= 15_000;
  }, [geo.position]);

  const origin: LatLng = useMemo(() => {
    if (manualPosition) return manualPosition;
    if (geo.position && (gpsInNaihati || follow)) return geo.position;
    return NAIHATI_CENTER;
  }, [manualPosition, geo.position, gpsInNaihati, follow]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 3200);
  }, []);

  // ---------------------------------------- Load all Naihati Emergency Pins
  useEffect(() => {
    let cancelled = false;
    const allKinds = FACILITY_CHIPS.map((c) => c.kind);
    void fetchNearby(NAIHATI_CENTER.lat, NAIHATI_CENTER.lng, allKinds, 4500).then((payload) => {
      if (cancelled) return;
      setAllFacilities(payload.facilities);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleFacilities = useMemo(() => {
    return allFacilities
      .filter((f) => facilityKinds.includes(f.kind))
      .map((f) => ({
        ...f,
        distance: Math.round(haversine(origin, f)),
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [allFacilities, facilityKinds, origin]);

  // --------------------------------------------------------------- Pandals
  const withCrowd = useMemo(
    () => pandals.map((pandal) => ({ ...pandal, crowd: levels[pandal.slug] ?? pandal.crowd })),
    [pandals, levels],
  );

  const visiblePandals = useMemo(
    () => withCrowd.filter((pandal) => categories.includes(pandal.category)),
    [withCrowd, categories],
  );

  const ranked = useMemo(() => nearestTo(visiblePandals, origin), [visiblePandals, origin]);

  const searchResults = useMemo(() => {
    if (query.trim().length === 0) return ranked;
    return ranked.filter((pandal) => matchesQuery(pandalHaystack(pandal), query));
  }, [ranked, query]);

  const nextPandal = ranked[0] ?? null;
  const activePandal = activeSlug ? ranked.find((p) => p.slug === activeSlug) ?? null : null;

  // --------------------------------------------------------- Live Routing
  const calculateLiveRoute = useCallback(
    async (
      startPoint: LatLng,
      destinations: LatLng[],
      mode: "foot" | "car",
      shouldFitBounds: boolean,
    ) => {
      if (destinations.length === 0) return;
      setRouteLoading(true);
      const points = [startPoint, ...destinations];
      const result = await fetchRoute(points, mode);
      setRoute(result);
      setIsNavigating(true);
      setFitRoute(shouldFitBounds);
      lastRoutedOriginRef.current = startPoint;
      setRouteLoading(false);
    },
    [],
  );

  const startDirectionsToPandal = useCallback(
    (slug: string) => {
      const target = pandals.find((p) => p.slug === slug);
      if (!target) return;
      setActiveSlug(slug);
      setActiveFacility(null);
      setShowFullDetails(false);
      setShowListDrawer(false);
      setIsNavigating(true);
      const dest = [{ lat: target.lat, lng: target.lng }];
      setRouteDestinationPoints(dest);
      setRouteTitle({ bn: target.name_bn, en: target.name_en });
      void calculateLiveRoute(origin, dest, profile, true);
    },
    [pandals, origin, profile, calculateLiveRoute],
  );

  const startDirectionsToFacility = useCallback(
    (facility: Facility) => {
      setActiveFacility(facility);
      setActiveSlug(null);
      setShowFullDetails(false);
      setShowListDrawer(false);
      setIsNavigating(true);
      const dest = [{ lat: facility.lat, lng: facility.lng }];
      setRouteDestinationPoints(dest);
      setRouteTitle({ bn: facility.name, en: facility.name });
      void calculateLiveRoute(origin, dest, profile, true);
    },
    [origin, profile, calculateLiveRoute],
  );

  const clearNavigation = useCallback(() => {
    setIsNavigating(false);
    setRoute(null);
    setRouteDestinationPoints([]);
    setRouteTitle(null);
    setFitRoute(false);
    setShowStepsDrawer(false);
    setFollow(false);
  }, []);

  const handleProfileChange = useCallback(
    (mode: "foot" | "car") => {
      setProfile(mode);
      if (routeDestinationPoints.length > 0) {
        void calculateLiveRoute(origin, routeDestinationPoints, mode, false);
      }
    },
    [calculateLiveRoute, origin, routeDestinationPoints],
  );

  // Live GPS route auto-refresh as user walks (> 18 meters movement)
  useEffect(() => {
    if (!isNavigating || routeDestinationPoints.length === 0 || !lastRoutedOriginRef.current) return;
    const movedMeters = haversine(origin, lastRoutedOriginRef.current);
    if (movedMeters >= 18) {
      void calculateLiveRoute(origin, routeDestinationPoints, profile, false);
    }
  }, [isNavigating, origin, routeDestinationPoints, profile, calculateLiveRoute]);

  // -------------------------------------------------- Deep links (QR / share)
  const handledDeepLinkRef = useRef(false);
  useEffect(() => {
    if (handledDeepLinkRef.current || pandals.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const pandalParam = params.get("pandal");
    const stopsParam = params.get("stops");
    const categoryParam = params.get("cat");
    const facilityParam = params.get("facility");
    const followParam = params.get("follow");
    const facLat = Number(params.get("facilityLat"));
    const facLng = Number(params.get("facilityLng"));
    const facName = params.get("facilityName");
    const facKind = params.get("facilityKind") ?? "help";

    if (followParam === "1") {
      setFollow(true);
    }
    if (categoryParam && PANDAL_CATEGORIES.includes(categoryParam as PandalCategory)) {
      setCategories([categoryParam as PandalCategory]);
    }
    if (facilityParam) {
      setFacilityKinds((current) => [...new Set([...current, facilityParam])]);
    }

    if (Number.isFinite(facLat) && Number.isFinite(facLng) && facName) {
      handledDeepLinkRef.current = true;
      const targetFacility: Facility = {
        kind: facKind as FacilityKind,
        name: facName,
        lat: facLat,
        lng: facLng,
        source: "seed",
      };
      setFacilityKinds((current) => [...new Set([...current, facKind])]);
      setActiveFacility(targetFacility);
      if (params.get("route") === "1") {
        startDirectionsToFacility(targetFacility);
      }
      return;
    }

    if (stopsParam) {
      const slugs = stopsParam.split(",").filter(Boolean);
      const targets = slugs
        .map((s) => pandals.find((p) => p.slug === s))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
      if (targets.length > 0) {
        handledDeepLinkRef.current = true;
        setActiveSlug(targets[0].slug);
        setIsNavigating(true);
        const dests = targets.map((t) => ({ lat: t.lat, lng: t.lng }));
        setRouteDestinationPoints(dests);
        setRouteTitle({
          bn:
            targets.length > 1
              ? `${targets.length}টি প্যান্ডেল পরিক্রমা`
              : targets[0].name_bn,
          en:
            targets.length > 1
              ? `${targets.length}-Stop Parikrama Route`
              : targets[0].name_en,
        });
        void calculateLiveRoute(origin, dests, profile, true);
      }
    } else if (pandalParam) {
      const target = pandals.find((p) => p.slug === pandalParam);
      if (target) {
        handledDeepLinkRef.current = true;
        setActiveSlug(pandalParam);
        if (params.get("route") === "1") {
          startDirectionsToPandal(pandalParam);
        }
      }
    } else {
      handledDeepLinkRef.current = true;
    }
  }, [
    pandals,
    origin,
    profile,
    calculateLiveRoute,
    startDirectionsToPandal,
    startDirectionsToFacility,
  ]);

  // -------------------------------------------------- Crowd report & share
  const handleReport = useCallback(
    async (slug: string, level: 1 | 2 | 3 | 4) => {
      setReportBusy(true);
      const result = await reportCrowd(slug, level);
      setReportBusy(false);
      if (result.ok && result.info) {
        setLevel(slug, result.info);
        showToast(t("reportThanks"));
      } else if (result.reason === "rate-limited") {
        showToast(t("reportCooldown"));
      } else {
        showToast(lang === "bn" ? "রিপোর্ট পাঠানো গেল না" : "Could not send the report");
      }
    },
    [lang, setLevel, showToast, t],
  );

  const share = useCallback(
    async (slug: string) => {
      const url = `${window.location.origin}/map?pandal=${slug}`;
      const title = t("appName");
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
          return;
        } catch {
          // user dismissed
        }
      }
      await navigator.clipboard?.writeText(url);
      showToast(t("copied"));
    },
    [showToast, t],
  );

  const toggleCategory = (category: PandalCategory) => {
    setCategories((current) =>
      current.includes(category)
        ? current.length > 1
          ? current.filter((item) => item !== category)
          : current
        : [...current, category],
    );
  };

  const toggleFacility = (kind: string) => {
    setFacilityKinds((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
    );
  };

  const primaryStep = route?.steps?.[0] ?? null;
  const activeMinutes = route
    ? profile === "foot"
      ? route.walk_min
      : route.drive_min
    : 0;

  const arrivalTimeText = useMemo(() => {
    if (!route) return "";
    const arrival = new Date(Date.now() + activeMinutes * 60_000);
    return arrival.toLocaleTimeString(lang === "bn" ? "bn-IN" : "en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [route, activeMinutes, lang]);

  return (
    <div className="fixed inset-x-0 top-14 bottom-[var(--nkp-bottom-ui)] z-10 overflow-hidden bg-ink">
      {/* ===================================================================
          INTERACTIVE NAIHATI MAP CANVAS
         =================================================================== */}
      <LeafletCanvas
        className="absolute inset-0 h-full w-full"
        pandals={visiblePandals}
        facilities={visibleFacilities}
        user={{
          lat: origin.lat,
          lng: origin.lng,
          accuracy: manualPosition ? null : geo.accuracy,
        }}
        follow={follow}
        route={route}
        activeSlug={activeSlug}
        activeFacilityKey={activeFacility ? facilityKey(activeFacility) : null}
        center={NAIHATI_CENTER}
        zoom={15}
        nightMode={nightMode}
        fitRoute={fitRoute}
        lang={lang}
        onUserPan={() => setFollow(false)}
        onSelectPandal={(slug) => {
          setActiveSlug(slug);
          setActiveFacility(null);
          setIsNavigating(false);
          setShowFullDetails(false);
          setShowListDrawer(false);
          setFitRoute(false);
        }}
        onSelectFacility={(facility) => {
          setActiveFacility(facility);
          setActiveSlug(null);
          setIsNavigating(false);
          setShowFullDetails(false);
          setShowListDrawer(false);
          setFitRoute(false);
        }}
        onMapClick={(point) => {
          if (showListDrawer) {
            setShowListDrawer(false);
            return;
          }
          if (!geo.position && !activePandal && !activeFacility) {
            setManualPosition(point);
            showToast(
              lang === "bn"
                ? "ম্যাপে আপনার অবস্থান আপডেট হয়েছে"
                : "Your location on map updated",
            );
          }
        }}
        onReady={(map) => {
          mapRef.current = map;
        }}
      />

      {/* ===================================================================
          TOP BAR: EITHER GOOGLE MAPS LIVE NAVIGATION BANNER OR SEARCH/FILTERS
         =================================================================== */}
      {isNavigating && route ? (
        <div className="pointer-events-none absolute inset-x-0 top-3.5 sm:top-4.5 z-[600] px-2.5 sm:px-4">
          <div className="pointer-events-auto mx-auto max-w-xl overflow-hidden rounded-3xl border border-emerald-400/35 bg-[#091e1a]/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-ink shadow-md">
                <TurnArrowIcon
                  size={24}
                  direction={
                    primaryStep
                      ? stepDirection(primaryStep.instruction_en)
                      : "straight"
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
                    <span className="size-1.5 animate-ping rounded-full bg-emerald-400" />
                    {lang === "bn" ? "লাইভ নেভিগেশন" : "LIVE NAVIGATION"}
                  </span>
                  {primaryStep && primaryStep.distance > 0 ? (
                    <span className="text-[12px] font-bold text-gold">
                      {formatDistance(primaryStep.distance, lang)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-[14.5px] font-bold text-white">
                  {primaryStep
                    ? lang === "bn"
                      ? primaryStep.instruction_bn
                      : primaryStep.instruction_en
                    : lang === "bn"
                      ? "চিহ্নিত পথ অনুসরণ করুন"
                      : "Follow highlighted route"}
                </p>
                {routeTitle ? (
                  <p className="truncate text-[11.5px] text-white/65">
                    {lang === "bn" ? "গন্তব্য: " : "To: "}
                    <span className="font-medium text-gold">
                      {lang === "bn" ? routeTitle.bn : routeTitle.en}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {route.steps.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowStepsDrawer((v) => !v)}
                    className="liquid-press rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 text-[11.5px] font-semibold text-white hover:bg-white/15"
                  >
                    {lang === "bn" ? "ধাপ" : "Steps"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={clearNavigation}
                  aria-label="Exit navigation"
                  className="liquid-press grid size-9 place-items-center rounded-xl border border-rose-400/30 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>

            {showStepsDrawer && route.steps.length > 0 ? (
              <div className="max-h-60 overflow-y-auto border-t border-white/10 bg-ink/90 px-3.5 py-2.5 no-scrollbar">
                <ol className="space-y-2">
                  {route.steps.slice(0, 30).map((step, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl bg-white/[0.04] px-2.5 py-2 text-[12px] text-white/85"
                    >
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/25 text-[10px] font-bold text-emerald-300">
                        {idx + 1}
                      </span>
                      <span className="flex-1">
                        {lang === "bn" ? step.instruction_bn : step.instruction_en}
                      </span>
                      {step.distance > 10 ? (
                        <span className="shrink-0 text-[11px] font-semibold text-gold">
                          {formatDistance(step.distance, lang)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 top-3.5 sm:top-4.5 z-[600] flex flex-col gap-2 px-2.5 sm:px-4">
          {/* Search & Day/Night Toggle */}
          <div className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center gap-2">
            <div className="flex h-11 sm:h-12 flex-1 items-center gap-2.5 rounded-2xl border border-white/15 bg-[#0e071c]/80 px-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all focus-within:border-gold/50 focus-within:ring-2 focus-within:ring-gold/20">
              <SearchIcon size={16} className="shrink-0 text-gold" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (event.target.value.length > 0) setShowListDrawer(true);
                }}
                placeholder={t("searchPlaceholder")}
                className="h-full w-full bg-transparent text-[13.5px] text-white placeholder:text-white/45 focus:outline-none"
                inputMode="search"
              />
              {query.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-white/55 hover:text-white"
                  aria-label="Clear search"
                >
                  <CloseIcon size={14} />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                if (showListDrawer) {
                  setShowListDrawer(false);
                } else {
                  setActiveSlug(null);
                  setActiveFacility(null);
                  setShowListDrawer(true);
                }
              }}
              className="liquid-press flex h-11 sm:h-12 shrink-0 items-center gap-1.5 rounded-2xl border border-white/15 bg-[#0e071c]/80 px-3.5 text-[12.5px] font-semibold text-gold shadow-xl backdrop-blur-xl hover:border-gold/40 hover:bg-white/10"
              title={showListDrawer ? (lang === "bn" ? "ম্যাপ দেখুন" : "View Map") : (lang === "bn" ? "তালিকা দেখুন" : "View List")}
            >
              {showListDrawer ? <MapIcon size={16} /> : <ListIcon size={16} />}
              <span>{showListDrawer ? (lang === "bn" ? "ম্যাপ" : "Map") : (lang === "bn" ? "তালিকা" : "List")}</span>
            </button>

            <button
              type="button"
              onClick={() => setNightMode((value) => !value)}
              title={t("nightMap")}
              className="liquid-press grid size-11 sm:size-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-[#0e071c]/80 text-gold shadow-xl backdrop-blur-xl hover:border-gold/40 hover:bg-white/10"
            >
              {nightMode ? <SunIcon size={17} /> : <MoonIcon size={17} />}
            </button>
          </div>

          {/* Filter Chips: Pandal Categories + Emergency Services */}
          <div className="pointer-events-auto mx-auto flex w-full max-w-2xl gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {PANDAL_CATEGORIES.map((category) => (
              <Chip
                key={category}
                active={categories.includes(category)}
                onClick={() => toggleCategory(category)}
                color={
                  category === "heritage"
                    ? "var(--color-heritage)"
                    : category === "large"
                      ? "var(--color-large)"
                      : "var(--color-small)"
                }
                textColor={category === "large" ? "#ffffff" : "#07060e"}
              >
                <TempleIcon size={12} />
                <span>{t(category)}</span>
              </Chip>
            ))}
            <span className="mx-0.5 my-1 w-px shrink-0 bg-white/20" />
            {FACILITY_CHIPS.map((chip) => (
              <Chip
                key={chip.kind}
                active={facilityKinds.includes(chip.kind)}
                onClick={() => toggleFacility(chip.kind)}
                color={chip.color}
                textColor="#ffffff"
                title={t(chip.kind)}
              >
                <FacilityChipIcon kind={chip.kind} size={13} />
                <span>{t(chip.kind)}</span>
              </Chip>
            ))}
          </div>

          {/* Live GPS Status Pill */}
          <div className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center justify-start">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0b0514]/85 px-2.5 py-0.5 text-[10.5px] font-medium text-white/85 shadow-md backdrop-blur-md">
              <span
                className={`size-1.5 rounded-full ${
                  geo.status === "granted"
                    ? "animate-pulse bg-emerald-400 shadow-[0_0_6px_#34d399]"
                    : "bg-sky-400"
                }`}
              />
              <span className="truncate max-w-[240px] sm:max-w-none">
                {manualPosition
                  ? lang === "bn"
                    ? "নির্বাচিত অবস্থান সক্রিয়"
                    : "Custom spot active"
                  : geo.status === "granted" && gpsInNaihati
                    ? lang === "bn"
                      ? "লাইভ জিপিএস সক্রিয় · আপনি ম্যাপে আছেন"
                      : "Live GPS Active · Showing you on map"
                    : geo.status === "granted" && !gpsInNaihati
                      ? lang === "bn"
                        ? "নৈহাটি স্টেশন মোড"
                        : "Naihati Station Mode"
                      : lang === "bn"
                        ? "যেকোনো পিনে ক্লিক করে রুট দেখুন"
                        : "Tap any pin for live route"}
              </span>
              {geo.status !== "granted" ? (
                <button
                  type="button"
                  onClick={() => {
                    geo.request();
                    showToast(t("locating"));
                  }}
                  className="ml-1 font-semibold text-gold hover:underline"
                >
                  {lang === "bn" ? "জিপিএস অন" : "GPS"}
                </button>
              ) : null}
              {manualPosition ? (
                <button
                  type="button"
                  onClick={() => setManualPosition(null)}
                  className="ml-1 font-semibold text-gold hover:underline"
                >
                  {lang === "bn" ? "রিসেট" : "Reset"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          FLOATING RIGHT MAP CONTROLS (RECENTER NAIHATI / MY GPS / ZOOM)
         =================================================================== */}
      <div className="pointer-events-auto absolute right-2.5 bottom-36 z-[600] flex flex-col gap-2 sm:right-4">
        <button
          type="button"
          onClick={() => {
            setFollow(false);
            setFitRoute(false);
            mapRef.current?.flyTo([NAIHATI_CENTER.lat, NAIHATI_CENTER.lng], 15, {
              duration: 0.7,
            });
            showToast(lang === "bn" ? "নৈহাটি ম্যাপ" : "Centered on Naihati");
          }}
          className="glass-strong liquid-press grid size-10 place-items-center rounded-2xl text-gold shadow-xl"
          title={lang === "bn" ? "নৈহাটি ম্যাপ" : "Center on Naihati"}
        >
          <CompassIcon size={18} />
        </button>

        <button
          type="button"
          onClick={() => {
            setFitRoute(false);
            if (geo.position) {
              setFollow(true);
              mapRef.current?.flyTo([origin.lat, origin.lng], 17, { duration: 0.7 });
            } else {
              geo.request();
              mapRef.current?.flyTo([origin.lat, origin.lng], 16, { duration: 0.7 });
              showToast(t("locating"));
            }
          }}
          className={`glass-strong liquid-press grid size-10 place-items-center rounded-2xl shadow-xl ${
            follow ? "border-sky-400 text-sky-400" : "text-white"
          }`}
          title={t("recenter")}
        >
          <CrosshairIcon size={18} />
        </button>

        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="glass-strong liquid-press grid size-10 place-items-center rounded-2xl text-white shadow-xl"
          aria-label="Zoom in"
        >
          <PlusIcon size={17} />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="glass-strong liquid-press grid size-10 place-items-center rounded-2xl text-white shadow-xl"
          aria-label="Zoom out"
        >
          <MinusIcon size={17} />
        </button>
      </div>

      {/* ===================================================================
          BOTTOM UI
         =================================================================== */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[650] px-2.5 sm:px-4">
        <div className="pointer-events-auto mx-auto w-full max-w-xl">
          {isNavigating && route ? (
            /* 1. GOOGLE MAPS LIVE NAVIGATION BOTTOM BAR */
            <div className="glass-strong sheet-enter rounded-3xl border border-gold/35 p-3.5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[22px] leading-none font-extrabold text-emerald-400">
                        {formatMinutes(activeMinutes, lang)}
                      </span>
                      <span className="text-[15px] font-bold text-white/90">
                        ({formatDistance(route.distance_m, lang)})
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-white/60">
                      {lang === "bn"
                        ? `পৌঁছাবেন ~ ${arrivalTimeText} · লাইভ জিপিএস রুট`
                        : `Arrive ~ ${arrivalTimeText} · Live GPS Route`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleProfileChange("foot")}
                    className={`liquid-press flex items-center gap-1 rounded-xl px-2.5 py-2 text-[12px] font-semibold transition-colors ${
                      profile === "foot"
                        ? "bg-gold text-ink"
                        : "border border-white/15 bg-white/5 text-white/75"
                    }`}
                  >
                    <WalkIcon size={14} />
                    <span>{lang === "bn" ? "হাঁটা" : "Walk"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProfileChange("car")}
                    className={`liquid-press flex items-center gap-1 rounded-xl px-2.5 py-2 text-[12px] font-semibold transition-colors ${
                      profile === "car"
                        ? "bg-gold text-ink"
                        : "border border-white/15 bg-white/5 text-white/75"
                    }`}
                  >
                    <CarIcon size={14} />
                    <span>{lang === "bn" ? "গাড়ি" : "Drive"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFollow(true);
                      mapRef.current?.flyTo([origin.lat, origin.lng], 17, {
                        duration: 0.6,
                      });
                    }}
                    className="liquid-press rounded-xl border border-sky-400/40 bg-sky-500/20 px-2.5 py-2 text-[12px] font-semibold text-sky-300"
                    title="Follow my position"
                  >
                    {lang === "bn" ? "ফলো" : "Follow"}
                  </button>
                  <button
                    type="button"
                    onClick={clearNavigation}
                    className="liquid-press rounded-xl bg-rose-500 px-3 py-2 text-[12px] font-bold text-white shadow-md"
                  >
                    {lang === "bn" ? "বন্ধ" : "Exit"}
                  </button>
                </div>
              </div>
            </div>
          ) : activePandal ? (
            /* 2. SELECTED PANDAL PIN ACTION CARD */
            <div className="glass-strong sheet-enter max-h-[62dvh] overflow-y-auto rounded-3xl border border-gold/40 p-3.5 shadow-2xl no-scrollbar">
              <div className="flex items-start gap-3">
                <img
                  src={activePandal.slug === "naihati-boromaa-kali-puja" ? "/boro-maa-emblem.png" : "/kali-mandala.webp"}
                  alt={activePandal.name_en}
                  className={`size-13 shrink-0 rounded-full border-2 ${
                    activePandal.slug === "naihati-boromaa-kali-puja"
                      ? "border-amber-300 ring-2 ring-gold/70 shadow-[0_0_12px_rgba(245,199,106,0.6)]"
                      : "border-gold shadow-md"
                  } object-cover`}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryTag category={activePandal.category} lang={lang} />
                    <CrowdPill info={activePandal.crowd} lang={lang} size="sm" />
                  </div>
                  <h2 className="mt-1 truncate text-[17px] leading-snug font-bold text-white">
                    {lang === "bn" ? activePandal.name_bn : activePandal.name_en}
                  </h2>
                  <p className="truncate text-[12px] text-white/65">
                    {lang === "bn" ? activePandal.area_bn : activePandal.area_en}
                    {typeof activePandal.distance_m === "number"
                      ? ` · ${formatDistance(activePandal.distance_m, lang)} ${t("away")}`
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSlug(null);
                    setShowFullDetails(false);
                  }}
                  aria-label="Close card"
                  className="liquid-press grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-white/70 hover:text-white"
                >
                  <CloseIcon size={15} />
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                  <p className="text-[10px] text-white/50">{t("walk")}</p>
                  <p className="text-[13.5px] font-bold text-white">
                    {formatMinutes(
                      roughWalkMinutes(
                        activePandal.distance_m ?? 0,
                        activePandal.crowd?.level ?? 1,
                      ),
                      lang,
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                  <p className="text-[10px] text-white/50">{t("drive")}</p>
                  <p className="text-[13.5px] font-bold text-white">
                    {formatMinutes(driveMinutes(activePandal.distance_m ?? 0), lang)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                  <p className="text-[10px] text-white/50">{t("crowdNow")}</p>
                  <p className="truncate text-[13px] font-bold text-gold">
                    {activePandal.crowd
                      ? levelLabel(activePandal.crowd.level as CrowdLevel, lang)
                      : lang === "bn"
                        ? "স্বাভাবিক"
                        : "Normal"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={routeLoading}
                  onClick={() => startDirectionsToPandal(activePandal.slug)}
                  className="liquid-press glow-gold flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold px-4 py-3 text-[14px] font-bold text-ink shadow-lg disabled:opacity-60"
                >
                  <NavigationIcon size={16} className="stroke-ink" />
                  <span>
                    {routeLoading
                      ? t("loading")
                      : lang === "bn"
                        ? "ডিরেকশন · পথ দেখাও"
                        : "Directions · Start Route"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFullDetails((v) => !v)}
                  className="liquid-press rounded-2xl border border-white/15 bg-white/5 px-3.5 py-3 text-[12.5px] font-semibold text-white hover:bg-white/10"
                >
                  {showFullDetails
                    ? lang === "bn"
                      ? "সংক্ষেপ"
                      : "Less"
                    : t("details")}
                </button>

                <button
                  type="button"
                  onClick={() => void share(activePandal.slug)}
                  aria-label={t("share")}
                  className="liquid-press grid size-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <ShareIcon size={16} />
                </button>
              </div>

              {showFullDetails ? (
                <div className="fade-in mt-3 space-y-2.5 border-t border-white/10 pt-3">
                  {(lang === "bn"
                    ? activePandal.description_bn
                    : activePandal.description_en) ? (
                    <p className="bn-text text-[12.5px] leading-relaxed text-white/80">
                      {lang === "bn"
                        ? activePandal.description_bn
                        : activePandal.description_en}
                    </p>
                  ) : null}

                  {activePandal.crowd ? (
                    <p className="text-[11px] text-white/55">
                      {levelReason(activePandal.crowd, lang)}
                    </p>
                  ) : null}

                  <CrowdReporter
                    lang={lang}
                    busy={reportBusy}
                    onReport={(level) => void handleReport(activePandal.slug, level)}
                  />
                </div>
              ) : null}
            </div>
          ) : activeFacility ? (
            /* 3. SELECTED EMERGENCY FACILITY PIN ACTION CARD */
            <div className="glass-strong sheet-enter rounded-3xl border border-sky-400/40 p-3.5 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-sky-400/30 bg-sky-500/15 overflow-hidden">
                  {activeFacility.kind === "police" ? (
                    <img src="/police-pin.webp" alt="Police" className="size-11 rounded-xl object-contain shadow-md" />
                  ) : activeFacility.kind === "hospital" ? (
                    <img src="/hospital-pin.webp" alt="Hospital" className="size-11 rounded-xl object-contain shadow-md" />
                  ) : (
                    <FacilityChipIcon kind={activeFacility.kind} size={22} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[10.5px] font-semibold text-sky-300">
                    {facilityLabel(String(activeFacility.kind), lang)}
                  </span>
                  <h2 className="mt-1 truncate text-[16.5px] font-bold text-white">
                    {activeFacility.name}
                  </h2>
                  <p className="text-[12px] text-white/65">
                    {typeof activeFacility.distance === "number"
                      ? `${formatDistance(activeFacility.distance, lang)} ${t("away")}`
                      : ""}
                    {activeFacility.address ? ` · ${activeFacility.address}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveFacility(null)}
                  aria-label="Close card"
                  className="liquid-press grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-white/70 hover:text-white"
                >
                  <CloseIcon size={15} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={routeLoading}
                  onClick={() => startDirectionsToFacility(activeFacility)}
                  className="liquid-press glow-gold flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gold px-4 py-3 text-[14px] font-bold text-ink shadow-lg disabled:opacity-60"
                >
                  <NavigationIcon size={16} className="stroke-ink" />
                  <span>
                    {routeLoading
                      ? t("loading")
                      : lang === "bn"
                        ? "ডিরেকশন · পথ দেখাও"
                        : "Directions · Start Route"}
                  </span>
                </button>

                {activeFacility.phone ? (
                  <a
                    href={`tel:${activeFacility.phone}`}
                    className="liquid-press flex items-center gap-1.5 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-3 text-[13px] font-bold text-emerald-300"
                  >
                    <PhoneIcon size={15} />
                    <span>{lang === "bn" ? "কল করুন" : "Call"}</span>
                  </a>
                ) : null}
              </div>
            </div>
          ) : showListDrawer ? (
            /* 4. PANDAL LIST DRAWER */
            <div className="glass-strong sheet-enter max-h-[60dvh] overflow-hidden rounded-3xl border border-white/15 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <p className="text-[12.5px] font-semibold text-white/85">
                  {t("showing")} {searchResults.length} {t("ofTotal")}{" "}
                  {visiblePandals.length} {t("navPandals")}
                </p>
                <button
                  type="button"
                  onClick={() => setShowListDrawer(false)}
                  className="liquid-press flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] font-semibold text-gold"
                >
                  <CloseIcon size={13} />
                  <span>{lang === "bn" ? "ম্যাপ দেখুন" : "View Map"}</span>
                </button>
              </div>
              <div className="max-h-[calc(60dvh-2.75rem)] space-y-2 overflow-y-auto p-3 no-scrollbar">
                {searchResults.map((pandal) => (
                  <PandalRow
                    key={pandal.slug}
                    pandal={pandal}
                    lang={lang}
                    distance={pandal.distance_m}
                    crowd={pandal.crowd}
                    active={pandal.slug === activeSlug}
                    onClick={() => {
                      setActiveSlug(pandal.slug);
                      setShowListDrawer(false);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* 5. DEFAULT COMPACT FLOATING DOCK */
            <div className="glass-strong flex items-center justify-between gap-2.5 rounded-3xl border border-white/15 px-3.5 py-2.5 shadow-2xl">
              {loading ? (
                <p className="py-1 text-[12.5px] text-white/65">{t("loading")}</p>
              ) : nextPandal ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveSlug(nextPandal.slug)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <img
                      src={nextPandal.slug === "naihati-boromaa-kali-puja" ? "/boro-maa-emblem.png" : "/kali-pin.webp"}
                      alt=""
                      className={`size-10 shrink-0 rounded-full border ${
                        nextPandal.slug === "naihati-boromaa-kali-puja" ? "border-amber-300 ring-1 ring-gold" : "border-gold"
                      } object-cover`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold tracking-wider text-gold uppercase">
                          {t("nextPandal")}
                        </span>
                        <span className="text-[11px] font-semibold text-white/70">
                          · {formatDistance(nextPandal.distance_m ?? 0, lang)}
                        </span>
                      </div>
                      <p className="truncate text-[14px] font-bold text-white">
                        {lang === "bn" ? nextPandal.name_bn : nextPandal.name_en}
                      </p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => startDirectionsToPandal(nextPandal.slug)}
                      className="liquid-press glow-gold flex items-center gap-1.5 rounded-2xl bg-gold px-3.5 py-2.5 text-[12.5px] font-bold text-ink"
                    >
                      <NavigationIcon size={14} className="stroke-ink" />
                      <span>{lang === "bn" ? "পথ দেখাও" : "Directions"}</span>
                    </button>
                  </div>
                </>
              ) : (
                <p className="py-1 text-[12.5px] text-white/65">
                  {lang === "bn"
                    ? "যেকোনো প্যান্ডেল বা জরুরি পিনে ক্লিক করুন"
                    : "Tap any pandal or emergency pin on the map"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {toast ? (
        <div className="glass-strong fade-in pointer-events-none absolute inset-x-0 bottom-24 z-[700] mx-auto w-fit max-w-[92%] rounded-2xl border border-gold/30 px-4 py-2 text-[12.5px] font-medium text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
