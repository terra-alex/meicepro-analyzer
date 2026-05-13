"use client";

// Hook that resolves per-zone polygons for a given face capture.
//
// Resolution order:
//   1. Parse the jsonAging asset (proxied via /api/img — the proxy forwards
//      the upstream Content-Type, so JSON payloads pass through correctly).
//   2. Derive zone polygons from the landmark mesh via polygonsFromLandmarks().
//   3. Fill any missing zones with the hand-tuned fallback from zonePolygons().
//
// The /api/img proxy allows all *.aliyuncs.com hosts and returns the upstream
// Content-Type unchanged, so it works for JSON assets without a separate route.

import { useEffect, useState } from "react";
import type { DiagnosisSkin } from "@/lib/types";
import type { AgingJson } from "./landmarkPolygons";
import { polygonsFromLandmarks } from "./landmarkPolygons";
import { zonePolygons } from "./zonePolygons";
import type { Direction, NormPoint, ZoneKey } from "./types";

export type ZonePolygonMap = Partial<Record<ZoneKey, NormPoint[]>>;

export interface UseZonePolygons {
  polygons: ZonePolygonMap;
  /** true while the jsonAging fetch is in flight */
  loading: boolean;
  /** non-null if the fetch/parse failed (fallback polygons are still provided) */
  error: string | null;
  /** true when polygons were derived from real landmarks */
  fromLandmarks: boolean;
}

function proxyUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.includes("example.invalid")) return null;
  return `/api/img?url=${encodeURIComponent(raw)}`;
}

/**
 * Resolve per-zone polygons for `face`. Prefers landmark-derived polygons
 * from `face.jsonAging`; falls back to the static hand-tuned set.
 */
export function useZonePolygons(
  face: DiagnosisSkin | undefined,
  direction: Direction,
): UseZonePolygons {
  const fallback = zonePolygons(direction);
  const [state, setState] = useState<UseZonePolygons>({
    polygons: fallback,
    loading: false,
    error: null,
    fromLandmarks: false,
  });

  useEffect(() => {
    const url = proxyUrl(face?.jsonAging);
    if (!url) {
      // No jsonAging URL — use fallback immediately.
      setState({ polygons: zonePolygons(direction), loading: false, error: null, fromLandmarks: false });
      return;
    }

    const ac = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null, fromLandmarks: false }));

    fetch(url, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AgingJson>;
      })
      .then((mesh) => {
        const derived = polygonsFromLandmarks(mesh);
        // Merge: landmark-derived zones take priority; missing keys fall back.
        const fb = zonePolygons(direction);
        const merged: ZonePolygonMap = { ...fb, ...derived };
        setState({ polygons: merged, loading: false, error: null, fromLandmarks: true });
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name === "AbortError") return;
        const msg = (e as Error)?.message ?? String(e);
        // Fetch failed — fall back gracefully.
        setState({
          polygons: zonePolygons(direction),
          loading: false,
          error: `landmark fetch failed: ${msg}`,
          fromLandmarks: false,
        });
      });

    return () => ac.abort();
  }, [face?.jsonAging, direction]);

  return state;
}
