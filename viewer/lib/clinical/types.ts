// Pure types for the per-zone substrate heuristic.
// No browser APIs, no React — safe to import anywhere.
// See docs/future-plans/01-dynamic-plan-substrate.md for the design.

export type Direction = -1 | 0 | 1;

export type ZoneKey =
  | "periorbitalL"
  | "periorbitalR"
  | "glabella"
  | "forehead"
  | "leftCheekUpperMedial"
  | "leftCheekLowerLateral"
  | "rightCheekUpperMedial"
  | "rightCheekLowerLateral"
  | "nose"
  | "chin";

export type Substrate =
  | "melanin_lentigo"
  | "melanin_melasma"
  | "melanin_pih"
  | "hemosiderin"
  | "telangiectasia"
  | "mixed"
  | "inflammation"
  | "hypopigmentation"
  | "structural_shadow"
  | "unclear"
  | "clear"
  | "no_data"
  | "occluded";

export type ChannelKey =
  | "deepRedMap"
  | "brownMap"
  | "bloodMap"
  | "redMap"
  | "deepBrownMap"
  | "undereyeMask"
  | "brownSpotMask"
  | "sensitiveAreaMask";

export type Confidence = "high" | "moderate" | "low";

export type Readiness =
  | "proceed"
  | "dermatoscopy-first"
  | "labs-first"
  | "not-applicable";

export interface NormPoint {
  x: number; // 0..1 image-fraction
  y: number;
}

export interface ZoneSample {
  channel: ChannelKey;
  /** 0..1 normalised mean intensity inside the zone polygon. */
  mean: number;
  /** Optional mask coverage 0..1 — fraction of zone pixels above a binary cutoff. */
  coverage?: number;
}

export interface FailedSample {
  channel: ChannelKey;
  error: "no_url" | "fetch_failed" | "decode" | "taint";
}

export type SampleOrFail = ZoneSample | FailedSample;

export function isSample(s: SampleOrFail): s is ZoneSample {
  return (s as ZoneSample).mean !== undefined;
}

/** Within-scan reference baselines used for normalisation. */
export interface References {
  /** brownMap mean of forehead/glabella reference, if available. */
  brownBaseline?: number;
  /** deepRedMap mean of the nasal bridge reference, if available. */
  deepRedBaseline?: number;
  /** Whether the reference zone is itself hot → low-confidence fallback. */
  referenceDirty: boolean;
  /** Fitzpatrick 1..6 from API (algorithm-derived preferred over self-report). */
  skinType?: number;
  /**
   * Patient context flags that modify prior probabilities in verdictFromSignals.
   * Optional — when absent the algorithm runs without context priors.
   */
  patientContext?: import("@/lib/context").PatientContext;
}

// ── Hemiface asymmetry ──────────────────────────────────────────────────────

export type AsymmetryLevel = "none" | "mild" | "notable" | "marked";

export interface AsymmetryFinding {
  /** The two mirrored zones being compared. */
  zonePair: [ZoneKey, ZoneKey];
  channel: ChannelKey;
  /** max/min ratio — always ≥ 1. */
  ratio: number;
  dominantSide: "left" | "right";
  level: AsymmetryLevel;
  /** Short clinical interpretation sentence. */
  interpretation: string;
}

export interface ZoneVerdict {
  zone: ZoneKey;
  substrate: Substrate;
  confidence: Confidence;
  /** 0..4 evidence score from rules.ts. */
  evidence: number;
  readiness: Readiness;
  readinessReason?: string;
  /** Short clinical sentence — what the rules saw. */
  rationale: string;
  /** Per-channel raw means used in the decision, for display + audit. */
  samples: ZoneSample[];
  /** Channels that failed to load, if any. */
  failed: FailedSample[];
  /** Hard contraindications attached to this verdict. */
  doNots: string[];
  /** Suggested next action (informational only). */
  treatmentHint?: string;
  /**
   * Audit trail of context flags that adjusted evidence for this verdict.
   * E.g. ["valsalvaHx+1", "hfeKnownOrFerritinHigh+1"]
   */
  contextModifiers?: string[];
}
