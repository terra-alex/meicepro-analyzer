// Zone polygons in normalised image-fraction coordinates (0..1).
// Estimated against a standard Meicepro front-face crop.
// TODO: replace with landmark-derived polygons from jsonAging once schema known.

import type { Direction, NormPoint, ZoneKey } from "./types";

const P = (x: number, y: number): NormPoint => ({ x, y });

/** Polygon dictionary for the FRONT capture. */
const FRONT: Record<ZoneKey, NormPoint[]> = {
  periorbitalL: [
    P(0.22, 0.38), P(0.32, 0.36), P(0.42, 0.37),
    P(0.42, 0.44), P(0.32, 0.46), P(0.22, 0.44),
  ],
  periorbitalR: [
    P(0.58, 0.37), P(0.68, 0.36), P(0.78, 0.38),
    P(0.78, 0.44), P(0.68, 0.46), P(0.58, 0.44),
  ],
  glabella: [
    P(0.43, 0.28), P(0.57, 0.28), P(0.57, 0.36), P(0.43, 0.36),
  ],
  forehead: [
    P(0.28, 0.12), P(0.72, 0.12), P(0.72, 0.26), P(0.28, 0.26),
  ],
  leftCheekUpperMedial: [
    P(0.30, 0.48), P(0.42, 0.48), P(0.42, 0.58), P(0.30, 0.58),
  ],
  leftCheekLowerLateral: [
    P(0.18, 0.58), P(0.40, 0.58), P(0.40, 0.72), P(0.20, 0.72),
  ],
  rightCheekUpperMedial: [
    P(0.58, 0.48), P(0.70, 0.48), P(0.70, 0.58), P(0.58, 0.58),
  ],
  rightCheekLowerLateral: [
    P(0.60, 0.58), P(0.82, 0.58), P(0.80, 0.72), P(0.60, 0.72),
  ],
  nose: [
    P(0.45, 0.40), P(0.55, 0.40), P(0.58, 0.58), P(0.42, 0.58),
  ],
  chin: [
    P(0.40, 0.78), P(0.60, 0.78), P(0.58, 0.90), P(0.42, 0.90),
  ],
};

/** Zones that are visible on each direction's capture. */
const VISIBLE: Record<Direction, ZoneKey[]> = {
  [-1]: ["periorbitalL", "leftCheekUpperMedial", "leftCheekLowerLateral", "forehead", "nose", "chin"],
  [0]: Object.keys(FRONT) as ZoneKey[],
  [1]: ["periorbitalR", "rightCheekUpperMedial", "rightCheekLowerLateral", "forehead", "nose", "chin"],
};

export function zonePolygons(direction: Direction): Partial<Record<ZoneKey, NormPoint[]>> {
  const visible = VISIBLE[direction];
  const out: Partial<Record<ZoneKey, NormPoint[]>> = {};
  for (const z of visible) out[z] = FRONT[z];
  return out;
}

export function allFrontZones(): ZoneKey[] {
  return Object.keys(FRONT) as ZoneKey[];
}

export function polygonFor(zone: ZoneKey): NormPoint[] {
  return FRONT[zone];
}

export const ZONE_LABEL: Record<ZoneKey, string> = {
  periorbitalL: "Left periorbital",
  periorbitalR: "Right periorbital",
  glabella: "Glabella",
  forehead: "Forehead",
  leftCheekUpperMedial: "Left cheek · upper medial",
  leftCheekLowerLateral: "Left cheek · lower lateral",
  rightCheekUpperMedial: "Right cheek · upper medial",
  rightCheekLowerLateral: "Right cheek · lower lateral",
  nose: "Nose",
  chin: "Chin",
};
