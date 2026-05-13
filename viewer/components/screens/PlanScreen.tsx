"use client";

import { ComingSoonScreen } from "./ComingSoonScreen";

export function PlanScreen() {
  return (
    <ComingSoonScreen
      kicker="Treatment plan · per-zone"
      title="Plan"
      intent="A phased treatment plan derived from the substrate verdicts on this scan and the patient's history flags. Each zone will get an ordered recommendation list, hard contraindications, and a readiness flag (proceed / dermatoscopy-first / labs-first)."
      bullets={[
        "Per-zone phases ordered by readiness, not by anatomy",
        "Hard contraindications from a lookup table (e.g. Fitz V–VI + IPL)",
        "Verdict + patient-context → recommendation, with the rule trace shown",
        "Asymmetric findings split into L vs R entries, never merged",
      ]}
      needs={[
        "Per-zone substrate heuristic in `lib/clinical/` (in progress)",
        "Patient-context checklist (Fitzpatrick, isotretinoin, hormonal, etc.)",
        "Validation cohort before any procedure-gating is wired",
      ]}
    />
  );
}
