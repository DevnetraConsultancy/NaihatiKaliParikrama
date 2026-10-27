"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Circle, LayerGroup, Map as LeafletMap, Marker, Polyline } from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  Facility,
  LatLng,
  PandalCategory,
  PandalWithDistance,
  RouteResult,
} from "@/lib/types";

const TILE_URL =
  process.env.NEXT_PUBLIC_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const CATEGORY_GLYPH: Record<PandalCategory, string> = {
  heritage: "★",
  large: "▲",
  small: "•",
};

const FACILITY_GLYPH: Record<string, string> = {
  hospital: "🏥",
  police: "🚓",
  toilets: "🚻",
  restaurant: "🍽",
  pharmacy: "💊",
  fire_station: "🚒",
  railway: "🚉",
  ferry: "⛴",
  atm: "🏧",
  parking: "🅿",
  market: "🛒",
  water: "🚰",
  help: "☎",
};

function pinIcon(category: PandalCategory, active: boolean): L.DivIcon {
  return L.divIcon({
    className: "nkp-pin-wrapper",
    html: `<span class="nkp-pin nkp-pin--${category}${active ? " nkp-pin--active" : ""}">
        <span class="nkp-pin__body"></span>
        <span class="nkp-pin__dot">${CATEGORY_GLYPH[category] ?? "•"}</span>
      </span>`,
    iconSize: [30, 38],
    iconAnchor: [15, 34],
    popupAnchor: [0, -30],
  });
}

