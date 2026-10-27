"use client";

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
  RouteSummary,
} from "@/components/map/bits";
import { areaLevel, levelLabel, levelReason, type CrowdLevel } from "@/lib/crowd";
import { fetchNearby, fetchRoute, reportCrowd } from "@/lib/client-api";
import { NAIHATI_CENTER, formatDistance, formatMinutes, nearestTo, roughWalkMinutes } from "@/lib/geo";
import { matchesQuery, pandalHaystack } from "@/lib/search";
import { useCrowdLevels, useGeolocation, usePandals } from "@/lib/hooks";
import { PANDAL_CATEGORIES, type Facility, type LatLng, type PandalCategory, type RouteResult } from "@/lib/types";

const LeafletCanvas = dynamic(() => import("./LeafletCanvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-ink">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
        <p className="text-[13px] text-white/60">Loading Naihati map…</p>
      </div>
    </div>
  ),
});

const FACILITY_CHIPS: { kind: string; emoji: string }[] = [
  { kind: "hospital", emoji: "🏥" },
  { kind: "police", emoji: "🚓" },
  { kind: "toilets", emoji: "🚻" },
  { kind: "restaurant", emoji: "🍽" },
  { kind: "railway", emoji: "🚉" },
  { kind: "atm", emoji: "🏧" },
  { kind: "parking", emoji: "🅿" },
];

const DEFAULT_FACILITY_KINDS = ["hospital", "police", "toilets"];

