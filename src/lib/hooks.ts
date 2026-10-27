"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCrowd, loadPandals, type PandalsResponse } from "./client-api";
import type { CrowdInfo, LatLng, Pandal } from "./types";

export interface GeoState {
  position: LatLng | null;
  accuracy: number | null;
  status: "idle" | "granted" | "denied" | "unavailable" | "unsupported";
}

/**
 * Live device position. `watchPosition` keeps the marker moving as the visitor
 * walks, which is the whole point of the QR-code use case.
 */
export function useGeolocation(enabled: boolean): GeoState & { request: () => void } {
  const [state, setState] = useState<GeoState>({
    position: null,
    accuracy: null,
    status: "idle",
  });
  const requestedRef = useRef(false);

  const request = useCallback(() => {
    requestedRef.current = true;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState((current) => ({ ...current, status: "unsupported" }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          status: "granted",
        });
      },
      (error) => {
        setState((current) => ({
          ...current,
          status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        }));
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState((current) => ({ ...current, status: "unsupported" }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          position: { lat: position.coords.latitude, lng: position.coords.longitude },
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          status: "granted",
        });
      },
      (error) => {
        setState((current) => ({
          ...current,
          status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return { ...state, request };
}

export function usePandals(): {
  pandals: (Pandal & { crowd?: CrowdInfo })[];
  source: string;
  loading: boolean;
  error: string | null;
  reload: (force?: boolean) => Promise<void>;
} {
  const [pandals, setPandals] = useState<(Pandal & { crowd?: CrowdInfo })[]>([]);
  const [source, setSource] = useState<string>("seed");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const payload: PandalsResponse = await loadPandals(force);
      setPandals(payload.pandals ?? []);
      setSource(payload.source ?? "seed");
      setError(null);
    } catch {
      setError("load-failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { pandals, source, loading, error, reload };
}

/**
 * Crowd levels that seed immediately from the `/api/pandals` response (saving
 * an extra network round-trip on page load) and refresh in the background.
 */
export function useCrowdLevels(
  slugs: string[],
  intervalMs = 90_000,
): {
  levels: Record<string, CrowdInfo>;
  setLevel: (slug: string, info: CrowdInfo) => void;
  refresh: () => Promise<void>;
} {
  const [levels, setLevels] = useState<Record<string, CrowdInfo>>({});
  const key = slugs.join(",");

  // Seed immediately from cached pandals response if available
  useEffect(() => {
    if (key.length === 0) return;
    void loadPandals(false)
      .then((payload) => {
        const seeded: Record<string, CrowdInfo> = {};
        for (const p of payload.pandals ?? []) {
          const withCrowd = p as Pandal & { crowd?: CrowdInfo };
          if (withCrowd.crowd) seeded[p.slug] = withCrowd.crowd;
        }
        if (Object.keys(seeded).length > 0) {
          setLevels((prev) => ({ ...seeded, ...prev }));
        }
      })
      .catch(() => {});
  }, [key]);

  const refresh = useCallback(async () => {
    if (key.length === 0) return;
    try {
      const next = await fetchCrowd(key.split(","));
      setLevels(next);
    } catch {
      // keep previous levels on transient failure
    }
  }, [key]);

  useEffect(() => {
    if (key.length === 0) return;
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs, key]);

  const setLevel = useCallback((slug: string, info: CrowdInfo) => {
    setLevels((current) => ({ ...current, [slug]: info }));
  }, []);

  return { levels, setLevel, refresh };
}

export function useTicker(intervalMs = 60_000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return tick;
}

export function useCopy(timeoutMs = 2000): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(
    (text: string) => {
      void navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), timeoutMs);
      });
    },
    [timeoutMs],
  );
  return { copied, copy };
}
