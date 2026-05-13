"use client";

import { useState } from "react";
import type { DiagnosisSkin } from "@/lib/types";
import type { PatientContext } from "@/lib/context";
import { saveContext } from "@/lib/context";
import { useSubstrateVerdicts, useZonePolygons } from "@/lib/clinical";
import type { ZoneKey } from "@/lib/clinical/types";
import { FocusZonePanel } from "./FocusZonePanel";
import {
  ZoneVerdictGrid,
  fitzpatrickFromFace,
} from "./ZoneVerdictGrid";

/**
 * Substrate Inspector — fully dynamic.
 * - Focus panel (top): the highest-priority zone verdict on the loaded scan,
 *   with channel cards, interpretation prose, decision-rule trace, and
 *   treatment-hint card all derived from `verdictFromSignals` — no hardcoded
 *   values. The focus zone is clickable from the chip strip.
 * - Verdict grid (bottom): every zone the algorithm computed for this
 *   direction, including asymmetry findings when on the front capture.
 *
 * Both the panel and the grid run their own `useSubstrateVerdicts` hook —
 * `sampleCache` deduplicates the canvas work so the second call is a
 * cache-hit storm rather than re-sampling pixels.
 */
export function SubstrateScreen({
  face,
  direction,
  patientContext,
  gender,
  onContextChange,
  diagId,
}: {
  face?: DiagnosisSkin;
  direction: -1 | 0 | 1;
  patientContext?: PatientContext | null;
  gender?: number | null;
  onContextChange?: (ctx: PatientContext) => void;
  diagId?: string;
}) {
  const [focusZone, setFocusZone] = useState<ZoneKey | undefined>(undefined);

  return (
    <main className="px-7 pb-12">
      <FocusZonePanelLive
        face={face}
        direction={direction}
        skinType={fitzpatrickFromFace(face)}
        focusZone={focusZone}
        onFocusZoneChange={setFocusZone}
      />

      <ZoneVerdictGrid
        face={face}
        direction={direction}
        skinType={fitzpatrickFromFace(face)}
        patientContext={patientContext}
        gender={gender}
        onContextChange={(ctx) => {
          if (diagId) saveContext(diagId, ctx);
          onContextChange?.(ctx);
        }}
      />
    </main>
  );
}

/**
 * Thin wrapper that runs the verdicts hook so FocusZonePanel can stay
 * presentation-only. Kept here (rather than inside FocusZonePanel) so the
 * panel is trivially testable with hand-built verdicts.
 */
function FocusZonePanelLive({
  face,
  direction,
  skinType,
  focusZone,
  onFocusZoneChange,
}: {
  face?: DiagnosisSkin;
  direction: -1 | 0 | 1;
  skinType?: number;
  focusZone?: ZoneKey;
  onFocusZoneChange?: (z: ZoneKey) => void;
}) {
  const { polygons } = useZonePolygons(face, direction);
  const { verdicts } = useSubstrateVerdicts(face, direction, skinType, polygons);
  return (
    <FocusZonePanel
      face={face}
      direction={direction}
      verdicts={verdicts}
      focusZone={focusZone}
      onFocusZoneChange={onFocusZoneChange}
    />
  );
}
