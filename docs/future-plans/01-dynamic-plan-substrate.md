# Future plan — dynamic per-zone substrate verdicts + plan generator

Status: design locked (3-subagent reviewed 2026-05-12). Implementation: phase 1 in progress; plan-generator gated as "Coming Soon" until the heuristic is validated.

## Why

`PlanScreen` is currently hardcoded against one real patient case. The Substrate Inspector shows channel images but emits no verdict. We want the viewer to compute a **per-zone substrate verdict** (melanin / hemosiderin / telangiectasia / mixed / unclear / clear) from the multispectral channels, surface its reasoning, and feed it into a treatment-plan generator. A dermatology pass + an aesthetic-laser pass + an engineering pass critiqued the proposal; this file captures the resulting design.

## Core decisions from the reviews

1. **Algorithm informs, never gates.** The heuristic is unvalidated against biopsy ground truth. Treatment recommendations may flow from it; **procedure go/no-go must require a human override.** The only hard procedural blocks are dermatological contraindications from lookup tables (e.g. Fitz V–VI + IPL), not from scan-derived thresholds.
2. **Verdict ≠ recommendation.** Two separate modules. `substrate.ts` emits verdicts. `rules.ts` (and later a `planGenerator.ts`) maps verdicts + patient context → recommendations. Each is audited and swapped independently.
3. **Front capture drives substrate; L/R captures contribute asymmetry only.** Spectral channels only exist on the front; treating three directions as co-equal votes is architecturally misleading. L/R add daylight + sidewall morphology, modify confidence, do not vote.
4. **Within-scan normalisation against a reference zone**, not Fitzpatrick-shifted absolute thresholds. Forehead is the default `brownMap` baseline; nasal bridge for `deepRedMap`. If the reference zone is itself hot, fall back to Fitzpatrick-adjusted priors and flag low confidence.
5. **Confidence is a 3-level categorical label** (`high` / `moderate` / `low`) backed by a 4-point evidence score, not a continuous float. Display reason strings, not percentages.
6. **Readiness flag with a reason**, not binary gates: `proceed` / `dermatoscopy-first` / `labs-first` / `not-applicable`. The current "iron index < 0.45" gate becomes a `labs-first` readiness with an "elevated iron index — correlate with serum TSat" reason.

## Zone set (revised from 5 → 8)

| Zone | Polygon home | Why |
|------|--------------|-----|
| `periorbitalLowerLid` (L + R) | Crescent under each eye | Only region the `undereye.png` mask covers; upper lid + lateral canthal are out of scope per device limits. |
| `glabella` | Inter-brow strip | Distinct melasma/PIH concentration vs forehead; thicker skin → different IPL fluence. |
| `forehead` | Above brow line, off-centre | Default `brownMap` reference baseline. |
| `leftCheekUpperMedial` | Sup. malar, medial to mid-pupil line | 4-channel concurrence zone — melasma + sensitivity hot here. |
| `leftCheekLowerLateral` | Lower malar | Lentigines / PIH zone. |
| `rightCheekUpperMedial` | Mirror of left | Per case: this is where the patient's "needs dermatoscopy" verdict lives. |
| `rightCheekLowerLateral` | Mirror of left | — |
| `nose` | Bridge + alae | Default `deepRedMap` reference baseline. |
| `chin` | Mental region | Perioral rosacea subtype; porphyrin loading. |

Always split L vs R cheek. Never merge "cheeks" into one verdict — even when the verdicts agree, the asymmetry signal is clinical data. Skip temples + mandible until capture coverage improves.

## Verdict taxonomy

- `melanin_lentigo` — discrete spots + brownMap warm + brownSpot mask >5% coverage (non-periorbital)
- `melanin_melasma` — diffuse bilateral brownMap, malar/glabella, hormonal context modifier
- `melanin_pih` — brownMap warm in zone with prior/current sensitiveArea or co-located acne
- `hemosiderin` — deepRedMap warm + brownMap relatively cold (`< deepRed − 0.10`) + bloodmap < 0.20 + undereye mask branching (aspect ratio > 2.0 in periorbital)
- `telangiectasia` — bloodmap > 0.35 OR (deepRedMap warm + redmap > 0.40 + bloodmap moderate)
- `mixed` — primary and secondary channel ratio < 1.5×
- `inflammation` — sensitiveArea > 10% coverage in zone (dominant, substrate unclear)
- `hypopigmentation` — `delta_brownMap` significantly below the forehead reference (→ possible vitiligo, hard treatment contraindication)
- `structural_shadow` — low brownMap + low deepRedMap + undereye mask present + wrinkleUndereyeAgingIndex elevated (filler / non-energy referral)
- `unclear` — ambiguous; channels disagree or confidence < 0.3
- `clear` — all channels cold
- `no_data` — all URLs failed or null (sample-report case)
- `occluded` — zone mean abnormally low across all channels (hair/ear coverage)

