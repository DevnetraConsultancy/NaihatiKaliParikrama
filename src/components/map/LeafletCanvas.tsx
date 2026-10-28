"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type {
  Circle,
  CircleMarker,
  LayerGroup,
  Map as LeafletMap,
  Marker,
  Polyline,
} from "leaflet";
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

function isDivinePandal(slug: string): boolean {
  return slug === "naihati-boromaa-kali-puja";
}

function pinIcon(category: PandalCategory, active: boolean, isDivine = false): L.DivIcon {
  if (isDivine) {
    return L.divIcon({
      className: "nkp-pin-wrapper nkp-pin-wrapper--divine",
      html: `<div class="nkp-pin nkp-pin--divine${active ? " nkp-pin--active" : ""}">
        <div class="nkp-divine-aura"></div>
        <svg class="nkp-divine-crown" viewBox="0 0 32 16" width="32" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0L20 6L26 2L24 10H8L6 2L12 6L16 0Z" fill="url(#crownGold)"/>
          <circle cx="16" cy="2.5" r="1.8" fill="#ef4444"/>
          <circle cx="8" cy="3.5" r="1.3" fill="#ffeaa7"/>
          <circle cx="24" cy="3.5" r="1.3" fill="#ffeaa7"/>
          <circle cx="16" cy="8" r="1.4" fill="#ffeaa7"/>
          <defs>
            <linearGradient id="crownGold" x1="6" y1="0" x2="26" y2="10" gradientUnits="userSpaceOnUse">
              <stop stop-color="#fff5c0"/>
              <stop offset="0.5" stop-color="#f5c76a"/>
              <stop offset="1" stop-color="#b8860b"/>
            </linearGradient>
          </defs>
        </svg>
        <div class="nkp-pin__head nkp-pin__head--divine">
          <img src="/boro-maa-emblem.png" alt="Naihati Boro Maa" class="nkp-pin__img" loading="eager" />
        </div>
        <div class="nkp-pin__tip nkp-pin__tip--divine"></div>
      </div>`,
      iconSize: [64, 82],
      iconAnchor: [32, 80],
      popupAnchor: [0, -72],
    });
  }

  return L.divIcon({
    className: "nkp-pin-wrapper",
    html: `<div class="nkp-pin nkp-pin--${category}${active ? " nkp-pin--active" : ""}">
        ${active ? '<div class="nkp-pin__pulse"></div>' : ""}
        <div class="nkp-pin__head">
          <img src="/kali-mandala.webp" alt="Maa Kali" class="nkp-pin__img" loading="eager" />
        </div>
        <div class="nkp-pin__tip"></div>
      </div>`,
    iconSize: [38, 48],
    iconAnchor: [19, 46],
    popupAnchor: [0, -42],
  });
}

function facilityIcon(kind: string, active = false): L.DivIcon {
  if (kind === "police" || kind === "hospital") {
    const isPolice = kind === "police";
    const imgUrl = isPolice ? "/police-pin.webp" : "/hospital-pin.webp";
    const label = isPolice ? "Police" : "Hospital";
    return L.divIcon({
      className: "nkp-facility-pin-wrapper",
      html: `<div class="nkp-facility-pin nkp-facility-pin--${kind}${active ? " nkp-facility-pin--active" : ""}">
        <div class="nkp-facility-pin__head">
          <img src="${imgUrl}" alt="${label}" class="nkp-facility-pin__img" loading="eager" />
        </div>
        <div class="nkp-facility-pin__tip nkp-facility-pin__tip--${kind}"></div>
      </div>`,
      iconSize: [36, 44],
      iconAnchor: [18, 42],
      popupAnchor: [0, -38],
    });
  }

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
  onUserPan?: () => void;
  className?: string;
}

