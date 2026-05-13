"use client";

import { useState } from "react";
import type { DiagnosisSkin } from "@/lib/types";
import type { PatientContext } from "@/lib/context";
import { saveContext } from "@/lib/context";
import { useSubstrateVerdicts, useZonePolygons } from "@/lib/clinical";
import type { ZoneKey } from "@/lib/clinical/types";
import { stringField } from "@/lib/util";
import { FocusZonePanel } from "./FocusZonePanel";
import { DebugExport } from "./DebugExport";
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
 * - Debug export (top right): copies raw chroma + baselines + coverage as
 *   JSON for threshold-tuning conversations.
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
  const skinType = fitzpatrickFromFace(face);
  const { polygons, fromLandmarks } = useZonePolygons(face, direction);
  const { verdicts, refs } = useSubstrateVerdicts(face, direction, skinType, polygons);

  const scanId = face ? stringField(face, "id") ?? undefined : undefined;

  return (
    <main className="px-7 pb-12">
      <div
        className="flex justify-end pt-4"
        style={{ marginBottom: -8 }}
      >
        <DebugExport
          verdicts={verdicts}
          refs={refs}
          scanId={scanId}
          direction={direction}
          fromLandmarks={fromLandmarks}
        />
      </div>

      <FocusZonePanel
        face={face}
        direction={direction}
        verdicts={verdicts}
        focusZone={focusZone}
        onFocusZoneChange={setFocusZone}
      />

      <ZoneVerdictGrid
        face={face}
        direction={direction}
        skinType={skinType}
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