## Decision thresholds (starting values; needs tuning vs real cohort)

| Rule arm | Value | Source |
|----------|-------|--------|
| `deepRedMap` for hemosiderin | > 0.40 | Zone-mean diluted by surrounding skin; clinical reviewer recommended down from 0.55 |
| `brownMap` cold for hemosiderin | relative: `< deepRed − 0.10` | Relative comparison matches reference methodology |
| `bloodmap` cold for hemosiderin | < 0.20 | Baseline perfusion noise floor |
| `bloodmap` hot for telangiectasia | > 0.35 | Clinical reviewer flagged 0.55 as systematically under-calling |
| `brownMap` for melanin | normalised `delta > 0.15` | Within-scan, not absolute |
| `brownSpot` mask | > 5% (non-periorbital only) | Mask anatomically out of scope for periorbital |
| `sensitiveArea` flag | > 10% (warn), > 20% (high) | Two-level; periorbital excluded |
| Asymmetry trigger | ratio > 1.7× per channel | "Notable asymmetry" first-class finding |
| Reference-zone hot fallback | `forehead_brownMap > 0.55` | Fall back to Fitzpatrick priors when reference is dirty |

## Confidence model (4-point evidence score)

+1 if primary channel exceeds threshold by ≥ 0.10
+1 if secondary exclusion channel is below its threshold by ≥ 0.15
+1 if relevant anatomical mask (undereye / brownSpot / sensitiveArea) confirms the substrate
+1 if a tertiary channel (deepBrownMap or redmap) agrees directionally

Map: 4 → `high`, 2–3 → `moderate`, 0–1 → `low` (force clinician review).

## Hard contraindications baked in (lookup table, not heuristic)

- Fitz III+ + any IPL/laser → mandatory test patch
- Fitz V–VI + IPL → hard contraindication
- Melasma + IPL standalone → hard contraindication (rebound risk)
- Hemosiderin periorbital + Nd:YAG → corneal shield + operator cert required
- Mixed substrate + IPL → sequential treatment, address vascular first
- Active inflammation + any energy → defer until resolved
- Hypopigmentation/vitiligo + IPL → hard contraindication
- Active acne in zone + IPL → treat acne first
- Periorbital + hydroquinone → ophthalmic-grade formulation only
- Chief complaint mentions "petechiae"/"bruising" + hemosiderin verdict → systemic workup before laser

## File layout (engineering plan)

```
lib/clinical/
  types.ts                  pure types
  zonePolygons.ts           Record<ZoneKey, NormPoint[]> in 0..1 image-fraction coords
  rules.ts                  thresholds + contraindication lookup table
  substrate.ts              verdictFromSignals(samples, skinType, refs) → ZoneVerdict
  sampler.ts                sampleZone via OffscreenCanvas + bbox + point-in-polygon
  sampleCache.ts            module-level Map keyed `${diagId}:${dir}:${zone}:${channel}`
  useSubstrateVerdicts.ts   "use client"; useReducer for progressive zone-by-zone
```

Sampler implementation notes:
- `crossOrigin = "anonymous"` **before** `.src` — most common taint bug.
- `OffscreenCanvas`, then `getImageData(bbox.x, bbox.y, bbox.w, bbox.h)` of the polygon bbox only.
- Even-odd ray cast for point-in-polygon. ~45k pixel tests < 1 ms.
- `fetch()` first, check `response.ok`, decode via `createObjectURL(blob)` — gives explicit error vs Image onerror ambiguity.
- `AbortController` per `face.id + direction`; cleanup in `useEffect`.
- Sample lazily by direction. Dedupe by URL (one image often serves multiple zones).
- Bail-out: if `deepRed/brown > 2.5` after first 2 channels, skip remaining tie-breakers.

## Phasing

