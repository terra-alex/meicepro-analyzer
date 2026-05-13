// Pure decision rules. Takes per-channel samples + within-scan refs + skinType,
// returns a ZoneVerdict. No browser APIs; safe to unit-test in Node.

import {
  CONTRAINDICATIONS,
  THRESHOLDS,
  TREATMENT_HINT,
  fitzpatrickOverlays,
} from "./rules";
import type {
  ChannelHeat,
  ChannelKey,
  ChannelRead,
  Confidence,
  DecisionRow,
  FailedSample,
  Readiness,
  References,
  SampleOrFail,
  Substrate,
  ZoneKey,
  ZoneSample,
  ZoneVerdict,
} from "./types";

// ── Display: per-channel reads + heat tier ──────────────────────────────────

interface DisplayChannel {
  channel: ChannelKey;
  name: string;
  group: string;
}

const DISPLAY_CHANNELS: DisplayChannel[] = [
  { channel: "deepRedMap", name: "deepRedMap", group: "Vascular · deep" },
  { channel: "brownMap", name: "brownMap", group: "Pigment · epidermal" },
  { channel: "bloodMap", name: "bloodmap", group: "Vascular · surface" },
  { channel: "undereyeMask", name: "undereye mask", group: "Algorithm · detection" },
];

/**
 * Heat tier for a CHANNEL READ (display only). Operates on chroma for
 * heatmap channels (baseline-subtracted when refs available) and on
 * coverage for the mask channels.
 */
function heatFor(
  channel: ChannelKey,
  sample: ZoneSample | undefined,
  refs: References,
): ChannelHeat {
  if (!sample) return "neutral";
  switch (channel) {
    case "deepRedMap": {
      const d = sample.chroma - (refs.deepRedBaseline ?? 0);
      if (d > THRESHOLDS.deepRedHemo + 0.06) return "hot";
      if (d > THRESHOLDS.deepRedHemo) return "warm";
      if (d < -0.03) return "cold";
      return "neutral";
    }
    case "brownMap": {
      const base = refs.brownBaseline;
      if (base != null && !refs.referenceDirty) {
        const d = sample.chroma - base;
        if (d > THRESHOLDS.brownDeltaMelanin + 0.06) return "hot";
        if (d > THRESHOLDS.brownDeltaMelanin) return "warm";
        if (d < -0.03) return "cold";
        return "neutral";
      }
      if (sample.chroma > THRESHOLDS.brownAbsoluteFallback) return "hot";
      if (sample.chroma > THRESHOLDS.brownAbsoluteFallback * 0.8) return "warm";
      return "neutral";
    }
    case "bloodMap": {
      const d = sample.chroma - (refs.bloodBaseline ?? 0);
      if (d > THRESHOLDS.bloodHotTelan) return "hot";
      if (d > THRESHOLDS.bloodColdHemo) return "warm";
      return "cold";
    }
    case "undereyeMask": {
      const cov = sample.coverage ?? sample.mean;
      if (cov > 0.4) return "branching";
      if (cov > 0.2) return "warm";
      return "cold";
    }
    default:
      return "neutral";
  }
}

function explainFor(
  channel: ChannelKey,
  heat: ChannelHeat,
  substrate: Substrate,
  zone: ZoneKey,
): string {
  const periorbital = zone === "periorbitalL" || zone === "periorbitalR";
  if (channel === "deepRedMap") {
    if (heat === "hot" || heat === "warm")
      return substrate === "hemosiderin"
        ? "Concentrated dermal heme signal — iron pigment dominant."
        : substrate === "telangiectasia"
        ? "Deep red elevated alongside surface flow — vascular."
        : "Dermal red elevated — flagging for context.";
    if (heat === "cold") return "Deep dermal red is quiet here.";
    return "Deep dermal red in normal range.";
  }
  if (channel === "brownMap") {
    if (heat === "hot")
      return substrate === "melanin_melasma"
        ? "Epidermal melanin well above forehead baseline — diffuse pattern."
        : "Epidermal melanin elevated.";
    if (heat === "warm")
      return substrate.startsWith("melanin")
        ? "Melanin above baseline — pigment present."
        : "Melanin baseline — not the substrate here.";
    if (heat === "cold") return "Melanin below baseline — possible hypopigmentation.";
    return "Melanin near baseline.";
  }
  if (channel === "bloodMap") {
    if (heat === "hot") return "Surface oxy-Hb active — flow component present.";
    if (heat === "warm") return "Mild surface flow signal — not decisive.";
    return substrate === "hemosiderin"
      ? "Surface oxy-Hb absent — rules out active telangiectasia."
      : "Surface oxy-Hb quiet here.";
  }
  if (channel === "undereyeMask") {
    if (!periorbital) return "Mask scope is periorbital — not informative here.";
    if (heat === "branching")
      return "Branching streaks, not punctate dots — favours resolved Valsalva residue.";
    if (heat === "warm") return "Mask present at moderate coverage.";
    return "Mask coverage low — no notable undereye finding.";
  }
  return "";
}