function facilityIcon(kind: string): L.DivIcon {
  return L.divIcon({
    className: "nkp-facility-wrapper",
    html: `<span class="nkp-facility">${FACILITY_GLYPH[kind] ?? "•"}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function userIcon(): L.DivIcon {
  return L.divIcon({
    className: "nkp-user-wrapper",
    html: `<span class="nkp-user"><span class="nkp-user__pulse"></span><span class="nkp-user__dot"></span></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface LeafletCanvasProps {
  pandals: PandalWithDistance[];
  facilities?: Facility[];
  user?: (LatLng & { accuracy?: number | null }) | null;
  follow?: boolean;
  route?: RouteResult | null;
  activeSlug?: string | null;
  center: LatLng;
  zoom?: number;
  nightMode?: boolean;
  fitRoute?: boolean;
  onSelectPandal?: (slug: string) => void;
  onMapClick?: (point: LatLng) => void;
  onReady?: (map: LeafletMap) => void;
  className?: string;
}

/**
 * The map itself. Written against Leaflet's imperative API rather than a React
 * wrapper: markers, route lines and the live position all update in place, which
 * keeps re-renders cheap on low-end Android phones.
 */
export default function LeafletCanvas({
  pandals,
  facilities = [],
  user = null,
  follow = false,
  route = null,
  activeSlug = null,
  center,
  zoom = 15,
  nightMode = true,
  fitRoute = false,
  onSelectPandal,
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
  const flownToRef = useRef<string | null>(null);
  const selectRef = useRef(onSelectPandal);
  const clickRef = useRef(onMapClick);
  const readyRef = useRef(onReady);

  selectRef.current = onSelectPandal;
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
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
      detectRetina: true,
    }).addTo(map);

    pandalLayerRef.current = L.layerGroup().addTo(map);
    facilityLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      clickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    mapRef.current = map;
    readyRef.current?.(map);

    // The map is inside an animated panel, so keep Leaflet's size in sync.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      pandalMarkersRef.current.clear();
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
      const marker = L.marker([pandal.lat, pandal.lng], {
        icon: pinIcon(pandal.category, pandal.slug === activeSlug),
        title: pandal.name_en,
        riseOnHover: true,
      });
      const crowdLine = pandal.crowd
        ? `<div style="margin-top:4px;font-size:11px;opacity:.75">${escapeHtml(
            pandal.crowd.source === "live" ? "Live crowd data" : "Estimated crowd",
          )}</div>`
        : "";
      marker.bindPopup(
        `<strong>${escapeHtml(pandal.name_bn)}</strong><br/><span style="opacity:.75">${escapeHtml(
          pandal.name_en,
        )}</span><br/><span style="opacity:.6;font-size:11px">${escapeHtml(
          pandal.area_en,
        )}</span>${crowdLine}`,
      );
      marker.on("click", () => selectRef.current?.(pandal.slug));
      marker.addTo(layer);
      pandalMarkersRef.current.set(pandal.slug, marker);
    }
    // activeSlug is intentionally excluded: it is handled by the effect below
    // so selecting a pin does not rebuild every marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pandals]);

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
        // Fly only when the selection actually changes, so data refreshes and
        // re-renders never yank the map away from where the user is looking.
        if (activeSlug && flownToRef.current !== activeSlug) {
          flownToRef.current = activeSlug;
          map.flyTo([pandal.lat, pandal.lng], Math.max(map.getZoom(), 16), {
            duration: 0.7,
            easeLinearity: 0.3,
          });
        }
      } else {
        marker.setZIndexOffset(0);
      }
    }
    if (!activeSlug) flownToRef.current = null;
  }, [activeSlug, pandals]);

  // -------------------------------------------------------------- facilities
  useEffect(() => {
    const layer = facilityLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const facility of facilities) {
      const marker = L.marker([facility.lat, facility.lng], {
        icon: facilityIcon(facility.kind),
        title: facility.name,
        keyboard: false,
      });
      const phone = facility.phone
        ? `<br/><a href="tel:${escapeHtml(facility.phone)}" style="color:#f5c76a">${escapeHtml(
            facility.phone,
          )}</a>`
        : "";
      marker.bindPopup(
        `<strong>${escapeHtml(facility.name)}</strong><br/><span style="opacity:.7;font-size:11px">${escapeHtml(
          String(facility.kind),
        )}</span>${phone}`,
      );
      marker.addTo(layer);
    }
  }, [facilities]);

  // ------------------------------------------------------------------ route
  useEffect(() => {
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!route || route.geometry.length < 2) return;

    // Dark casing under the gold line keeps the route readable on any tile.
    L.polyline(route.geometry, {
      color: "#120f24",
      weight: 9,
      opacity: 0.75,
      lineCap: "round",
    }).addTo(layer);

    const line: Polyline = L.polyline(route.geometry, {
      color: "#f5c76a",
      weight: 5,
      opacity: 0.95,
      lineCap: "round",
      dashArray: route.profile === "foot" ? "1 9" : undefined,
    }).addTo(layer);

    L.circleMarker(route.geometry[route.geometry.length - 1], {
      radius: 6,
      color: "#fff",
      weight: 3,
      fillColor: "#f5c76a",
      fillOpacity: 1,
    }).addTo(layer);

    if (fitRoute) {
      map.fitBounds(line.getBounds(), { padding: [56, 96], maxZoom: 17 });
    }
  }, [route, fitRoute]);

  // ----------------------------------------------------------- live position
  useEffect(() => {
    const map = mapRef.current;
    const layer = userLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!user) return;

    L.marker([user.lat, user.lng], { icon: userIcon(), interactive: false })
      .addTo(layer)
      .bindTooltip("You are here", { direction: "top", offset: [0, -12] });

    if (user.accuracy && user.accuracy > 25) {
      const circle: Circle = L.circle([user.lat, user.lng], {
        radius: Math.min(user.accuracy, 400),
        color: "#4dabff",
        weight: 1,
        opacity: 0.4,
        fillColor: "#4dabff",
        fillOpacity: 0.12,
        interactive: false,
      });
      circle.addTo(layer);
    }

    if (follow) {
      map.setView([user.lat, user.lng], Math.max(map.getZoom(), 16), { animate: true });
    }
  }, [user, follow]);

  return <div ref={containerRef} className={className} aria-label="Naihati Kali Puja pandal map" />;
}
