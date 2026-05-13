// Landmark-derived zone polygons from the jsonAging mesh asset.
//
// Schema (AgingJson): { padding: number; start_pts: Pt[]; target_pts: Pt[]; tri_idx: Tri[] }
//   Pt   = { x: number; y: number }       — normalised 0..1 image-fraction coords
//   Tri  = { x: number; y: number; z: number } — indices into start_pts / target_pts
//
// The start_pts array has 174 entries in the captured center-face sample:
//
//   0–35   face contour (jaw/chin, clockwise from top-center of head)
//  36–51   left-image eye outline   (anatomically: right periorbital)
//  52–67   right-image eye outline  (anatomically: left periorbital)
//  68–77   right-image eyebrow arc
//  78–87   left-image eyebrow arc
//  88–107  mouth outline
// 108–123  nose/nostril outline (upper lip crease → nostril base)
// 124+     image-border grid points (ignore for zone derivation)
//
// "left-image" means the subject's face appears mirrored in a front-facing
// photo, so image-left corresponds to the subject's anatomical right.
// Zone keys follow anatomical convention (periorbitalL = subject's left eye =
// image RIGHT side, x ≈ 0.59–0.74 in the sample).
//
// Landmark indices used per zone (based on the center-face):
//
//   forehead            : face contour top (0, 35), brow tops (73, 74, 75, 83, 84, 85)
//   glabella            : inner brow ends (72, 82) + eye inner corners (36, 52)
//   periorbitalL        : eye outline 52–67 (right-image eye = patient's left)
//   periorbitalR        : eye outline 36–51 (left-image eye = patient's right)
//   nose                : nostril/nose outline 108–123
//   leftCheekUpperMedial: face contour 8–11 + right-image eye outer corner 59 + nose 119
//   leftCheekLowerLateral: face contour 10–14 + nose side 118
//   rightCheekUpperMedial: face contour 29–32 + left-image eye outer corner 44 + nose 109
//   rightCheekLowerLateral: face contour 22–26 + left-image jaw 23
//   chin                : face contour 16–20 + mouth bottom 93

import type { NormPoint, ZoneKey } from "./types";

export interface AgingPt {
  x: number;
  y: number;
}

export interface AgingTri {
  x: number;
  y: number;
  z: number;
}

export interface AgingJson {
  padding: number;
  start_pts: AgingPt[];
  target_pts: AgingPt[];
  tri_idx: AgingTri[];
}

function pt(p: AgingPt): NormPoint {
  return { x: p.x, y: p.y };
}

function pick(pts: AgingPt[], ...indices: number[]): NormPoint[] {
  return indices.map((i) => pt(pts[i]));
}

/**
 * Build zone polygons from a parsed jsonAging payload.
 * Only zones for which we have sufficient landmarks are returned —
 * the caller should fall back to hand-tuned polygons for any missing key.
 *
 * Designed against the 174-landmark center-face mesh captured from
 * Meicepro MC900 v1.3.0.6. Falls back gracefully if the array is shorter
 * than expected (returns only zones for which every required index is present).
 */
export function polygonsFromLandmarks(
  mesh: AgingJson,
): Partial<Record<ZoneKey, NormPoint[]>> {
  const p = mesh.start_pts;
  const n = p.length;
  const has = (...idxs: number[]) => idxs.every((i) => i < n);

  const out: Partial<Record<ZoneKey, NormPoint[]>> = {};

  // --- forehead ---
  // Top of face contour (0, 35) plus the upper edge of each brow arc.
  // Build a rough trapezoid: top-of-head midpoint inferred from pts 0 & 35,
  // brow crown of left brow (85, 86) and right brow (74, 75).
  if (has(0, 35, 73, 74, 83, 84)) {
    // Build polygon: right forehead edge → right brow top → left brow top → left forehead edge
    // We offset upward from the brow tops by using the face-contour top points.
    out.forehead = [
      pt(p[35]), // top-left of face (patient's right side, image left)
      pt(p[0]),  // top-right of face (image right)
      pt(p[73]), // right-image brow crown right end
      pt(p[74]), // right-image brow crown center-right
      pt(p[84]), // left-image brow crown center-left
      pt(p[83]), // left-image brow crown left end
    ];
  }

  // --- glabella ---
  // Strip between brows: inner ends of each brow arc + inner corners of each eye.
  if (has(72, 82, 36, 52)) {
    out.glabella = [
      pt(p[72]), // right-image brow inner end (medial)
      pt(p[82]), // left-image brow inner end (medial)
      pt(p[36]), // left-image eye inner corner
      pt(p[52]), // right-image eye inner corner
    ];
  }

  // --- periorbitalL (patient's LEFT eye = image RIGHT side, x ≈ 0.59–0.74) ---
  // Use the right-image eye outline pts 52–67.
  if (has(67)) {
    // Expand region slightly: include the brow immediately above (pts 68–72)
    // and a strip of undereye below. For now, use just the eye outline as the
    // zone — simple convex hull of the outline points.
    out.periorbitalL = pick(p, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67);
  }

  // --- periorbitalR (patient's RIGHT eye = image LEFT side, x ≈ 0.28–0.45) ---
  // Use the left-image eye outline pts 36–51.
  if (has(51)) {
    out.periorbitalR = pick(p, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51);
  }

  // --- nose ---
  // The nostril/nose outline at pts 108–123 traces the nose base.
  if (has(123)) {
    out.nose = pick(p, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123);
  }

  // --- chin ---
  // Lower face contour pts 16–20 (y ≈ 0.86–0.88) + mouth bottom (pt 93).
  if (has(93, 20)) {
    out.chin = [
      pt(p[20]),  // face contour left side of chin
      pt(p[19]),
      pt(p[18]),  // chin bottom center
      pt(p[17]),
      pt(p[16]),  // face contour right side of chin
      pt(p[93]),  // lower lip / mouth bottom
    ];
  }

  // --- leftCheekUpperMedial (patient's LEFT cheek = image RIGHT, x > 0.5) ---
  // Between the right-image eye outer corner (59), jaw contour (8–10), and nose.
  if (has(59, 8, 10, 119)) {
    out.leftCheekUpperMedial = [
      pt(p[59]),  // right-image eye outer corner
      pt(p[8]),   // face contour at cheek height
      pt(p[9]),
      pt(p[10]),
      pt(p[119]), // nose right side
    ];
  }

  // --- leftCheekLowerLateral (patient's LEFT lower cheek = image RIGHT) ---
  if (has(10, 14, 96)) {
    out.leftCheekLowerLateral = [
      pt(p[10]),  // face contour upper lateral
      pt(p[11]),
      pt(p[12]),
      pt(p[13]),
      pt(p[14]),  // face contour jaw angle
      pt(p[96]),  // mouth right corner (nasolabial end)
    ];
  }

  // --- rightCheekUpperMedial (patient's RIGHT cheek = image LEFT, x < 0.5) ---
  if (has(44, 29, 31, 109)) {
    out.rightCheekUpperMedial = [
      pt(p[44]),  // left-image eye outer corner
      pt(p[109]), // nose left side
      pt(p[31]),
      pt(p[30]),
      pt(p[29]),  // face contour at cheek height
    ];
  }

  // --- rightCheekLowerLateral (patient's RIGHT lower cheek = image LEFT) ---
  if (has(22, 26, 88)) {
    out.rightCheekLowerLateral = [
      pt(p[88]),  // mouth left corner (nasolabial end)
      pt(p[26]),
      pt(p[25]),
      pt(p[24]),
      pt(p[23]),
      pt(p[22]),  // face contour jaw angle
    ];
  }

  return out;
}
