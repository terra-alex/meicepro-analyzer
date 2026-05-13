// Pure decision rules. Takes per-channel samples + within-scan refs + skinType,
// returns a ZoneVerdict. No browser APIs; safe to unit-test in Node.

import {
  CONTRAINDICATIONS,
  THRESHOLDS,
  TREATMENT_HINT,
  fitzpatrickOverlays,
} from "./rules";
import type {
  ChannelKey,
  Confidence,
  FailedSample,
  Readiness,
  References,
  SampleOrFail,
  Substrate,
  ZoneKey,
  ZoneSample,
  ZoneVerdict,
} from "./types";

function pick(samples: ZoneSample[], k: ChannelKey): number | undefined {
  return samples.find((s) => s.channel === k)?.mean;
}
function coverage(samples: ZoneSample[], k: ChannelKey): number | undefined {
  return samples.find((s) => s.channel === k)?.coverage;
}

function confidenceFromEvidence(score: number): Confidence {
  if (score >= 4) return "high";
  if (score >= 2) return "moderate";
  return "low";
}

function readinessFor(substrate: Substrate, zone: ZoneKey, confidence: Confidence): {
  readiness: Readiness;
  reason?: string;
} {
  if (substrate === "no_data" || substrate === "occluded") {
    return { readiness: "not-applicable", reason: "Insufficient image data for this zone" };
  }
  if (confidence === "low") {
    return { readiness: "dermatoscopy-first", reason: "Low-confidence verdict — clinician review required before action" };
  }
  if (substrate === "unclear" || substrate === "mixed") {
    return { readiness: "dermatoscopy-first", reason: "Substrate ambiguous on channels alone" };
  }
  if (substrate === "hemosiderin" && (zone === "periorbitalL" || zone === "periorbitalR")) {
    return { readiness: "labs-first", reason: "Correlate with serum TSat / ferritin before Nd:YAG" };
  }
  if (substrate === "inflammation") {
    return { readiness: "not-applicable", reason: "Defer until barrier is quiet" };
  }
  if (substrate === "hypopigmentation") {
    return { readiness: "not-applicable", reason: "Specialist referral — do not treat with energy" };
  }
  return { readiness: "proceed" };
}

