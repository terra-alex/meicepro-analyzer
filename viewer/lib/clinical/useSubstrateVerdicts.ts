"use client";

import { useEffect, useReducer, useRef } from "react";
import type { DiagnosisSkin } from "@/lib/types";
import { stringField } from "@/lib/util";
import { sampleCache } from "./sampleCache";
import { sampleZone } from "./sampler";
import { buildReferences, verdictFromSignals } from "./substrate";
import { zonePolygons, polygonFor } from "./zonePolygons";
import type { ZonePolygonMap } from "./useZonePolygons";
import { computeAsymmetry } from "./asymmetry";
import type {
  AsymmetryFinding,
  ChannelKey,
  Direction,
  NormPoint,
  References,
  SampleOrFail,
  ZoneKey,
  ZoneVerdict,
} from "./types";

interface ChannelSpec {
  channel: ChannelKey;
  field: keyof DiagnosisSkin;
  maskCutoff?: number; // present → also compute coverage
}

const CHANNELS: ChannelSpec[] = [
  { channel: "deepRedMap", field: "imgDeepRedMap" },
  { channel: "brownMap", field: "imgBrownmap" },
  { channel: "bloodMap", field: "imgBloodmap" },
  { channel: "redMap", field: "imgRedmap" as keyof DiagnosisSkin },
  { channel: "deepBrownMap", field: "imgDeepBrownMap" as keyof DiagnosisSkin },
  { channel: "undereyeMask", field: "imgUndereyePng", maskCutoff: 40 },
  { channel: "brownSpotMask", field: "imgBrownSpotPng" as keyof DiagnosisSkin, maskCutoff: 40 },
  { channel: "sensitiveAreaMask", field: "imgSensitiveAreaPng" as keyof DiagnosisSkin, maskCutoff: 40 },
];

function proxyUrl(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.includes("example.invalid")) return null;
  return `/api/img?url=${encodeURIComponent(raw)}`;
}

type State = {
  loading: boolean;
  verdicts: Partial<Record<ZoneKey, ZoneVerdict>>;
  findings: AsymmetryFinding[];
  refs?: References;
  error?: string;
};
type Action =
  | { type: "reset" }
  | { type: "refs"; refs: References }
  | { type: "verdict"; v: ZoneVerdict }
  | { type: "findings"; findings: AsymmetryFinding[] }
  | { type: "done" }
  | { type: "error"; msg: string };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "reset": return { loading: true, verdicts: {}, findings: [] };
    case "refs": return { ...s, refs: a.refs };
    case "verdict": return { ...s, verdicts: { ...s.verdicts, [a.v.zone]: a.v } };
    case "findings": return { ...s, findings: a.findings };
    case "done": return { ...s, loading: false };
    case "error": return { ...s, loading: false, error: a.msg };
  }
}

export interface UseSubstrateVerdicts {
  loading: boolean;
  verdicts: Partial<Record<ZoneKey, ZoneVerdict>>;
  /** Hemiface L/R asymmetry findings (front capture only; empty for L/R captures). */
  findings: AsymmetryFinding[];
  refs?: References;
  error?: string;
}

/**
 * Compute per-zone substrate verdicts for the given face. Front-face captures
 * cover all zones; L/R captures cover only the visible hemiface zones.
 *
 * Pass `resolvedPolygons` from `useZonePolygons()` to use landmark-derived
 * polygon boundaries; falls back to hand-tuned polygons if omitted.
 *
 * Heuristic — informs only, never gates. See docs/future-plans/01-...
 */
export function useSubstrateVerdicts(
  face: DiagnosisSkin | undefined,
  direction: Direction,
  skinType?: number,
  resolvedPolygons?: ZonePolygonMap,
): UseSubstrateVerdicts {
  const [state, dispatch] = useReducer(reducer, { loading: false, verdicts: {}, findings: [] });
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!face) {
      dispatch({ type: "done" });
      return;
    }
    const f: DiagnosisSkin = face;
    const runId = ++runIdRef.current;
    const ac = new AbortController();
    dispatch({ type: "reset" });

    // Diagnosis-level cache invalidation: when face.id changes, clear stale.
    const diagId = stringField(f, "id") ?? "unknown";

    // Resolve the polygon for a zone: prefer caller-supplied landmark-derived
    // polygons, fall back to the static hand-tuned set.
    function polyFor(zone: ZoneKey): NormPoint[] {
      return resolvedPolygons?.[zone] ?? polygonFor(zone);
    }

    async function sampleZoneAllChannels(zone: ZoneKey): Promise<SampleOrFail[]> {
      const poly = polyFor(zone);
      const out: SampleOrFail[] = [];
      for (const spec of CHANNELS) {
        const key = `${diagId}:${direction}:${zone}:${spec.channel}`;
        const cached = sampleCache.get(key);
        if (cached) {
          out.push(cached);
          continue;
        }
        const raw = stringField(f, spec.field as unknown as string);
        const url = proxyUrl(raw);
        const result = await sampleZone(url, spec.channel, poly, ac.signal, {
          maskCutoff: spec.maskCutoff,
        });
        if (runId !== runIdRef.current) return out; // stale
        sampleCache.set(key, result);
        out.push(result);
      }
      return out;
    }

    async function go() {
      try {
        // Reference zones first (forehead for brown baseline, nose for deepRed).
        // Use the resolved polygon map (or fallback) to determine visibility.
        const visible = resolvedPolygons ?? zonePolygons(direction);
        const wantForehead = !!visible.forehead;
        const wantNose = !!visible.nose;
        const foreheadSamples = wantForehead
          ? await sampleZoneAllChannels("forehead")
          : undefined;
        if (runId !== runIdRef.current) return;
        const noseSamples = wantNose
          ? await sampleZoneAllChannels("nose")
          : undefined;
        if (runId !== runIdRef.current) return;

        const refs = buildReferences(foreheadSamples, noseSamples, skinType);
        dispatch({ type: "refs", refs });

        // Emit the reference zone verdicts now.
        if (foreheadSamples) {
          dispatch({
            type: "verdict",
            v: verdictFromSignals("forehead", foreheadSamples, refs),
          });
        }
        if (noseSamples) {
          dispatch({
            type: "verdict",
            v: verdictFromSignals("nose", noseSamples, refs),
          });
        }

        const finalVerdicts: Partial<Record<ZoneKey, ZoneVerdict>> = {};
        if (foreheadSamples) finalVerdicts["forehead"] = verdictFromSignals("forehead", foreheadSamples, refs);
        if (noseSamples) finalVerdicts["nose"] = verdictFromSignals("nose", noseSamples, refs);

        for (const zone of Object.keys(visible) as ZoneKey[]) {
          if (zone === "forehead" || zone === "nose") continue;
          const samples = await sampleZoneAllChannels(zone);
          if (runId !== runIdRef.current) return;
          const v = verdictFromSignals(zone, samples, refs);
          finalVerdicts[zone] = v;
          dispatch({ type: "verdict", v });
        }

        // Compute asymmetry findings from all sampled zones (front capture only).
        if (direction === 0) {
          const asymmetryFindings = computeAsymmetry(finalVerdicts);
          dispatch({ type: "findings", findings: asymmetryFindings });
        }

        dispatch({ type: "done" });
      } catch (e) {
        if (runId === runIdRef.current) {
          dispatch({ type: "error", msg: (e as Error).message });
        }
      }
    }
    go();
    return () => {
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face, direction, skinType, resolvedPolygons]);

  return state;
}
