// Threshold + contraindication lookup tables for the substrate heuristic.
// Tuning surface: swap values here without touching the rule engine.
// All thresholds 0..1 unless otherwise noted.

import type { Substrate } from "./types";

// NOTE: as of v2 the engine measures **chromatic saturation** of each
// false-color heatmap channel (mean of `(max-min)/255` per pixel inside the
// polygon), NOT RGB brightness. Chroma is bounded ~0..0.6 in practice: gray
// skin ~0.05, faint heatmap overlay ~0.10–0.20, saturated overlay ~0.30+.
// All `*Hemo` / `*Telan` / `*Melanin` thresholds are now in chroma units.
// All vascular / pigment channels additionally have their nose- or forehead-
// baseline chroma subtracted before comparison — see References.
export const THRESHOLDS = {
  // Hemosiderin: deepRedMap chroma elevated (baseline-subtracted),
  // brownMap cold relative, bloodmap cold absolute.
  deepRedHemo: 0.12, // chroma delta vs nose baseline
  brownColdRelative: 0.06, // brownMap chroma < deepRed chroma - 0.06
  bloodColdHemo: 0.08, // bloodMap chroma delta vs nose baseline

  // Telangiectasia — needs both saturation AND coverage to fire
  bloodHotTelan: 0.15, // chroma delta vs nose baseline
  bloodCoverageTelan: 0.12, // ≥12% of zone pixels strongly lit
  redmapHotTelan: 0.15,

  // Melanin
  brownDeltaMelanin: 0.08, // chroma delta vs forehead reference
  brownSpotCoverageLentigo: 0.05, // ≥5% of zone pixels in brownSpot mask
  brownAbsoluteFallback: 0.2, // chroma, used when reference zone is dirty

  // Inflammation
  sensitiveWarn: 0.1,
  sensitiveHigh: 0.2,

  // Hypopigmentation (vitiligo flag) — chroma delta below baseline
  brownDeltaHypo: -0.04,

  // Mixed: primary/secondary ratio cutoff for "unambiguous"
  primaryRatio: 1.5,

  // Occlusion — chroma near zero across primary channels
  occludedMaxMean: 0.03,

  // Reference-dirty trigger — forehead itself reading as melanin-hot
  referenceDirtyBrown: 0.22,

  // Asymmetry
  asymmetryRatioMild: 1.3,
  asymmetryRatioNotable: 1.7,
  asymmetryRatioMarked: 2.5,
} as const;

/**
 * Hard contraindication lookup — fires regardless of confidence.
 * Keyed by substrate; modifiers (Fitz, pregnancy, etc.) layered on by caller.
 */
export const CONTRAINDICATIONS: Record<Substrate, string[]> = {
  melanin_lentigo: [],
  melanin_melasma: [
    "No standalone IPL — rebound melasma risk; topical-first pathway required",
    "Avoid aggressive ablative resurfacing",
  ],
  melanin_pih: [
    "Defer IPL until PIH is mature (≥3 months) and underlying inflammation is quiet",
  ],
  hemosiderin: [
    "Not a melanin target — hydroquinone / IPL inappropriate",
    "Periorbital Nd:YAG requires internal corneal shields + operator certification",
  ],
  telangiectasia: [
    "Nd:YAG 1064 is not the first-line tool — PDL/KTP is",
  ],
  mixed: [
    "Sequential treatment required — address vascular component before pigment",
    "Single-modality IPL contraindicated",
  ],
  inflammation: [
    "Defer all energy treatment until barrier is quiet",
    "No peels / no ablative laser in this zone today",
  ],
  hypopigmentation: [
    "Hard contraindication for IPL / most laser — refer for in-person assessment",
  ],
  structural_shadow: [
    "Not a pigment or vascular finding — topicals and laser non-responsive",
  ],
  unclear: ["Do not act on this verdict without clinician review"],
  clear: [],
  no_data: ["No usable channel data — re-scan or check image proxy"],
  occluded: ["Zone occluded (hair / ear / off-axis) — re-frame and rescan"],
};

export const TREATMENT_HINT: Partial<Record<Substrate, string>> = {
  melanin_lentigo: "IPL 515–560 nm or Q-switched 532 nm (Fitz-adjusted)",
  melanin_melasma: "Triple-combo topical · tranexamic acid · gentle adjunct only",
  melanin_pih: "Azelaic acid + niacinamide; address underlying inflammation",
  hemosiderin: "Q-switched / picosecond Nd:YAG 1064 nm (corneal shields if periorbital)",
  telangiectasia: "PDL 595 nm or KTP 532 nm referral",
  mixed: "Stage: vascular first (Nd:YAG / PDL) → re-assess melanin separately",
  inflammation: "Barrier repair + anti-inflammatory; defer energy",
  hypopigmentation: "Specialist referral — do not treat with energy",
  structural_shadow: "Consider tear-trough filler or assessment for fat pseudoherniation",
};

/**
 * Per-Fitzpatrick safety overlays applied on top of CONTRAINDICATIONS.
 * Returned as an array of additional strings.
 */
export function fitzpatrickOverlays(
  skinType: number | undefined,
  substrate: Substrate,
): string[] {
  if (skinType == null) return [];
  const adds: string[] = [];
  if (skinType >= 3) {
    adds.push("Fitz III+ — mandatory test patch before any IPL/laser");
  }
  if (skinType >= 5 && substrate.startsWith("melanin")) {
    adds.push("Fitz V–VI — IPL contraindicated regardless of substrate");
  }
  return adds;
}