export function verdictFromSignals(
  zone: ZoneKey,
  raw: SampleOrFail[],
  refs: References,
): ZoneVerdict {
  const samples = raw.filter((s): s is ZoneSample => "mean" in s);
  const failed = raw.filter((s): s is FailedSample => "error" in s);

  // No data path.
  if (samples.length === 0) {
    return baseVerdict(zone, "no_data", "low", 0, samples, failed,
      "All channels failed to load or were unavailable.");
  }

  const deepRed = pick(samples, "deepRedMap");
  const brown = pick(samples, "brownMap");
  const blood = pick(samples, "bloodMap");
  const red = pick(samples, "redMap");
  const deepBrown = pick(samples, "deepBrownMap");
  const undereye = coverage(samples, "undereyeMask") ?? pick(samples, "undereyeMask");
  const brownSpotCov = coverage(samples, "brownSpotMask");
  const sensitive = coverage(samples, "sensitiveAreaMask");

  // Occlusion: all primary channels abnormally low.
  const primaries = [deepRed, brown, blood].filter((v): v is number => v != null);
  if (primaries.length >= 2 && primaries.every((v) => v < THRESHOLDS.occludedMaxMean)) {
    return baseVerdict(zone, "occluded", "low", 0, samples, failed,
      "All primary channels below noise floor — likely occluded.");
  }

  // Hypopigmentation guard — delta brownMap well below baseline.
  if (brown != null && refs.brownBaseline != null && !refs.referenceDirty) {
    const dBrown = brown - refs.brownBaseline;
    if (dBrown < THRESHOLDS.brownDeltaHypo) {
      return baseVerdict(zone, "hypopigmentation", "moderate", 2, samples, failed,
        `brownMap is ${Math.abs(dBrown).toFixed(2)} below reference — possible vitiligo / hypopigmentation.`);
    }
  }

  // Inflammation dominant.
  if (sensitive != null && sensitive > THRESHOLDS.sensitiveHigh) {
    return baseVerdict(zone, "inflammation", "high", 3, samples, failed,
      `sensitiveArea covers ${(sensitive * 100).toFixed(0)}% of zone — inflammation dominates substrate read.`);
  }

  // Decide melanin vs hemosiderin vs telangiectasia.
  let evidence = 0;
  let substrate: Substrate = "unclear";
  let rationale = "Channels do not clearly favour one substrate.";

  const brownThreshold = refs.referenceDirty
    ? THRESHOLDS.brownAbsoluteFallback
    : (refs.brownBaseline ?? 0.3) + THRESHOLDS.brownDeltaMelanin;

  const hemoCandidate =
    deepRed != null &&
    brown != null &&
    blood != null &&
    deepRed > THRESHOLDS.deepRedHemo &&
    brown < deepRed - THRESHOLDS.brownColdRelative &&
    blood < THRESHOLDS.bloodColdHemo;

  const telanCandidate =
    blood != null && blood > THRESHOLDS.bloodHotTelan ||
    (deepRed != null && red != null && deepRed > THRESHOLDS.deepRedHemo &&
     red > THRESHOLDS.redmapHotTelan);

  const melaninCandidate = brown != null && brown > brownThreshold;

  // Mixed: primary signal not decisively above secondary.
  const ratioOK = (a?: number, b?: number) =>
    a != null && b != null && b > 0 && a / b >= THRESHOLDS.primaryRatio;

  if (hemoCandidate && melaninCandidate && !ratioOK(deepRed, brown)) {
    substrate = "mixed";
    rationale = `deepRedMap (${deepRed!.toFixed(2)}) and brownMap (${brown!.toFixed(2)}) both warm — substrate is mixed.`;
    evidence = 2;
  } else if (hemoCandidate) {
    substrate = "hemosiderin";
    evidence += 1; // primary margin
    if (deepRed! - THRESHOLDS.deepRedHemo >= 0.1) evidence += 1;
    if (brown! < deepRed! - THRESHOLDS.brownColdRelative - 0.05) evidence += 1;
    if ((zone === "periorbitalL" || zone === "periorbitalR") && undereye != null && undereye > 0.3)
      evidence += 1;
    rationale = `deepRedMap ${deepRed!.toFixed(2)} > brownMap ${brown!.toFixed(2)} + bloodmap cold (${blood!.toFixed(2)}) → iron-pigment dominant.`;
  } else if (telanCandidate) {
    substrate = "telangiectasia";
    evidence += 1;
    if (blood != null && blood > THRESHOLDS.bloodHotTelan + 0.1) evidence += 1;
    if (red != null && red > THRESHOLDS.redmapHotTelan) evidence += 1;
    rationale = `bloodmap ${blood?.toFixed(2) ?? "—"} / redmap ${red?.toFixed(2) ?? "—"} — active surface vascular signal.`;
  } else if (melaninCandidate) {
    // Sub-class melanin
    if (brownSpotCov != null && brownSpotCov > THRESHOLDS.brownSpotCoverageLentigo &&
        zone !== "periorbitalL" && zone !== "periorbitalR") {
      substrate = "melanin_lentigo";
      evidence += 2;
      rationale = `brownMap warm + brownSpot mask covers ${(brownSpotCov * 100).toFixed(0)}% — discrete pigment.`;
    } else if (sensitive != null && sensitive > THRESHOLDS.sensitiveWarn) {
      substrate = "melanin_pih";
      evidence += 2;
      rationale = `brownMap warm in a zone with concurrent sensitivity — favours PIH.`;
    } else {
      substrate = "melanin_melasma";
      evidence += 1;
      rationale = `Diffuse brownMap (${brown!.toFixed(2)}) above reference baseline.`;
      if (deepBrown != null && deepBrown > 0.4) evidence += 1;
    }
    // Bonus evidence: brownMap clearly above reference
    if (refs.brownBaseline != null && brown != null && (brown - refs.brownBaseline) > 0.2)
      evidence += 1;
  } else if (
    (deepRed ?? 0) < 0.25 && (brown ?? 0) < 0.25 && (blood ?? 0) < 0.2
  ) {
    substrate = "clear";
    evidence = 3;
    rationale = "All primary channels cold — no substrate finding.";
  } else {
    substrate = "unclear";
    evidence = 1;
  }

  // Reference-dirty penalty.
  if (refs.referenceDirty && substrate.startsWith("melanin")) {
    evidence = Math.max(0, evidence - 1);
    rationale += " · Reference zone is dirty — fell back to absolute threshold.";
  }
  // Per-failed-channel confidence haircut.
  evidence = Math.max(0, evidence - Math.floor(failed.length / 2));

  // ── Patient-context priors ──────────────────────────────────────────────
  // These adjustments raise or lower evidence based on clinician-entered
  // history flags. Each modifier is recorded for audit in contextModifiers.
  const contextModifiers: string[] = [];
  const ctx = refs.patientContext?.tierA;
  if (ctx) {
    const isHemo = substrate === "hemosiderin";
    const isMelasma = substrate === "melanin_melasma";
    const isPeriorbital = zone === "periorbitalL" || zone === "periorbitalR";

    if (isHemo && isPeriorbital && ctx.valsalvaHx) {
      evidence += 1;
      contextModifiers.push("valsalvaHx+1");
    }
    if (isHemo && isPeriorbital && ctx.hfeKnownOrFerritinHigh) {
      evidence += 1;
      contextModifiers.push("hfeKnownOrFerritinHigh+1");
    }
    if (isMelasma && ctx.pregnancy) {
      evidence += 1;
      contextModifiers.push("pregnancy+1");
    }
    if (isMelasma && ctx.hormonalContraception) {
      evidence += 1;
      contextModifiers.push("hormonalContraception+1");
    }
    // Transient melanin inflation from recent sun — reduces melanin evidence
    // so the verdict is more conservatively framed.
    if (substrate.startsWith("melanin") && ctx.recentSunExposure14d) {
      evidence = Math.max(0, evidence - 1);
      contextModifiers.push("recentSunExposure14d-1");
    }
  }
  // ── End context priors ──────────────────────────────────────────────────

  const confidence = confidenceFromEvidence(evidence);
  const { readiness, reason } = readinessFor(substrate, zone, confidence);

  const doNots = [
    ...CONTRAINDICATIONS[substrate],
    ...fitzpatrickOverlays(refs.skinType, substrate),
  ];

  return {
    zone,
    substrate,
    confidence,
    evidence,
    readiness,
    readinessReason: reason,
    rationale,
    samples,
    failed,
    doNots,
    treatmentHint: TREATMENT_HINT[substrate],
    ...(contextModifiers.length > 0 ? { contextModifiers } : {}),
  };
}