function buildChannelReads(
  samples: ZoneSample[],
  failed: FailedSample[],
  refs: References,
  substrate: Substrate,
  zone: ZoneKey,
): ChannelRead[] {
  return DISPLAY_CHANNELS.map((dc) => {
    const s = samples.find((x) => x.channel === dc.channel);
    const f = failed.find((x) => x.channel === dc.channel);
    // For heatmap channels, the displayed scalar is CHROMA (saturation).
    // For mask channels, fall back to mean RGB so the card still shows
    // something useful when nothing else applies.
    const isMask = dc.channel === "undereyeMask";
    const displayed = s ? (isMask ? s.mean : s.chroma) : null;
    const coverage = s?.coverage ?? (isMask ? undefined : s?.chromaCoverage);
    const heat: ChannelHeat = f ? "neutral" : heatFor(dc.channel, s, refs);
    const explain = f
      ? "Channel image unavailable for this zone."
      : explainFor(dc.channel, heat, substrate, zone);
    return {
      channel: dc.channel,
      name: dc.name,
      group: dc.group,
      mean: displayed,
      coverage,
      heat,
      explain,
    };
  });
}

function fmt(v: number | undefined | null): string {
  return v == null ? "—" : v.toFixed(2);
}

function traceFor(
  substrate: Substrate,
  zone: ZoneKey,
  samples: ZoneSample[],
  refs: References,
): DecisionRow[] {
  // Trace uses chroma deltas (baseline-subtracted) — same units the
  // decision rules compared against.
  const drRaw = samples.find((s) => s.channel === "deepRedMap")?.chroma;
  const brRaw = samples.find((s) => s.channel === "brownMap")?.chroma;
  const blRaw = samples.find((s) => s.channel === "bloodMap")?.chroma;
  const dr = drRaw != null ? drRaw - (refs.deepRedBaseline ?? 0) : undefined;
  const br = brRaw != null ? brRaw - (refs.brownBaseline ?? 0) : undefined;
  const bl = blRaw != null ? blRaw - (refs.bloodBaseline ?? 0) : undefined;
  const undereye = samples.find((s) => s.channel === "undereyeMask");
  const brownSpot = samples.find((s) => s.channel === "brownSpotMask");
  const sensitive = samples.find((s) => s.channel === "sensitiveAreaMask");
  const periorbital = zone === "periorbitalL" || zone === "periorbitalR";
  const baseLabel = refs.brownBaseline != null
    ? `vs forehead baseline ${fmt(refs.brownBaseline)}`
    : "absolute scale";

  switch (substrate) {
    case "hemosiderin":
      return [
        {
          signal: `deepRedMap ${fmt(dr)} > brownMap ${fmt(br)}`,
          read: "iron/vascular > melanin",
          verdict: "Substrate is iron-pigment",
        },
        {
          signal: `bloodmap ${fmt(bl)} < ${THRESHOLDS.bloodColdHemo}`,
          read: "no active surface flow",
          verdict: "Not telangiectasia",
        },
        ...(periorbital && undereye?.coverage != null
          ? [{
              signal: `undereye mask coverage ${(undereye.coverage * 100).toFixed(0)}%`,
              read: "branching, not punctate",
              verdict: "Resolved Valsalva residue",
            }]
          : []),
        {
          signal: "brownSpot mask quiet in zone",
          read: "algorithm does not call discrete pigment",
          verdict: "Not melanin",
        },
      ];
    case "melanin_melasma":
      return [
        {
          signal: `brownMap ${fmt(br)} above threshold (${baseLabel})`,
          read: "epidermal pigment elevated",
          verdict: "Substrate is melanin",
        },
        {
          signal: `brownSpot mask coverage ${brownSpot?.coverage != null ? (brownSpot.coverage * 100).toFixed(0) + "%" : "—"} (< ${(THRESHOLDS.brownSpotCoverageLentigo * 100).toFixed(0)}%)`,
          read: "no discrete spots",
          verdict: "Not lentigo",
        },
        {
          signal: `sensitiveArea coverage ${sensitive?.coverage != null ? (sensitive.coverage * 100).toFixed(0) + "%" : "—"}`,
          read: "no concurrent inflammation",
          verdict: "Not PIH",
        },
        {
          signal: "Diffuse distribution",
          read: "pigment spread across zone",
          verdict: "Pattern → melasma",
        },
      ];
    case "melanin_lentigo":
      return [
        {
          signal: `brownMap ${fmt(br)} above threshold`,
          read: "epidermal pigment elevated",
          verdict: "Substrate is melanin",
        },
        {
          signal: `brownSpot mask coverage ${brownSpot?.coverage != null ? (brownSpot.coverage * 100).toFixed(0) + "%" : "—"} ≥ ${(THRESHOLDS.brownSpotCoverageLentigo * 100).toFixed(0)}%`,
          read: "discrete pigmented spots present",
          verdict: "Lentigo / sun-damage pattern",
        },
      ];
    case "melanin_pih":
      return [
        {
          signal: `brownMap ${fmt(br)} above threshold`,
          read: "epidermal pigment elevated",
          verdict: "Substrate is melanin",
        },
        {
          signal: `sensitiveArea coverage ${sensitive?.coverage != null ? (sensitive.coverage * 100).toFixed(0) + "%" : "—"} > ${(THRESHOLDS.sensitiveWarn * 100).toFixed(0)}%`,
          read: "concurrent sensitivity / inflammation",
          verdict: "Post-inflammatory hyperpigmentation",
        },
      ];
    case "telangiectasia":
      return [
        {
          signal: `bloodmap ${fmt(bl)} > ${THRESHOLDS.bloodHotTelan}`,
          read: "active surface oxy-Hb",
          verdict: "Substrate is vascular / active flow",
        },
        {
          signal: `deepRedMap ${fmt(dr)} also elevated`,
          read: "vascular signal at depth",
          verdict: "Confirms telangiectasia over hemosiderin",
        },
      ];
    case "mixed":
      return [
        {
          signal: `deepRedMap ${fmt(dr)} and brownMap ${fmt(br)} both warm`,
          read: `ratio ${dr && br ? (dr / br).toFixed(2) : "—"} < ${THRESHOLDS.primaryRatio}`,
          verdict: "No dominant substrate — sequential treatment indicated",
        },
      ];
    case "inflammation":
      return [
        {
          signal: `sensitiveArea coverage ${sensitive?.coverage != null ? (sensitive.coverage * 100).toFixed(0) + "%" : "—"} > ${(THRESHOLDS.sensitiveHigh * 100).toFixed(0)}%`,
          read: "inflammation dominates the read",
          verdict: "Substrate verdict deferred — treat barrier first",
        },
      ];
    case "hypopigmentation":
      return [
        {
          signal: `brownMap ${fmt(br)} well below baseline (${baseLabel})`,
          read: "epidermal pigment reduced",
          verdict: "Possible vitiligo / hypopigmentation — refer",
        },
      ];
    case "structural_shadow":
      return [
        {
          signal: "Low pigment + low vascular + undereye mask present",
          read: "no chromophore explains the darkness",
          verdict: "Structural shadow — not a pigment finding",
        },
      ];
    case "clear":
      return [
        {
          signal: "All primary channels cold",
          read: "no substrate signal in zone",
          verdict: "No finding",
        },
      ];
    case "unclear":
      return [
        {
          signal: "Channels disagree or below decisive thresholds",
          read: "no dominant signal",
          verdict: "Verdict deferred — review imagery",
        },
      ];
    case "no_data":
      return [
        {
          signal: "All channel URLs missing or failed",
          read: "no usable data",
          verdict: "Cannot verdict this zone",
        },
      ];
    case "occluded":
      return [
        {
          signal: "All primary channels below noise floor",
          read: "zone likely occluded (hair / ear / off-axis)",
          verdict: "Re-frame and rescan",
        },
      ];
  }
}