**Phase 1 (now, in this PR):**
- Build lib/clinical/* with the rule-based engine.
- Wire SubstrateScreen to consume verdicts + show channel values + decision-rule trace + categorical confidence + readiness flag.
- Plan + Bloodwork = "Coming Soon" placeholder screens.

**Phase 2 (next PR):**
- Add patient-context checklist (see `02-fitzpatrick-history-flags.md`).
- Plan generator: verdict + context + lookup-table-contraindications → ordered recommendation list.
- Per-zone Plan entries (never merged L/R).

**Phase 3 (later, requires validation cohort):**
- Replace rule weights in `rules.ts` with a learned classifier (one-file swap; signature unchanged).
- Tune thresholds against biopsy / dermatoscope ground truth.
- A/B compare hand-tuned vs learned per-zone.

## Known limitations to surface in UI

- Heuristic informs only; not a diagnosis.
- Verdicts in periorbital require human sign-off (ocular safety, mask coverage limits).
- `low` confidence verdicts cannot advance to treatment recommendations without explicit override.
- Channels confounded by sebum / makeup / recent erythema / post-procedure inflammation / very dark skin.
- The "iron index" displayed on ROI is a computed heuristic with no validated clinical threshold — it informs, never gates.

## jsonAging landmark schema (discovered 2026-05-13)

The `jsonAging` field on each `DiagnosisSkin` points to an Aliyun OSS JSON asset. The
`/api/img` proxy passes JSON through correctly (Content-Type forwarded from upstream),
so no separate `/api/json` route was needed.

### Payload shape

```ts
{ padding: number; start_pts: Pt[]; target_pts: Pt[]; tri_idx: Tri[] }
// Pt  = { x: number; y: number }           — normalised 0..1 image-fraction
// Tri = { x: number; y: number; z: number } — indices into start_pts / target_pts
```

174 landmarks in the center-face sample (MC900 v1.3.0.6). The `padding` field is
informational (value 50 in sample — in pixels relative to some internal crop). The
landmark positions in `start_pts` match the raw image directly; the `AgingMorph` code
confirmed that mapping with padding produced visibly worse results.

### Landmark index groups (center face)

| Range | Region |
|-------|--------|
| 0–35 | Face contour / jaw outline (clockwise from top-center) |
| 36–51 | Left-image eye outline (anatomically: patient's right periorbital) |
| 52–67 | Right-image eye outline (anatomically: patient's left periorbital) |
| 68–77 | Right-image eyebrow arc |
| 78–87 | Left-image eyebrow arc |
| 88–107 | Mouth outline |
| 108–123 | Nose / nostril outline |
| 124–173 | Image-border grid points (ignored for zone derivation) |

### Landmark indices used per zone

| Zone key | Indices used |
|----------|--------------|
| `forehead` | 0, 35 (face-top), 73, 74 (R-brow crown), 83, 84 (L-brow crown) |
| `glabella` | 72, 82 (brow inner ends), 36, 52 (eye inner corners) |
| `periorbitalL` (patient's left = image right) | 52–67 (right-image eye outline) |
| `periorbitalR` (patient's right = image left) | 36–51 (left-image eye outline) |
| `nose` | 108–123 (nostril outline) |
| `chin` | 16–20 (lower contour), 93 (lower lip) |
| `leftCheekUpperMedial` | 59 (R-eye outer corner), 8–10 (jaw contour), 119 (nose side) |
| `leftCheekLowerLateral` | 10–14 (jaw contour), 96 (mouth R corner) |
| `rightCheekUpperMedial` | 44 (L-eye outer corner), 109 (nose L side), 29–31 (jaw contour) |
| `rightCheekLowerLateral` | 88 (mouth L corner), 22–26 (jaw contour) |

### Implementation

- `lib/clinical/landmarkPolygons.ts` — `AgingJson` type + `polygonsFromLandmarks(mesh)` function
- `lib/clinical/useZonePolygons.ts` — `useZonePolygons(face, direction)` hook; fetches via `/api/img`, merges with hand-tuned fallback
- `lib/clinical/useSubstrateVerdicts.ts` — accepts optional `resolvedPolygons?: ZonePolygonMap`; uses landmark polygons when provided
- `components/screens/ZoneVerdictGrid.tsx` — calls `useZonePolygons` and passes result to `useSubstrateVerdicts`

The hand-tuned polygons in `zonePolygons.ts` remain as the fallback when `jsonAging` is absent or fails to load.

## References

- `/reference/multispectral-interpretation.md`
- `/reference/melanin-vs-hemosiderin.md`
- `/reference/device-limitations.md`
- `/reference/meicepro-api.md`
- Subagent reviews captured in conversation transcript 2026-05-12 (skin-analysis ×2 + engineering).
