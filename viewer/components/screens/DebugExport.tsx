"use client";

import { useState } from "react";
import { PillBtn, t } from "@/components/ds";
import type { References, ZoneKey, ZoneVerdict } from "@/lib/clinical/types";

/**
 * Tuning aid: dumps the entire verdict bundle (raw chroma, baselines,
 * coverage, masks, evidence breakdown) to the clipboard as JSON.
 *
 * Use case: open a real scan, click "Copy raw samples", paste the JSON
 * into a conversation, and tune `THRESHOLDS` in `lib/clinical/rules.ts`
 * against actual values rather than placeholder guesses.
 */
export function DebugExport({
  verdicts,
  refs,
  scanId,
  direction,
  fromLandmarks,
}: {
  verdicts: Partial<Record<ZoneKey, ZoneVerdict>>;
  refs?: References;
  scanId?: string;
  direction: -1 | 0 | 1;
  fromLandmarks: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const payload = {
      scanId: scanId ?? null,
      direction,
      fromLandmarks,
      generatedAt: new Date().toISOString(),
      refs: refs ?? null,
      zones: Object.values(verdicts)
        .filter((v): v is ZoneVerdict => !!v)
        .map((v) => ({
          zone: v.zone,
          substrate: v.substrate,
          confidence: v.confidence,
          evidence: v.evidence,
          readiness: v.readiness,
          rationale: v.rationale,
          contextModifiers: v.contextModifiers ?? null,
          samples: v.samples.map((s) => ({
            channel: s.channel,
            mean: round(s.mean),
            chroma: round(s.chroma),
            chromaCoverage: round(s.chromaCoverage),
            coverage: s.coverage != null ? round(s.coverage) : null,
          })),
          failed: v.failed,
        })),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: stash on window so the user can grab it from DevTools.
      (window as unknown as { __substrateDebug?: unknown }).__substrateDebug = payload;
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  const zoneCount = Object.keys(verdicts).length;
  if (zoneCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <PillBtn sm onClick={copy}>
        {copied ? "Copied ✓" : "Copy raw samples"}
      </PillBtn>
      <span
        className="font-mono-fine"
        style={{ fontSize: 10.5, color: t.faint }}
      >
        {zoneCount} zones · for threshold tuning
      </span>
    </div>
  );
}

function round(n: number | null | undefined): number | null {
  if (n == null || !isFinite(n)) return null;
  return Math.round(n * 1000) / 1000;
}