function baseVerdict(
  zone: ZoneKey,
  substrate: Substrate,
  confidence: Confidence,
  evidence: number,
  samples: ZoneSample[],
  failed: FailedSample[],
  rationale: string,
): ZoneVerdict {
  const { readiness, reason } = readinessFor(substrate, zone, confidence);
  return {
    zone,
    substrate,
    confidence,
    evidence,
    readiness,
    readinessReason: reason,
    rationale,
    samples,
    failed,
    doNots: CONTRAINDICATIONS[substrate],
    treatmentHint: TREATMENT_HINT[substrate],
  };
}

/**
 * Compute references from a "clean zone" sample bundle.
 * Caller passes forehead samples (for brownMap baseline) + nose samples (deepRed baseline).
 */
export function buildReferences(
  forehead: SampleOrFail[] | undefined,
  nose: SampleOrFail[] | undefined,
  skinType?: number,
): References {
  const fb = forehead?.filter((s): s is ZoneSample => "mean" in s) ?? [];
  const nb = nose?.filter((s): s is ZoneSample => "mean" in s) ?? [];
  const brownBaseline = fb.find((s) => s.channel === "brownMap")?.mean;
  const deepRedBaseline = nb.find((s) => s.channel === "deepRedMap")?.mean;
  const referenceDirty =
    brownBaseline != null && brownBaseline > THRESHOLDS.referenceDirtyBrown;
  return { brownBaseline, deepRedBaseline, referenceDirty, skinType };
}

export const SUBSTRATE_LABEL: Record<Substrate, string> = {
  melanin_lentigo: "Melanin · lentigo",
  melanin_melasma: "Melanin · melasma",
  melanin_pih: "Melanin · PIH",
  hemosiderin: "Hemosiderin",
  telangiectasia: "Telangiectasia",
  mixed: "Mixed substrate",
  inflammation: "Inflammation dominant",
  hypopigmentation: "Hypopigmentation",
  structural_shadow: "Structural shadow",
  unclear: "Unclear",
  clear: "Clear",
  no_data: "No data",
  occluded: "Occluded",
};
