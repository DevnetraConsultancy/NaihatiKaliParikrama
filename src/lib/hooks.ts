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
    setState((current) => (current.status === "idle" ? { ...current, status: "idle" } : current));
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
  pandals: Pandal[];
  source: string;
  loading: boolean;
  error: string | null;
  reload: (force?: boolean) => Promise<void>;
} {
  const [pandals, setPandals] = useState<Pandal[]>([]);
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

/** Crowd levels that refresh on their own so the map stays current. */
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

  const refresh = useCallback(async () => {
    if (key.length === 0) return;
    try {
      const next = await fetchCrowd(key.split(","));
      setLevels(next);
    } catch {
      // keep the previous levels on a transient failure
    }
  }, [key]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  const setLevel = useCallback((slug: string, info: CrowdInfo) => {
    setLevels((current) => ({ ...current, [slug]: info }));
  }, []);

  return { levels, setLevel, refresh };
}

/** Re-renders on an interval — used for the "area crowd now" clock. */
export function useTicker(intervalMs = 60_000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return tick;
}

/** Small helper for copy-to-clipboard feedback. */
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
