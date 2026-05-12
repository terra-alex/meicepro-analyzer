# Meicepro device and algorithm limitations

What the device can do is documented elsewhere; this file is the inverse — **what it can't see, what its algorithm doesn't try to detect, and where its outputs can mislead an inattentive reader.** Important for interpreting any future scan: don't ask the data a question it can't answer.

## Anatomical / structural

### No fat-herniation detection
The device captures only front (0°) and 3/4-angle (~45°) views, never a true 90° lateral profile. **Suborbital fat pseudoherniation ("eye bags") cannot be reliably ruled out from Meicepro data alone**, because the lid-cheek profile is best assessed in pure lateral. The 3/4 views are useful — a flat lower-lid contour there is reassuring — but a small medial fat-pad bulge can hide on this projection.

Clinical workaround: ask the patient to tilt the head down and look up. Pseudoherniation will protrude visibly. A 30-second in-clinic check.

### No volumetric / surface-relief metric
The face mesh used in the aging-morph (`aging-center.pretty.json`) is a 2D landmark grid with triangulated warps. It does not produce a depth map, so:
- Tear trough hollowness vs flatness is inferred indirectly from shadowing, not measured
- Cheek volume loss is not quantified
- Lip projection, nose projection, jawline definition — none of these have algorithmic outputs

### No malar bag / festoon detection
Same root cause as fat herniation — no lateral view, no depth.

## Algorithmic-mask scope restrictions

### `brownSpot` excludes the periorbital region
The `brownSpot.png` algorithm's anatomical contour covers **forehead + both cheeks + nose teardrop only**. The under-eye region is *deliberately* not part of this mask.

**Implication**: a periorbital dark area not flagged by `brownSpot` is not "ruled out as melanin" — it's outside the mask's scope. Use `brownMap` (not `brownSpot`) for periorbital melanin assessment, or read the under-eye region's `undereye.png` mask, which is the algorithm's correct tool for that anatomy.

### `sensitiveArea` excludes the periorbital region
Same anatomical scope as `brownSpot` — cheeks + nose teardrop + (small) forehead. Periorbital sensitivity is not assessed.

### `undereye` only reports under-lid, not full periorbital
The `undereye.png` mask covers the lower lid crescent. **Upper lid pigmentation, brow region, and lateral canthal pigmentation** are not in scope.

### `side.png` is not what its name suggests
On the left/right direction captures, the `side.png` file is the **lateral canthal wrinkle (crow's-feet) mask**, not a side-profile capture. Despite the filename, it provides no structural lateral information.

## Channel limitations

### `bloodmap` measures flow, not blood-history
A channel that "lights up red" on `bloodmap` indicates **active blood flow** (oxyhemoglobin in functioning vessels). It is silent on:
- Hemosiderin (iron left after blood is gone)
- Recently resolved bruises (the heme is gone, only iron remains)
- Microcirculation that has shut down

Treat `bloodmap` as a flow indicator. For static iron, use `deepRedMap` and the morphology of the underlying lesion.

### UV channel can't distinguish epidermal vs dermal melanin
UV preferentially absorbs melanin but does not tell you which dermal layer the melanin sits in. `deepBrownMap` is the channel that attempts that distinction (with mixed reliability).

### Cross-polarised does not fully eliminate surface reflection on oily / sebaceous skin
Heavy sebum (especially T-zone) attenuates the cross-polarised effect locally. Compare cross vs parallel side-by-side on greasy areas; reduced contrast between them means polarisation is being defeated.

### Acne porphyrin signal can be confused with sebum highlights
On the UV channel, P. acnes porphyrin fluorescence is yellow-orange. Severe oiliness also reflects UV diffusely. Look for *localised punctate* signal (porphyrin = pore-level) vs *diffuse haze* (sebum).

## Symptom code limitations

The 18-symptom code set (`reference/meicepro-api.md` §6) does **not** include:

- Petechiae / purpura (treated as part of code 12 "redness" if at all)
- Hemosiderin / post-inflammatory pigmentation specifically (folded into pigmentation codes)
- Vascular malformations (treated as redness or sensitivity)
- Texture irregularities below the algorithm's resolution
- Asymmetric findings (no left/right delta computation; the three direction reports are independent)
- Eye bags, dark circles caused by structural shadowing (the algorithm reports `undereyeAgingIndex` but conflates pigmentation + texture + structural shadowing)
- Acne scarring morphology (only counts, not depth or distribution)

## Scoring caveats

### `wrinkleUndereyeAgingIndex` is a composite
A "low" aging index for the under-eye region is *good news for skin quality* but does not specifically address pigmentation or hemosiderin in that zone. A patient with severe hemosiderin staining can still have a low `wrinkleUndereyeAgingIndex` because the score weights fine-line presence + crepe-y texture + structure, not pigmentation.

### Direction reports are not symmetric by construction
The front capture is a single image — left and right halves come from the same exposure. The left and right captures are **separate exposures** with slightly different lighting and skin orientation. Cross-direction comparisons (e.g. "left malar score vs right malar score") have an inherent capture-condition noise floor — small score differences are not necessarily clinically meaningful.

### `skinAge` and `skinScore` are device proprietary
The device reports a "skin age" that combines wrinkle, texture, pigment, and sensitivity into one number. The weighting is proprietary and not documented. Track it as a single longitudinal number per patient on the same device — don't compare across devices or firmware versions.

## Things to do externally

If your clinical question is one of the items below, the Meicepro data is **insufficient on its own**:

| Question | Where to look instead |
|---|---|
| Fat herniation, festoons, malar bags | In-person profile photo + supraorbital lookup test |
| Petechiae cause (mechanical vs platelet disorder vs coag) | CBC + platelets + coag panel (see `patient/blood-tests/`) |
| Hemosiderin systemic substrate (iron status) | Serum iron + TSat + ferritin + HFE genotype |
| Melasma confirmation (vs PIH vs lentigines) | Dermatoscopy + Wood's lamp in person |
| Vitamin / nutrient drivers of fragility | Vit C, K1, D — blood panels |
| Telangiectasia mapping for sclerotherapy | Polarised dermoscopy or videocapillaroscopy |
| Mole / nevus malignancy assessment | Dermatoscopy (Meicepro is not designed for lesion screening) |

## See also

- [`multispectral-interpretation.md`](multispectral-interpretation.md) — channel guide (positive scope)
- [`melanin-vs-hemosiderin.md`](melanin-vs-hemosiderin.md) — interpretive methodology
- [`../patient/findings/fat-herniation-check.md`](../patient/findings/fat-herniation-check.md) — worked example of the workaround for the lateral-profile gap
