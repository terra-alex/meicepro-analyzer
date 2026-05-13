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
  /** 0..1 normalised mean RGB intensity inside the zone polygon (legacy). */
  mean: number;
  /**
   * 0..1 chromatic saturation — mean of `(max(R,G,B) - min(R,G,B)) / 255`
   * inside the polygon. False-color heatmaps overlay saturated colour
   * where the algorithm detected signal; underlying skin is near-gray.
   * This is the right scalar for heatmap channels (deepRedMap, brownMap,
   * bloodMap, redMap, deepBrownMap) — independent of overall brightness.
   */
  chroma: number;
  /**
   * 0..1 — fraction of pixels with chroma above a strong-signal cutoff.
   * Captures "what fraction of the zone is genuinely lit up" rather than
   * "what's the average brightness."
   */
  chromaCoverage: number;
  /** Optional mask coverage 0..1 — fraction of zone pixels above a brightness cutoff. */
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
  /** brownMap chroma of forehead/glabella reference, if available. */
  brownBaseline?: number;
  /** deepRedMap chroma of the nasal bridge reference, if available. */
  deepRedBaseline?: number;
  /**
   * bloodMap chroma of the nasal bridge reference, if available. Nose has
   * baseline surface vascularity but no eyelid pinkness — subtracting it
   * from every zone's bloodMap reading avoids reading eyelid-skin baseline
   * as "active telangiectasia."
   */
  bloodBaseline?: number;
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

// ── Decision trace + per-channel reads (for the dynamic Interpretation UI) ──

export type ChannelHeat = "hot" | "warm" | "cold" | "branching" | "neutral";

export interface ChannelRead {
  channel: ChannelKey;
  /** Display name e.g. "deepRedMap", "brownMap", "bloodmap", "undereye mask". */
  name: string;
  /** Grouping label e.g. "Vascular · deep", "Pigment · epidermal". */
  group: string;
  /** Raw 0..1 mean from the sample (null if the channel failed). */
  mean: number | null;
  /** Optional binary-mask coverage 0..1 (e.g. undereye mask). */
  coverage?: number;
  heat: ChannelHeat;
  /** One short clinical sentence — what this channel says for the verdict. */
  explain: string;
}

export interface DecisionRow {
  /** Left column — the rule signal. */
  signal: string;
  /** Middle column — how to read it. */
  read: string;
  /** Right column — what it lets us conclude. */
  verdict: string;
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
  /**
   * Per-channel display reads — heat tier + one-line explanation.
   * Drives the 4-channel Interpretation cards on the Substrate tab.
   */
  channelReads: ChannelRead[];
  /**
   * Ordered table of (signal, read, verdict) rows that justified this
   * verdict. Drives the Logic table on the Substrate tab.
   */
  decisionTrace: DecisionRow[];
}
