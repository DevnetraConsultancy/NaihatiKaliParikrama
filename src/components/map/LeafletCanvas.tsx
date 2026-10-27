"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Circle, LayerGroup, Map as LeafletMap, Marker, Polyline } from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  Facility,
  Lang,
  LatLng,
  PandalCategory,
  PandalWithDistance,
  RouteResult,
} from "@/lib/types";

const TILE_URL =
  process.env.NEXT_PUBLIC_TILE_URL ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function facilitySvg(kind: string): string {
  switch (kind) {
    case "hospital":
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff5f7e" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    case "police":
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4z"/></svg>';
    case "toilets":
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10M9 4v7a3 3 0 0 0 6 0V4M12 14v7M8 21h8"/></svg>';
    case "restaurant":
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f5c76a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v20M21 15V2a5 5 0 0 0-5 5v8h5zm0 0v7M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2M7 11v11"/></svg>';
    case "railway":
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="15" rx="2"/><line x1="4" y1="11" x2="20" y2="11"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/></svg>';
    case "pharmacy":
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
    case "parking":
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>';
    case "atm":
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
    case "help":
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
    default:
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f5c76a" stroke-width="2"><circle cx="12" cy="12" r="5" fill="#f5c76a"/></svg>';
  }
}

function pinIcon(category: PandalCategory, active: boolean): L.DivIcon {
  return L.divIcon({
    className: "nkp-pin-wrapper",
    html: `<span class="nkp-pin nkp-pin--${category}${active ? " nkp-pin--active" : ""}">
        ${active ? '<span class="nkp-pin__pulse"></span>' : ""}
        <span class="nkp-pin__head">
          <img src="/kali-pin.jpg" alt="" class="nkp-pin__img" loading="eager" />
        </span>
        <span class="nkp-pin__tip"></span>
      </span>`,
    iconSize: [42, 50],
    iconAnchor: [21, 48],
    popupAnchor: [0, -44],
  });
}

