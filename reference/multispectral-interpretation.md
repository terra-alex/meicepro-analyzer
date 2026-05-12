# Multispectral interpretation guide

The Meicepro device captures the same face under multiple illumination and filter conditions, plus a set of algorithmically derived "maps" and "masks." Comparing the same lesion across channels lets you separate dermal substrates by their absorption signature — something that's impossible from a single white-light photograph.

This document is a per-channel reading guide.

## Capture channels (raw imagery)

These are the actual photographs taken by the device.

| Channel | Filename | What it is | What it shows |
|---|---|---|---|
| Daylight | `daylight.jpg` | Standard broadband illumination | Surface appearance under natural-equivalent light. Baseline reference. |
| Cross-polarised | `cross.jpg` | Crossed polariser between source and camera | **Subsurface pigment and vasculature**. Eliminates surface specular reflection — see "into" the skin. Best channel for melanin and superficial blood vessels. |
| Parallel-polarised | `parallel.jpg` | Parallel polariser | **Surface texture and oil**. Emphasises specular reflection — see surface relief, sebum, dryness. Opposite of cross. |
| UV (Wood's light) | `uv.jpg` | Long-wave UV (~365 nm) | **Melanin distribution** (UV is absorbed strongly by melanin → pigmented spots appear dark) + **porphyrin fluorescence** (P. acnes byproducts fluoresce orange/yellow under UV). |
| UV special | `uvSpecial.jpg` | UV with band-pass filter | Higher-contrast version of UV — usually used for porphyrin specifically. |
| UV high-contrast | `uvHighContrast.jpg` | Post-processed UV | Stretched contrast to amplify subtle pigment patterns. |

## Derived heatmaps

The device's algorithm computes these from the raw captures. They aren't separate photographs — they're false-colour overlays computed from spectral analysis of the cross-polarised + UV channels.

### Blood / vascular channels

| Map | What it represents | Highlights |
|---|---|---|
| `bloodmap.jpg` | Oxyhemoglobin in active vessels | Active vasculature, telangiectasia, flushed/inflamed areas. **If a dark area lights up here, it's vascular flow.** |
| `redmap.jpg` | Generic red signal | Broader red-channel intensity, less flow-specific than bloodmap. |
| `redhotmap.jpg` | High-intensity red zones | Concentrated erythema (e.g. inflammatory acne, telangiectatic patches). |
| `deepRedMap.jpg` | **Deep dermal red signal** | Hemosiderin, deep telangiectasia, post-inflammatory vascular residue. **Critical channel for separating dermal iron from active vessels** — if `deepRedMap` lights up where `bloodmap` is dark, it's hemosiderin not active flow. |
| `coolMap.jpg` | Cool tones (blueish) | Tear-trough shadowing, low-perfusion areas. |

### Pigment channels

| Map | What it represents | Highlights |
|---|---|---|
| `brownMap.jpg` | Epidermal melanin | Surface freckles, lentigines, hyperpigmentation. |
| `deepBrownMap.jpg` | Dermal melanin | Deeper melanin deposits (melasma, dermal nevus, PIH). |
| `brownSpot.png` | Discrete melanin spot detections | Algorithm's bounded contour mask of "freckles." Only covers forehead, cheeks, and nose — periorbital region is excluded by design (see [`device-limitations.md`](device-limitations.md)). |
| `deepSpot.jpg` | Deep pigment spot intensity | False-colour intensity of dermal melanin deposits. |
| `deepGraySpot.jpg` | Greyish/blue-grey deposits | Often correlates with deep dermal melanin or ochronosis-like patterns. |
| `surfaceSpot.png` | Discrete superficial spots | Surface texture-recognised spots. |
| `surfaceSpotAging.jpg` | Age-associated surface spots | Aging-pattern lentigines. |

### Algorithm masks (anatomical detections)

These are detection contours — the algorithm identifies a region and marks features inside it.

| Mask | What it detects |
|---|---|
| `sensitiveArea.png` | Subclinical inflammation, vascular reactivity, barrier dysfunction. Three contour zones: cheeks (left/right) + nose teardrop. |
| `undereye.png` | Pigmentation and texture under each lower lid. Branching/feathered streaks vs discrete punctate dots are clinically distinguishable here. |
| `pore.png` | Visible pore density and openness, predominantly on nose and cheeks. |

### Side / lateral channel

| Mask | What it is |
|---|---|
| `side.png` (on left/right directions) | **Misleading name**: this is the lateral canthal "crow's-feet" wrinkle mask, not a true profile capture. Despite the name, it does not provide lateral fat-herniation visualisation. |

## How to actually read a region

The standard workflow for interpreting any periorbital, malar, or peri-oral finding:

1. **Start with daylight** to identify visible features.
2. **Cross vs parallel** — does the feature live under the surface (visible in cross only) or on the surface (visible in parallel)?
3. **UV** — does it darken under UV? If yes, melanin component present.
4. **bloodmap vs deepRedMap** — does it have active blood flow (lights up bloodmap) or static deep red signal (lights up deepRedMap only)? This distinguishes telangiectasia from hemosiderin.
5. **brownMap vs deepRedMap intensity comparison** for the same region — whichever channel shows more signal is the dominant substrate.
6. **Algorithm masks** — does the algorithm flag the area? Where? With what shape (round dots vs branching streaks vs blotches)?

See [`melanin-vs-hemosiderin.md`](melanin-vs-hemosiderin.md) for the substrate-differentiation logic in detail.

## Capture directions

Each scan captures the face at three angles:

| direction value | label | What is captured | Image folder |
|---|---|---|---|
| `0` | front | Full front: all maps and masks | `images/center/` |
| `-1` | left (3/4 view) | Daylight + side wrinkle mask only | `images/left/` |
| `1` | right (3/4 view) | Daylight + side wrinkle mask only | `images/right/` |

The side captures are **3/4 angle views (~45°)**, not pure 90° lateral profile. For features that need true profile (e.g. evaluating orbital fat protrusion), the device's output is insufficient — see [`device-limitations.md`](device-limitations.md).

## See also

- [`meicepro-api.md`](meicepro-api.md) — full field-by-field schema, what URL serves which image
- [`melanin-vs-hemosiderin.md`](melanin-vs-hemosiderin.md) — the substrate-differentiation methodology
- [`device-limitations.md`](device-limitations.md) — what the device cannot show
- [`../patient/findings/multispectral-analysis.md`](../patient/findings/multispectral-analysis.md) — worked example