function pick(samples: ZoneSample[], k: ChannelKey): number | undefined {
  return samples.find((s) => s.channel === k)?.mean;
}
/**
 * Read the chroma scalar for a heatmap channel — this is what the
 * thresholds in `rules.ts` actually compare against, not raw RGB mean.
 */
function chroma(samples: ZoneSample[], k: ChannelKey): number | undefined {
  return samples.find((s) => s.channel === k)?.chroma;
}
function chromaCov(samples: ZoneSample[], k: ChannelKey): number | undefined {
  return samples.find((s) => s.channel === k)?.chromaCoverage;
}
function coverage(samples: ZoneSample[], k: ChannelKey): number | undefined {
  return samples.find((s) => s.channel === k)?.coverage;
}
/** Subtract a baseline if present; otherwise return raw value. */
function delta(v: number | undefined, base: number | undefined): number | undefined {
  if (v == null) return undefined;
  if (base == null) return v;
  return v - base;
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
      "All channels failed to load or were unavailable.", refs);
  }

  // Use chroma (false-color saturation) for heatmap channels — measures
  // "how strongly is this channel firing" rather than overall brightness.
  // Baseline-subtract against the reference zones so eyelid pinkness or
  // tanned skin tone doesn't masquerade as channel signal.
  const deepRedRaw = chroma(samples, "deepRedMap");
  const brownRaw = chroma(samples, "brownMap");
  const bloodRaw = chroma(samples, "bloodMap");
  const redRaw = chroma(samples, "redMap");
  const deepBrownRaw = chroma(samples, "deepBrownMap");
  const deepRed = delta(deepRedRaw, refs.deepRedBaseline);
  const brown = delta(brownRaw, refs.brownBaseline);
  const blood = delta(bloodRaw, refs.bloodBaseline);
  const red = delta(redRaw, refs.bloodBaseline);
  const deepBrown = delta(deepBrownRaw, refs.brownBaseline);
  const bloodCovHits = chromaCov(samples, "bloodMap");
  const undereye = coverage(samples, "undereyeMask") ?? pick(samples, "undereyeMask");
  const brownSpotCov = coverage(samples, "brownSpotMask");
  const sensitive = coverage(samples, "sensitiveAreaMask");

  // Occlusion: all primary channels' raw chroma near zero (no signal at all).
  const primariesRaw = [deepRedRaw, brownRaw, bloodRaw].filter((v): v is number => v != null);
  if (primariesRaw.length >= 2 && primariesRaw.every((v) => v < THRESHOLDS.occludedMaxMean)) {
    return baseVerdict(zone, "occluded", "low", 0, samples, failed,
      "All primary channels below noise floor — likely occluded.", refs);
  }

  // Hypopigmentation guard — chroma well below baseline (signals less than skin).
  if (brown != null && refs.brownBaseline != null && !refs.referenceDirty) {
    if (brown < THRESHOLDS.brownDeltaHypo) {
      return baseVerdict(zone, "hypopigmentation", "moderate", 2, samples, failed,
        `brownMap chroma is ${Math.abs(brown).toFixed(2)} below reference — possible vitiligo / hypopigmentation.`, refs);
    }
  }

  // Inflammation dominant.
  if (sensitive != null && sensitive > THRESHOLDS.sensitiveHigh) {
    return baseVerdict(zone, "inflammation", "high", 3, samples, failed,
      `sensitiveArea covers ${(sensitive * 100).toFixed(0)}% of zone — inflammation dominates substrate read.`, refs);
  }

  // Decide melanin vs hemosiderin vs telangiectasia (all values are now
  // baseline-subtracted chroma deltas — 0 = same as reference, +0.1 = clearly
  // hot, negative = colder than reference).
  let evidence = 0;
  let substrate: Substrate = "unclear";
  let rationale = "Channels do not clearly favour one substrate.";

  // Melanin threshold is the chroma delta directly when reference is clean.
  const brownThreshold = refs.referenceDirty
    ? THRESHOLDS.brownAbsoluteFallback - (refs.brownBaseline ?? 0)
    : THRESHOLDS.brownDeltaMelanin;

  const hemoCandidate =
    deepRed != null &&
    brown != null &&
    blood != null &&
    deepRed > THRESHOLDS.deepRedHemo &&
    brown < deepRed - THRESHOLDS.brownColdRelative &&
    blood < THRESHOLDS.bloodColdHemo;

  // Telangiectasia needs BOTH saturation AND coverage — a bright eyelid
  // baseline won't trip both.
  const telanCandidate =
    (blood != null &&
     blood > THRESHOLDS.bloodHotTelan &&
     (bloodCovHits == null || bloodCovHits > THRESHOLDS.bloodCoverageTelan)) ||
    (deepRed != null && red != null && deepRed > THRESHOLDS.deepRedHemo &&
     red > THRESHOLDS.redmapHotTelan);

  const melaninCandidate = brown != null && brown > brownThreshold;

  // Mixed: primary signal not decisively above secondary.
  const ratioOK = (a?: number, b?: number) =>
    a != null && b != null && b > 0 && a / b >= THRESHOLDS.primaryRatio;

  if (hemoCandidate && melaninCandidate && !ratioOK(deepRed, brown)) {
    substrate = "mixed";
    rationale = `deepRedMap Δ${deepRed!.toFixed(2)} and brownMap Δ${brown!.toFixed(2)} both elevated vs reference — substrate is mixed.`;
    evidence = 2;
  } else if (hemoCandidate) {
    substrate = "hemosiderin";
    evidence += 1; // primary margin
    if (deepRed! - THRESHOLDS.deepRedHemo >= 0.08) evidence += 1;
    if (brown! < deepRed! - THRESHOLDS.brownColdRelative - 0.04) evidence += 1;
    if ((zone === "periorbitalL" || zone === "periorbitalR") && undereye != null && undereye > 0.3)
      evidence += 1;
    rationale = `deepRedMap Δ${deepRed!.toFixed(2)} > brownMap Δ${brown!.toFixed(2)} + bloodmap Δ${blood!.toFixed(2)} cold → iron-pigment dominant.`;
  } else if (telanCandidate) {
    substrate = "telangiectasia";
    evidence += 1;
    if (blood != null && blood > THRESHOLDS.bloodHotTelan + 0.06) evidence += 1;
    if (red != null && red > THRESHOLDS.redmapHotTelan) evidence += 1;
    rationale = `bloodmap Δ${blood?.toFixed(2) ?? "—"} hot · ${bloodCovHits != null ? (bloodCovHits * 100).toFixed(0) + "% of zone lit" : ""} — active surface vascular signal.`;
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
      rationale = `Diffuse brownMap Δ${brown!.toFixed(2)} above reference baseline.`;
      if (deepBrown != null && deepBrown > 0.08) evidence += 1;
    }
    // Bonus evidence: brownMap clearly above reference
    if (brown != null && brown > THRESHOLDS.brownDeltaMelanin + 0.08)
      evidence += 1;
  } else if (
    (deepRed ?? 0) < 0.05 && (brown ?? 0) < 0.05 && (blood ?? 0) < 0.05
  ) {
    substrate = "clear";
    evidence = 3;
    rationale = "All primary channels at/below reference — no substrate finding.";
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
    channelReads: buildChannelReads(samples, failed, refs, substrate, zone),
    decisionTrace: traceFor(substrate, zone, samples, refs),
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
  refs?: References,
): ZoneVerdict {
  const { readiness, reason } = readinessFor(substrate, zone, confidence);
  const safeRefs: References = refs ?? { referenceDirty: false };
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
    channelReads: buildChannelReads(samples, failed, safeRefs, substrate, zone),
    decisionTrace: traceFor(substrate, zone, samples, safeRefs),
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
  patientContext?: import("@/lib/context").PatientContext,
): References {
  const fb = forehead?.filter((s): s is ZoneSample => "chroma" in s) ?? [];
  const nb = nose?.filter((s): s is ZoneSample => "chroma" in s) ?? [];
  // Baselines are in CHROMA units, not RGB mean — that's what every rule
  // in substrate.ts now compares against.
  const brownBaseline = fb.find((s) => s.channel === "brownMap")?.chroma;
  const deepRedBaseline = nb.find((s) => s.channel === "deepRedMap")?.chroma;
  const bloodBaseline = nb.find((s) => s.channel === "bloodMap")?.chroma;
  const referenceDirty =
    brownBaseline != null && brownBaseline > THRESHOLDS.referenceDirtyBrown;
  return {
    brownBaseline,
    deepRedBaseline,
    bloodBaseline,
    referenceDirty,
    skinType,
    patientContext,
  };
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
