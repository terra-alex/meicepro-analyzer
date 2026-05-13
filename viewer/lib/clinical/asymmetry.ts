// Pure, browser-free module for hemiface asymmetry analysis.
// Consumes already-computed ZoneVerdict records (front capture only) and emits
// AsymmetryFinding[] — informational, never alters verdicts or doNots.

import { THRESHOLDS } from "./rules";
import type {
  AsymmetryFinding,
  AsymmetryLevel,
  ChannelKey,
  ZoneKey,
  ZoneVerdict,
} from "./types";

// The mirrored zone pairs we compare. Order: [left, right].
const MIRROR_PAIRS: [ZoneKey, ZoneKey][] = [
  ["periorbitalL", "periorbitalR"],
  ["leftCheekUpperMedial", "rightCheekUpperMedial"],
  ["leftCheekLowerLateral", "rightCheekLowerLateral"],
];

// Channels that carry clinically meaningful L/R signal.
const CHANNELS_OF_INTEREST: ChannelKey[] = ["deepRedMap", "brownMap", "bloodMap"];

function classifyRatio(ratio: number): AsymmetryLevel {
  if (ratio >= THRESHOLDS.asymmetryRatioMarked) return "marked";
  if (ratio >= THRESHOLDS.asymmetryRatioNotable) return "notable";
  if (ratio >= THRESHOLDS.asymmetryRatioMild) return "mild";
  return "none";
}

function buildInterpretation(
  channel: ChannelKey,
  dominantSide: "left" | "right",
  ratio: number,
): string {
  const hi = dominantSide === "left" ? "Left" : "Right";
  const lo = dominantSide === "left" ? "right" : "left";
  const ratioStr = ratio.toFixed(1) + "×";

  switch (channel) {
    case "deepRedMap":
      return (
        `${hi} > ${lo} dermal-red (${ratioStr}) — favours unilateral hemosiderin / petechial residue; ` +
        `asymmetric deepRedMap is a hemosiderin red flag.`
      );
    case "brownMap":
      return (
        `${hi} > ${lo} melanin (${ratioStr}) — melasma can present asymmetrically early; ` +
        `asymmetric brownMap is a melasma sentinel.`
      );
    case "bloodMap":
      return (
        `${hi} > ${lo} active flow (${ratioStr}) — consider unilateral telangiectasia / rosacea flush ` +
        `on the ${hi.toLowerCase()} hemiface.`
      );
    default:
      return `${hi} > ${lo} (${ratioStr}) — unilateral signal asymmetry on ${channel}.`;
  }
}

/**
 * Compute hemiface L/R asymmetry findings from fully-sampled zone verdicts.
 * Only meaningful for direction === 0 (front capture), where both hemifaces
 * are simultaneously visible. Callers are responsible for the direction guard.
 *
 * Returns only findings with level !== "none".
 */
export function computeAsymmetry(
  verdicts: Partial<Record<ZoneKey, ZoneVerdict>>,
): AsymmetryFinding[] {
  const findings: AsymmetryFinding[] = [];

  for (const [leftZone, rightZone] of MIRROR_PAIRS) {
    const leftVerdict = verdicts[leftZone];
    const rightVerdict = verdicts[rightZone];
    if (!leftVerdict || !rightVerdict) continue;

    for (const channel of CHANNELS_OF_INTEREST) {
      const leftMean = leftVerdict.samples.find((s) => s.channel === channel)?.mean;
      const rightMean = rightVerdict.samples.find((s) => s.channel === channel)?.mean;

      // Skip if either side has no usable sample.
      if (leftMean == null || rightMean == null) continue;

      // Avoid division-by-zero; treat near-zero as absent signal.
      const minVal = Math.min(leftMean, rightMean);
      if (minVal < 0.01) continue;

      const ratio = Math.max(leftMean, rightMean) / minVal;
      const level = classifyRatio(ratio);
      if (level === "none") continue;

      const dominantSide: "left" | "right" = leftMean >= rightMean ? "left" : "right";

      findings.push({
        zonePair: [leftZone, rightZone],
        channel,
        ratio,
        dominantSide,
        level,
        interpretation: buildInterpretation(channel, dominantSide, ratio),
      });
    }
  }

  return findings;
}