export default function MapExperience() {
  const { lang, t } = useI18n();
  const { pandals, loading, error } = usePandals();
  const geo = useGeolocation(true);
  const { levels, setLevel, refresh } = useCrowdLevels(useMemo(() => pandals.map((p) => p.slug), [pandals]));

  const mapRef = useRef<LeafletMap | null>(null);
  const [manualPosition, setManualPosition] = useState<LatLng | null>(null);
  const [follow, setFollow] = useState(true);
  const [nightMode, setNightMode] = useState(true);
  const [categories, setCategories] = useState<PandalCategory[]>([...PANDAL_CATEGORIES]);
  const [facilityKinds, setFacilityKinds] = useState<string[]>(DEFAULT_FACILITY_KINDS);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [sheetView, setSheetView] = useState<"next" | "list" | "detail">("next");
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeTargets, setRouteTargets] = useState<string[]>([]);
  const [profile, setProfile] = useState<"foot" | "car">("foot");
  const [routeLoading, setRouteLoading] = useState(false);
  const [fitRoute, setFitRoute] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [watchNearby, setWatchNearby] = useState(DEFAULT_FACILITY_KINDS.join(","));
  const [showIntro, setShowIntro] = useState(false);

  const position = manualPosition ?? geo.position;
  const origin: LatLng = position ?? NAIHATI_CENTER;

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 3200);
  }, []);

  // -------------------------------------------------- deep links (QR / share)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pandalParam = params.get("pandal");
    const stopsParam = params.get("stops");
    const categoryParam = params.get("cat");
    const facilityParam = params.get("facility");

    if (categoryParam && PANDAL_CATEGORIES.includes(categoryParam as PandalCategory)) {
      setCategories([categoryParam as PandalCategory]);
    }
    if (facilityParam) {
      setFacilityKinds((current) => [...new Set([...current, facilityParam])]);
    }
    if (stopsParam) {
      setRouteTargets(stopsParam.split(",").filter(Boolean));
      setShowIntro(false);
    } else if (pandalParam) {
      setActiveSlug(pandalParam);
      setSheetView("detail");
    } else {
      setShowIntro(true);
    }
  }, []);

  // ----------------------------------------------------- crowd refresh cycle
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ------------------------------------------------------------ nearby places
  useEffect(() => {
    if (facilityKinds.length === 0) {
      setFacilities([]);
      return;
    }
    const key = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}:${facilityKinds.join(",")}`;
    if (key === watchNearby) return;
    let cancelled = false;
    void fetchNearby(origin.lat, origin.lng, facilityKinds, 1800).then((payload) => {
      if (cancelled) return;
      setFacilities(payload.facilities);
      setWatchNearby(key);
    });
    return () => {
      cancelled = true;
    };
  }, [origin.lat, origin.lng, facilityKinds, watchNearby]);

  // Also pull facilities once on first load so safety layers are populated.
  useEffect(() => {
    if (watchNearby === DEFAULT_FACILITY_KINDS.join(",") && facilities.length === 0) {
      void fetchNearby(origin.lat, origin.lng, facilityKinds, 1800).then((payload) =>
        setFacilities(payload.facilities),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------ routing
  const buildRoute = useCallback(
    async (slugs: string[], mode: "foot" | "car") => {
      const targets = pandals.filter((pandal) => slugs.includes(pandal.slug));
      if (targets.length === 0) return;
      setRouteLoading(true);
      const points = [origin, ...targets.map((pandal) => ({ lat: pandal.lat, lng: pandal.lng }))];
      const result = await fetchRoute(points, mode);
      setRoute(result);
      setFitRoute(true);
      setRouteLoading(false);
      // The sheet view is left alone on purpose: the route summary is rendered
      // in both the "next" and "detail" views, so switching here would hide it.
    },
    [origin, pandals],
  );

  useEffect(() => {
    if (routeTargets.length > 0 && pandals.length > 0) {
      void buildRoute(routeTargets, profile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeTargets, pandals.length]);

  const handleProfileChange = useCallback(
    (mode: "foot" | "car") => {
      setProfile(mode);
      if (routeTargets.length > 0) void buildRoute(routeTargets, mode);
    },
    [buildRoute, routeTargets],
  );

  const startRouteTo = useCallback(
    (slug: string) => {
      setActiveSlug(slug);
      setRouteTargets([slug]);
      void buildRoute([slug], profile);
    },
    [buildRoute, profile],
  );

  // --------------------------------------------------------------- derived UI
  const withCrowd = useMemo(
    () => pandals.map((pandal) => ({ ...pandal, crowd: levels[pandal.slug] })),
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

  const nextPandal = ranked[0];
  const activePandal = activeSlug ? ranked.find((p) => p.slug === activeSlug) ?? null : null;

  // "How busy is this area right now" — averaged over pandals within 900 m.
  const area = useMemo(() => {
    const local = levels
      ? ranked
          .filter((pandal) => pandal.distance_m <= 900 && pandal.crowd)
          .map((pandal) => pandal.crowd!)
      : [];
    const summary = areaLevel(local, lang);
    return { ...summary, reports: local.filter((info) => info.source === "live").length };
  }, [ranked, levels, lang]);

  const nearbyOfKind = useCallback(
    (kind: string) => facilities.filter((facility) => facility.kind === kind).slice(0, 3),
    [facilities],
  );

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
          // user dismissed — fall through to copying
        }
      }
      await navigator.clipboard?.writeText(url);
      showToast(t("copied"));
    },
    [showToast, t],
  );

  const toggleCategory = (category: PandalCategory) => {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
  };

  const toggleFacility = (kind: string) => {
    setFacilityKinds((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
    );
  };

  const locationBanner =
    geo.status === "denied"
      ? t("locationDenied")
      : geo.status === "unavailable" || geo.status === "unsupported"
        ? t("locationUnavailable")
        : null;

  return (
    <div className="fixed inset-0 z-0">
      <LeafletCanvas
        className="absolute inset-0 h-full w-full"
        pandals={visiblePandals}
        facilities={facilities}
        user={position ? { ...position, accuracy: manualPosition ? null : geo.accuracy } : null}
        follow={follow && Boolean(position)}
        route={route}
        activeSlug={activeSlug}
        center={origin}
        zoom={15}
        nightMode={nightMode}
        fitRoute={fitRoute}
        onSelectPandal={(slug) => {
          setActiveSlug(slug);
          setSheetView("detail");
        }}
        onMapClick={(point) => {
          if (!position) {
            setManualPosition(point);
            setFollow(false);
            showToast(lang === "bn" ? "আপনার জায়গা বসানো হয়েছে" : "Your spot is set here");
          }
        }}
        onReady={(map) => {
          mapRef.current = map;
        }}
      />

      {/* -------------------------------------------------- top control stack */}
      <div className="pointer-events-none absolute inset-x-0 top-14 z-[600] flex flex-col gap-2 px-3 pt-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="glass flex h-11 flex-1 items-center gap-2 rounded-2xl px-3 shadow-lg">
            <span className="text-[15px] opacity-70">🔍</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value.length > 0) setSheetView("list");
              }}
              placeholder={t("searchPlaceholder")}
              className="h-full w-full bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none"
              inputMode="search"
            />
            {query.length > 0 ? (
              <button type="button" onClick={() => setQuery("")} className="text-white/50">
                ✕
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setNightMode((value) => !value)}
            title={t("nightMap")}
            className="glass liquid-press grid size-11 shrink-0 place-items-center rounded-2xl text-[16px] shadow-lg"
          >
            {nightMode ? "🌙" : "☀️"}
          </button>
        </div>

        <div className="pointer-events-auto flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
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
            >
              {category === "heritage" ? "★" : category === "large" ? "▲" : "•"} {t(category)}
            </Chip>
          ))}
          <span className="mx-1 w-px shrink-0 bg-white/15" />
          {FACILITY_CHIPS.map((chip) => (
            <Chip
              key={chip.kind}
              active={facilityKinds.includes(chip.kind)}
              onClick={() => toggleFacility(chip.kind)}
              title={t(chip.kind)}
            >
              <span>{chip.emoji}</span>
              <span className="hidden sm:inline">{t(chip.kind)}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* --------------------------------------------------------- right FABs */}
      <div className="absolute right-3 bottom-[calc(var(--nkp-bottom-ui)+0.75rem)] z-[600] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setFollow(true);
            if (position && mapRef.current) {
              mapRef.current.flyTo([position.lat, position.lng], 17, { duration: 0.7 });
            } else {
              geo.request();
              showToast(t("locating"));
            }
          }}
          className="glass-strong liquid-press grid size-12 place-items-center rounded-2xl text-[18px] shadow-xl"
          title={t("recenter")}
        >
          ◎
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="glass-strong liquid-press grid size-12 place-items-center rounded-2xl text-[18px] shadow-xl"
        >
          ＋
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="glass-strong liquid-press grid size-12 place-items-center rounded-2xl text-[18px] shadow-xl"
        >
          －
        </button>
      </div>

      {/* ------------------------------------------------------- bottom sheet */}
      <div className="absolute inset-x-0 z-[650] px-2 pb-2" style={{ bottom: "var(--nkp-bottom-ui)" }}>
        <div className="glass-strong sheet-enter mx-auto max-h-[72dvh] w-full max-w-2xl overflow-hidden rounded-3xl shadow-2xl">
          <button
            type="button"
            onClick={() => setSheetView(sheetView === "list" ? "next" : "list")}
            className="flex w-full items-center justify-center py-2"
            aria-label={sheetView === "list" ? t("nextPandal") : t("nearestPandals")}
          >
            <span className="h-1.5 w-12 rounded-full bg-white/25" />
          </button>

          <div className="max-h-[calc(72dvh-1.75rem)] overflow-y-auto overscroll-contain px-3 pb-4 no-scrollbar">
            {loading ? (
              <p className="py-6 text-center text-[13px] text-white/60">{t("loading")}</p>
            ) : error ? (
              <p className="py-6 text-center text-[13px] text-white/60">{t("loadFailed")}</p>
            ) : sheetView === "detail" && activePandal ? (
              <div className="fade-in space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setSheetView("next");
                    setActiveSlug(null);
                  }}
                  className="text-[12px] text-gold"
                >
                  ← {t("nearestPandals")}
                </button>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryTag category={activePandal.category} lang={lang} />
                    {activePandal.verified === false ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] text-white/60">
                        {t("approximatePin")}
                      </span>
                    ) : null}
                    <CrowdPill info={activePandal.crowd} lang={lang} />
                  </div>
                  <h2 className="mt-2 text-[19px] leading-tight font-semibold text-white">
                    {lang === "bn" ? activePandal.name_bn : activePandal.name_en}
                  </h2>
                  <p className="text-[12.5px] text-white/60">
                    {lang === "bn" ? activePandal.name_en : activePandal.name_bn}
                  </p>
                  <p className="mt-1 text-[12.5px] text-white/70">
                    {lang === "bn" ? activePandal.area_bn : activePandal.area_en}
                    {typeof activePandal.distance_m === "number"
                      ? ` · ${formatDistance(activePandal.distance_m, lang)} ${t("away")}`
                      : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-[11px] text-white/50">{t("walk")}</p>
                    <p className="text-[15px] font-semibold">
                      {formatMinutes(
                        roughWalkMinutes(activePandal.distance_m ?? 0, activePandal.crowd?.level ?? 1),
                        lang,
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-[11px] text-white/50">{t("crowdNow")}</p>
                    <p className="text-[15px] font-semibold">
                      {activePandal.crowd
                        ? levelLabel(activePandal.crowd.level as CrowdLevel, lang)
                        : lang === "bn"
                          ? "তথ্য নেই"
                          : "No data"}
                    </p>
                  </div>
                </div>

                {activePandal.crowd ? (
                  <p className="text-[11.5px] text-white/55">
                    {levelReason(activePandal.crowd, lang)}
                  </p>
                ) : null}

                {(lang === "bn" ? activePandal.description_bn : activePandal.description_en) ? (
                  <p className="bn-text text-[13px] leading-relaxed text-white/75">
                    {lang === "bn" ? activePandal.description_bn : activePandal.description_en}
                  </p>
                ) : null}

                <dl className="grid grid-cols-1 gap-1.5 text-[12px] text-white/65 sm:grid-cols-2">
                  {activePandal.landmark_en && (lang === "bn" ? activePandal.landmark_bn : true) ? (
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <dt className="text-[10.5px] text-white/45">{t("landmark")}</dt>
                      <dd>{lang === "bn" ? activePandal.landmark_bn : activePandal.landmark_en}</dd>
                    </div>
                  ) : null}
                  {activePandal.committee ? (
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <dt className="text-[10.5px] text-white/45">{t("committee")}</dt>
                      <dd>{activePandal.committee}</dd>
                    </div>
                  ) : null}
                  {activePandal.established ? (
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <dt className="text-[10.5px] text-white/45">{t("established")}</dt>
                      <dd>{activePandal.established}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={routeLoading}
                    onClick={() => startRouteTo(activePandal.slug)}
                    className="liquid-press glow-gold flex-1 rounded-2xl bg-gold px-4 py-3 text-[13.5px] font-semibold text-ink disabled:opacity-60"
                  >
                    {routeLoading ? t("loading") : `➤ ${t("startRoute")}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => void share(activePandal.slug)}
                    className="liquid-press rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[13.5px]"
                  >
                    ↗ {t("share")}
                  </button>
                </div>

                {route && routeTargets.includes(activePandal.slug) ? (
                  <RouteSummary
                    route={route}
                    lang={lang}
                    profile={profile}
                    onProfileChange={handleProfileChange}
                    onClear={() => {
                      setRoute(null);
                      setRouteTargets([]);
                      setFitRoute(false);
                    }}
                  />
                ) : null}

                <CrowdReporter
                  lang={lang}
                  busy={reportBusy}
                  onReport={(level) => void handleReport(activePandal.slug, level)}
                />

                {nearbyOfKind("toilets").length > 0 || nearbyOfKind("hospital").length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[11.5px] font-medium text-white/60">{t("layerFacilities")}</p>
                    {[...nearbyOfKind("toilets"), ...nearbyOfKind("hospital"), ...nearbyOfKind("police")].map(
                      (facility) => (
                        <p key={`${facility.kind}-${facility.name}`} className="text-[11.5px] text-white/60">
                          {facility.kind === "toilets" ? "🚻" : facility.kind === "hospital" ? "🏥" : "🚓"}{" "}
                          {facility.name}
                          {typeof facility.distance === "number"
                            ? ` · ${formatDistance(facility.distance, lang)}`
                            : ""}
                        </p>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            ) : sheetView === "list" ? (
              <div className="fade-in space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] text-white/60">
                    {t("showing")} {searchResults.length} {t("ofTotal")} {visiblePandals.length}{" "}
                    {t("navPandals")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSheetView("next")}
                    className="text-[12px] text-gold"
                  >
                    {t("nextPandal")} →
                  </button>
                </div>
                {searchResults.slice(0, 40).map((pandal) => (
                  <PandalRow
                    key={pandal.slug}
                    pandal={pandal}
                    lang={lang}
                    distance={pandal.distance_m}
                    crowd={pandal.crowd}
                    active={pandal.slug === activeSlug}
                    onClick={() => {
                      setActiveSlug(pandal.slug);
                      setSheetView("detail");
                    }}
                  />
                ))}
                {searchResults.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-white/55">
                    {lang === "bn" ? "কিছু পাওয়া যায়নি" : "Nothing matched"}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="fade-in space-y-3">
                {locationBanner ? (
                  <div className="rounded-2xl border border-gold/30 bg-gold/10 px-3 py-2.5">
                    <p className="text-[12px] text-white/85">{locationBanner}</p>
                    <button
                      type="button"
                      onClick={() => {
                        geo.request();
                        showToast(t("locating"));
                      }}
                      className="mt-1.5 text-[12px] font-semibold text-gold"
                    >
                      {t("enableLocation")} →
                    </button>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-white/50">{t("areaNow")}</p>
                    <p className="text-[15px] font-semibold text-white">{area.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          area.level === 1
                            ? "var(--color-crowd1)"
                            : area.level === 2
                              ? "var(--color-crowd2)"
                              : area.level === 3
                                ? "var(--color-crowd3)"
                                : "var(--color-crowd4)",
                      }}
                    />
                    <span className="text-[11.5px] text-white/60">
                      {area.reports > 0 ? t("live") : t("estimate")}
                    </span>
                  </div>
                </div>

                {nextPandal ? (
                  <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/15 to-transparent p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11.5px] font-semibold tracking-wide text-gold uppercase">
                        {t("nextPandal")}
                      </p>
                      <CategoryTag category={nextPandal.category} lang={lang} />
                    </div>
                    <h2 className="mt-1.5 text-[18px] leading-tight font-semibold text-white">
                      {lang === "bn" ? nextPandal.name_bn : nextPandal.name_en}
                    </h2>
                    <p className="text-[12px] text-white/60">
                      {lang === "bn" ? nextPandal.area_bn : nextPandal.area_en}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-3">
                      <span className="text-[13px] font-semibold text-gold">
                        {formatDistance(nextPandal.distance_m ?? 0, lang)}
                      </span>
                      <span className="text-[12.5px] text-white/75">
                        🚶{" "}
                        {formatMinutes(
                          roughWalkMinutes(nextPandal.distance_m ?? 0, nextPandal.crowd?.level ?? 1),
                          lang,
                        )}
                      </span>
                      <CrowdPill info={nextPandal.crowd} lang={lang} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startRouteTo(nextPandal.slug)}
                        className="liquid-press glow-gold flex-1 rounded-2xl bg-gold px-3 py-2.5 text-[13px] font-semibold text-ink"
                      >
                        ➤ {t("startRoute")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlug(nextPandal.slug);
                          setSheetView("detail");
                        }}
                        className="liquid-press rounded-2xl border border-white/15 bg-white/5 px-3 py-2.5 text-[13px]"
                      >
                        {t("details")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="py-3 text-center text-[13px] text-white/55">
                    {lang === "bn" ? "ফিল্টার অনুযায়ী প্যান্ডেল নেই" : "No pandals match the filters"}
                  </p>
                )}

                {route ? (
                  <RouteSummary
                    route={route}
                    lang={lang}
                    profile={profile}
                    onProfileChange={handleProfileChange}
                    onClear={() => {
                      setRoute(null);
                      setRouteTargets([]);
                      setFitRoute(false);
                    }}
                  />
                ) : null}

                {ranked.length > 1 ? (
                  <div>
                    <p className="mb-1.5 text-[12px] font-medium text-white/60">{t("nearestPandals")}</p>
                    <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 no-scrollbar">
                      {ranked.slice(1, 9).map((pandal) => (
                        <button
                          key={pandal.slug}
                          type="button"
                          onClick={() => {
                            setActiveSlug(pandal.slug);
                            setSheetView("detail");
                          }}
                          className="liquid-card w-40 shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 text-left"
                        >
                          <CategoryTag category={pandal.category} lang={lang} />
                          <p className="mt-1 line-clamp-2 text-[12.5px] font-medium text-white/90">
                            {lang === "bn" ? pandal.name_bn : pandal.name_en}
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/55">
                            {formatDistance(pandal.distance_m ?? 0, lang)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {facilityKinds.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[12px] font-medium text-white/60">
                      {t("layerFacilities")}
                      {facilities.length > 0 ? ` · ${facilities.length} ${t("nearbyCount")}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {facilityKinds.map((kind) => {
                        const nearest = nearbyOfKind(kind)[0];
                        return (
                          <span
                            key={kind}
                            className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11.5px] text-white/70"
                          >
                            {FACILITY_CHIPS.find((chip) => chip.kind === kind)?.emoji} {t(kind)}
                            {nearest?.distance
                              ? ` · ${formatDistance(nearest.distance, lang)}`
                              : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {showIntro ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                    <p className="text-[12px] font-medium text-white/80">
                      {lang === "bn" ? "কীভাবে ব্যবহার করবেন" : "How to use this"}
                    </p>
                    <ol className="mt-1.5 space-y-1 text-[11.5px] text-white/65">
                      <li>
                        1. {lang === "bn" ? "লোকেশন পারমিশন দিন" : "Allow location permission"}
                      </li>
                      <li>
                        2.{" "}
                        {lang === "bn"
                          ? "নীল বিন্দু আপনার জায়গা, সোনালি পিন প্যান্ডেল"
                          : "The blue dot is you, gold pins are pandals"}
                      </li>
                      <li>
                        3.{" "}
                        {lang === "bn"
                          ? "«পথ দেখাও» চাপলে হাঁটার রাস্তা ও সময় পাবেন"
                          : "Tap Show route for the walking path and ETA"}
                      </li>
                      <li>
                        4.{" "}
                        {lang === "bn"
                          ? "ভিড়ের রিপোর্ট দিলে সবাই উপকৃত হয়"
                          : "Report the crowd to help everyone else"}
                      </li>
                    </ol>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast ? (
        <div
          className="glass-strong fade-in absolute inset-x-0 z-[700] mx-auto w-fit max-w-[92%] rounded-2xl px-4 py-2.5 text-[13px] shadow-xl"
          style={{ bottom: "calc(var(--nkp-bottom-ui) + 18px)" }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