function facilityIcon(kind: string, active = false): L.DivIcon {
  return L.divIcon({
    className: "nkp-facility-wrapper",
    html: `<span class="nkp-facility${active ? " nkp-facility--active" : ""}">${facilitySvg(kind)}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function userIcon(lang: Lang = "bn"): L.DivIcon {
  const badge = lang === "bn" ? "আপনি" : "YOU";
  return L.divIcon({
    className: "nkp-user-wrapper",
    html: `<span class="nkp-user">
      <span class="nkp-user__badge">${badge}</span>
      <span class="nkp-user__pulse"></span>
      <span class="nkp-user__dot"></span>
    </span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function facilityKey(facility: Facility): string {
  return facility.osm_id ?? `${facility.kind}:${facility.name}:${facility.lat.toFixed(5)},${facility.lng.toFixed(5)}`;
}

export interface LeafletCanvasProps {
  pandals: PandalWithDistance[];
  facilities?: Facility[];
  user?: (LatLng & { accuracy?: number | null }) | null;
  follow?: boolean;
  route?: RouteResult | null;
  activeSlug?: string | null;
  activeFacilityKey?: string | null;
  center: LatLng;
  zoom?: number;
  nightMode?: boolean;
  fitRoute?: boolean;
  lang?: Lang;
  onSelectPandal?: (slug: string) => void;
  onSelectFacility?: (facility: Facility) => void;
  onMapClick?: (point: LatLng) => void;
  onReady?: (map: LeafletMap) => void;
  className?: string;
}

/**
 * Interactive Naihati Map Canvas:
 * - Renders all 28 pandals using the circular Maa Kali portrait pin (/kali-pin.jpg)
 * - Renders all emergency services & utility pins (clickable for directions)
 * - Renders the user's live GPS location beacon
 * - Renders Google Maps-style live animated polyline routes
 */
export default function LeafletCanvas({
  pandals,
  facilities = [],
  user = null,
  follow = false,
  route = null,
  activeSlug = null,
  activeFacilityKey = null,
  center,
  zoom = 15,
  nightMode = true,
  fitRoute = false,
  lang = "bn",
  onSelectPandal,
  onSelectFacility,
  onMapClick,
  onReady,
  className,
}: LeafletCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const pandalLayerRef = useRef<LayerGroup | null>(null);
  const facilityLayerRef = useRef<LayerGroup | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const userLayerRef = useRef<LayerGroup | null>(null);
  const pandalMarkersRef = useRef<Map<string, Marker>>(new Map());
  const facilityMarkersRef = useRef<Map<string, { marker: Marker; facility: Facility }>>(new Map());
  const flownToRef = useRef<string | null>(null);
  const selectPandalRef = useRef(onSelectPandal);
  const selectFacilityRef = useRef(onSelectFacility);
  const clickRef = useRef(onMapClick);
  const readyRef = useRef(onReady);

  selectPandalRef.current = onSelectPandal;
  selectFacilityRef.current = onSelectFacility;
  clickRef.current = onMapClick;
  readyRef.current = onReady;

  // ------------------------------------------------------------------ init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      inertia: true,
      zoomAnimation: true,
      wheelPxPerZoomLevel: 120,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
      subdomains: "abc",
      keepBuffer: 3,
      updateWhenIdle: true,
      updateWhenZooming: false,
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    facilityLayerRef.current = L.layerGroup().addTo(map);
    pandalLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      clickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    mapRef.current = map;
    readyRef.current?.(map);

    // Ensure Leaflet recalculates dimensions once layout settles
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 350);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        map.invalidateSize();
      }, 120);
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (resizeTimer) clearTimeout(resizeTimer);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      pandalMarkersRef.current.clear();
      facilityMarkersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------- night UI
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.classList.toggle("map-night", nightMode);
  }, [nightMode]);

  // --------------------------------------------------------------- pandals
  useEffect(() => {
    const layer = pandalLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    pandalMarkersRef.current.clear();

    for (const pandal of pandals) {
      const isActive = pandal.slug === activeSlug;
      const marker = L.marker([pandal.lat, pandal.lng], {
        icon: pinIcon(pandal.category, isActive),
        title: lang === "bn" ? pandal.name_bn : pandal.name_en,
        riseOnHover: true,
        zIndexOffset: isActive ? 1000 : pandal.featured ? 300 : 100,
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectPandalRef.current?.(pandal.slug);
      });

      marker.addTo(layer);
      pandalMarkersRef.current.set(pandal.slug, marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pandals, lang]);

  // ---------------------------------------------------- active pin highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const pandal of pandals) {
      const marker = pandalMarkersRef.current.get(pandal.slug);
      if (!marker) continue;
      const isActive = pandal.slug === activeSlug;
      marker.setIcon(pinIcon(pandal.category, isActive));
      if (isActive) {
        marker.setZIndexOffset(1000);
        if (activeSlug && flownToRef.current !== `pandal:${activeSlug}` && !fitRoute) {
          flownToRef.current = `pandal:${activeSlug}`;
          map.flyTo([pandal.lat, pandal.lng], Math.max(map.getZoom(), 16), {
            duration: 0.65,
            easeLinearity: 0.3,
          });
        }
      } else {
        marker.setZIndexOffset(pandal.featured ? 300 : 100);
      }
    }
    if (!activeSlug && !activeFacilityKey) flownToRef.current = null;
  }, [activeSlug, activeFacilityKey, pandals, fitRoute]);

  // -------------------------------------------------------------- facilities
  useEffect(() => {
    const layer = facilityLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    facilityMarkersRef.current.clear();

    for (const facility of facilities) {
      const key = facilityKey(facility);
      const isActive = key === activeFacilityKey;
      const marker = L.marker([facility.lat, facility.lng], {
        icon: facilityIcon(facility.kind, isActive),
        title: facility.name,
        riseOnHover: true,
        zIndexOffset: isActive ? 950 : 20,
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectFacilityRef.current?.(facility);
      });

      marker.addTo(layer);
      facilityMarkersRef.current.set(key, { marker, facility });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilities]);

  // ---------------------------------------------- active facility highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const [key, { marker, facility }] of facilityMarkersRef.current.entries()) {
      const isActive = key === activeFacilityKey;
      marker.setIcon(facilityIcon(facility.kind, isActive));
      if (isActive) {
        marker.setZIndexOffset(950);
        if (activeFacilityKey && flownToRef.current !== `fac:${activeFacilityKey}` && !fitRoute) {
          flownToRef.current = `fac:${activeFacilityKey}`;
          map.flyTo([facility.lat, facility.lng], Math.max(map.getZoom(), 16), {
            duration: 0.65,
            easeLinearity: 0.3,
          });
        }
      } else {
        marker.setZIndexOffset(20);
      }
    }
  }, [activeFacilityKey, fitRoute]);

  // ------------------------------------------------------------------ route
  useEffect(() => {
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!route || route.geometry.length < 2) return;

    // 1. Live connector dashed line from user's exact GPS to route start
    if (user) {
      const firstPt = route.geometry[0];
      L.polyline(
        [
          [user.lat, user.lng],
          [firstPt[0], firstPt[1]],
        ],
        {
          color: "#38bdf8",
          weight: 4,
          opacity: 0.85,
          dashArray: "4 8",
        },
      ).addTo(layer);
    }

    // 2. Dark outer road casing (Google Maps style)
    L.polyline(route.geometry, {
      color: "#070b19",
      weight: 10,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(layer);

    // 3. Vibrant primary navigation line (Google Maps Blue for drive, Cyan-Blue for walk)
    const primaryColor = route.profile === "car" ? "#2563eb" : "#0284c7";
    const line: Polyline = L.polyline(route.geometry, {
      color: primaryColor,
      weight: 6,
      opacity: 0.98,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(layer);

    // 4. Destination target ring
    const dest = route.geometry[route.geometry.length - 1];
    L.circleMarker(dest, {
      radius: 9,
      color: "#f5c76a",
      weight: 3,
      fillColor: "#2563eb",
      fillOpacity: 1,
    }).addTo(layer);

    if (fitRoute) {
      map.fitBounds(line.getBounds(), {
        paddingTopLeft: [36, 130],
        paddingBottomRight: [36, 220],
        maxZoom: 17,
      });
    }
  }, [route, fitRoute, user]);

  // ----------------------------------------------------------- live position
  useEffect(() => {
    const map = mapRef.current;
    const layer = userLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!user) return;

    L.marker([user.lat, user.lng], {
      icon: userIcon(lang),
      interactive: false,
      zIndexOffset: 1200,
    }).addTo(layer);

    if (user.accuracy && user.accuracy > 15) {
      const circle: Circle = L.circle([user.lat, user.lng], {
        radius: Math.min(user.accuracy, 280),
        color: "#3b82f6",
        weight: 1.2,
        opacity: 0.45,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        interactive: false,
      });
      circle.addTo(layer);
    }

    if (follow) {
      map.setView([user.lat, user.lng], Math.max(map.getZoom(), 16), { animate: true });
    }
  }, [user, follow, lang]);

  return <div ref={containerRef} className={className} aria-label="Naihati Kali Puja pandal map" />;
}