/**
 * Interactive Naihati Map Canvas:
 * - Divine Theme for Naihati Boro Maa (Golden Mukut Crown, radiating aura, sacred Boro Maa emblem)
 * - Fierce Kali Golden Mandala Emblem for all other 27 Kali Puja pandal locations
 * - Smooth Android navigation without tile flickering or coordinate jitter
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
  onUserPan,
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
  const onUserPanRef = useRef(onUserPan);

  // Persistent geometry refs to avoid Android re-render thrashing & flickering
  const userMarkerRef = useRef<Marker | null>(null);
  const userCircleRef = useRef<Circle | null>(null);
  const routeLineRef = useRef<Polyline | null>(null);
  const routeCasingRef = useRef<Polyline | null>(null);
  const routeConnectorRef = useRef<Polyline | null>(null);
  const destMarkerRef = useRef<CircleMarker | null>(null);
  const lastRouteKeyRef = useRef<string | null>(null);

  selectPandalRef.current = onSelectPandal;
  selectFacilityRef.current = onSelectFacility;
  clickRef.current = onMapClick;
  readyRef.current = onReady;
  onUserPanRef.current = onUserPan;

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
      inertiaDeceleration: 3000,
      inertiaMaxSpeed: 1500,
      zoomAnimation: true,
      wheelPxPerZoomLevel: 120,
      touchZoom: true,
      bounceAtZoomLimits: false,
    });

    // Disable legacy emulated tap to ensure butter-smooth Android touch panning
    if ((map as any).tap) {
      (map as any).tap.disable();
    }

    // High performance tile configuration:
    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
      subdomains: "abc",
      keepBuffer: 8,
      updateWhenIdle: false,
      updateWhenZooming: true,
      updateInterval: 80,
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    facilityLayerRef.current = L.layerGroup().addTo(map);
    pandalLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      clickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    map.on("dragstart", () => {
      onUserPanRef.current?.();
    });

    map.on("movestart", (e: any) => {
      if (e?.originalEvent) {
        onUserPanRef.current?.();
      }
    });

    mapRef.current = map;
    readyRef.current?.(map);

    // Recalculate dimensions once layout settles
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
      userMarkerRef.current = null;
      userCircleRef.current = null;
      routeLineRef.current = null;
      routeCasingRef.current = null;
      routeConnectorRef.current = null;
      destMarkerRef.current = null;
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
      const isDivine = isDivinePandal(pandal.slug);
      const isActive = pandal.slug === activeSlug;
      const marker = L.marker([pandal.lat, pandal.lng], {
        icon: pinIcon(pandal.category, isActive, isDivine),
        title: lang === "bn" ? pandal.name_bn : pandal.name_en,
        riseOnHover: true,
        zIndexOffset: isActive ? 3000 : isDivine ? 2500 : pandal.featured ? 300 : 100,
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
      const isDivine = isDivinePandal(pandal.slug);
      const isActive = pandal.slug === activeSlug;
      marker.setIcon(pinIcon(pandal.category, isActive, isDivine));
      if (isActive) {
        marker.setZIndexOffset(3000);
        if (activeSlug && flownToRef.current !== `pandal:${activeSlug}` && !fitRoute) {
          flownToRef.current = `pandal:${activeSlug}`;
          map.flyTo([pandal.lat, pandal.lng], Math.max(map.getZoom(), 16), {
            duration: 0.65,
            easeLinearity: 0.3,
          });
        }
      } else {
        marker.setZIndexOffset(isDivine ? 2500 : pandal.featured ? 300 : 100);
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

    if (!route || route.geometry.length < 2) {
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
      if (routeCasingRef.current) {
        routeCasingRef.current.remove();
        routeCasingRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      if (routeConnectorRef.current) {
        routeConnectorRef.current.remove();
        routeConnectorRef.current = null;
      }
      lastRouteKeyRef.current = null;
      return;
    }

    const dest = route.geometry[route.geometry.length - 1];
    const primaryColor = route.profile === "car" ? "#2563eb" : "#0284c7";
    const routeKey = `${route.distance_m}:${route.duration_min}:${dest[0].toFixed(5)},${dest[1].toFixed(5)}:${route.profile}`;

    // 1. Dark outer road casing (Google Maps style)
    if (!routeCasingRef.current) {
      routeCasingRef.current = L.polyline(route.geometry, {
        color: "#070b19",
        weight: 10,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);
    } else {
      routeCasingRef.current.setLatLngs(route.geometry);
    }

    // 2. Vibrant primary navigation line
    if (!routeLineRef.current) {
      routeLineRef.current = L.polyline(route.geometry, {
        color: primaryColor,
        weight: 6,
        opacity: 0.98,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);
    } else {
      routeLineRef.current.setLatLngs(route.geometry);
      routeLineRef.current.setStyle({ color: primaryColor });
    }

    // 3. Destination target ring
    if (!destMarkerRef.current) {
      destMarkerRef.current = L.circleMarker(dest, {
        radius: 9,
        color: "#f5c76a",
        weight: 3,
        fillColor: primaryColor,
        fillOpacity: 1,
      }).addTo(layer);
    } else {
      destMarkerRef.current.setLatLng(dest);
      destMarkerRef.current.setStyle({ fillColor: primaryColor });
    }

    // 4. Fit bounds when route is first initialized
    if (fitRoute && lastRouteKeyRef.current !== routeKey) {
      lastRouteKeyRef.current = routeKey;
      if (routeLineRef.current) {
        map.fitBounds(routeLineRef.current.getBounds(), {
          paddingTopLeft: [36, 130],
          paddingBottomRight: [36, 220],
          maxZoom: 17,
        });
      }
    }
  }, [route, fitRoute]);

  // ----------------------------------------------------------- live position
  useEffect(() => {
    const map = mapRef.current;
    const userLayer = userLayerRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !userLayer) return;

    if (!user) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userCircleRef.current) {
        userCircleRef.current.remove();
        userCircleRef.current = null;
      }
      if (routeConnectorRef.current) {
        routeConnectorRef.current.remove();
        routeConnectorRef.current = null;
      }
      return;
    }

    // 1. User marker
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([user.lat, user.lng], {
        icon: userIcon(lang),
        interactive: false,
        zIndexOffset: 1200,
      }).addTo(userLayer);
    } else {
      userMarkerRef.current.setLatLng([user.lat, user.lng]);
      userMarkerRef.current.setIcon(userIcon(lang));
    }

    // 2. User accuracy circle
    if (user.accuracy && user.accuracy > 15) {
      const radius = Math.min(user.accuracy, 280);
      if (!userCircleRef.current) {
        userCircleRef.current = L.circle([user.lat, user.lng], {
          radius,
          color: "#3b82f6",
          weight: 1.2,
          opacity: 0.45,
          fillColor: "#3b82f6",
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(userLayer);
      } else {
        userCircleRef.current.setLatLng([user.lat, user.lng]);
        userCircleRef.current.setRadius(radius);
      }
    } else if (userCircleRef.current) {
      userCircleRef.current.remove();
      userCircleRef.current = null;
    }

    // 3. Smooth connector line from user's live position to route start point
    if (route && route.geometry && route.geometry.length > 0 && routeLayer) {
      const firstPt = route.geometry[0];
      const pts: [number, number][] = [
        [user.lat, user.lng],
        [firstPt[0], firstPt[1]],
      ];
      if (!routeConnectorRef.current) {
        routeConnectorRef.current = L.polyline(pts, {
          color: "#38bdf8",
          weight: 4,
          opacity: 0.85,
          dashArray: "4 8",
        }).addTo(routeLayer);
      } else {
        routeConnectorRef.current.setLatLngs(pts);
      }
    } else if (routeConnectorRef.current) {
      routeConnectorRef.current.remove();
      routeConnectorRef.current = null;
    }

    // 4. Smooth camera follow
    if (follow) {
      map.panTo([user.lat, user.lng], {
        animate: true,
        duration: 0.6,
        easeLinearity: 0.25,
      });
    }
  }, [user, follow, lang, route]);

  return <div ref={containerRef} className={className} aria-label="Naihati Kali Puja pandal map" />;
}
