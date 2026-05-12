# Differentiating melanin, hemosiderin, and telangiectasia

The single most important interpretive task in periorbital and malar analysis is separating these three substrates, because **they look similar in white light but require different treatments**:

| Substrate | What it is | Responds to |
|---|---|---|
| **Melanin** | Pigment produced by melanocytes (freckles, lentigines, melasma, PIH) | IPL, Q-switched 532 nm, tretinoin, hydroquinone, sun avoidance |
| **Hemosiderin** | Iron deposited in the dermis after RBC extravasation (resolved bruises, petechial residue) | Q-switched/picosecond 1064 nm Nd:YAG; not IPL, not hydroquinone |
| **Active telangiectasia** | Dilated superficial vessels | Pulsed-dye laser, KTP, sometimes IPL |

Picking the wrong tool wastes treatment, can worsen the appearance (e.g. IPL on Fitz III/IV skin with hemosiderin → PIH on top of iron), and erodes patient trust. Get the substrate right first.

## Multispectral signatures

The Meicepro data lets you triangulate substrate by comparing channels.

| Signal | Melanin | Hemosiderin | Active telangiectasia |
|---|---|---|---|
| **Daylight appearance** | Brown to dark-brown spots or patches | Brownish, sometimes purplish or slate-grey | Pink to red, often visible vessel patterns |
| **UV (Wood's)** | **Darkens** (melanin absorbs UV strongly) | No change or mild darkening | No change |
| **Cross-polarised** | Pigment more visible (sees subsurface) | Pigment visible | Vessels more visible |
| **Parallel-polarised** | Pigment muted (surface emphasis) | Pigment muted | Vessels muted |
| **`bloodmap`** | Cold (no active flow signal) | Cold or mildly warm | **Bright red** (active flow) |
| **`redmap` / `redhotmap`** | Cold | Warm-to-hot (static red) | Hot (with vessel-shaped pattern) |
| **`deepRedMap`** | Cold | **Hot** (the signature signal) | Variable |
| **`brownMap`** | **Hot** | Warm | Cold |
| **`deepBrownMap`** | Warm-to-hot if dermal melanin | Warm | Cold |
| **`brownSpot` mask** | Detected as a discrete spot | Outside the mask's anatomical zones (algorithm excludes periorbital) | Not detected |

### The decision rules

The clearest single test is the **deepRedMap vs brownMap intensity comparison for the same region**:

- `deepRedMap` **>** `brownMap` → vascular / iron origin dominant
- `brownMap` **>** `deepRedMap` → melanin origin dominant
- both hot → mixed substrate (treat the more troubling one first or treat sequentially)

For the deepRedMap-positive subset, the next test is `bloodmap`:

- `bloodmap` hot in the same area → active telangiectasia (treatable with PDL/KTP)
- `bloodmap` cold → hemosiderin (treatable with Nd:YAG 1064 nm)

## Morphology helps too

Shape information from the daylight and undereye-mask channels:

| Pattern | Most likely |
|---|---|
| **Discrete round 1–4 mm spots** | Solar lentigines or freckles (melanin) |
| **Discrete 1–2 mm round dots, deep red** | Active petechiae (acute, recent) |
| **Branching, feathered streaks following lymphatic/vascular lines** | Resolved petechial residue → hemosiderin (chronic) |
| **Diffuse uniform patches** | Melasma or PIH (melanin) |
| **Linear visible vessels** | Telangiectasia |
| **Web-like fine networks** | Telangiectasia or rosacea-spectrum |

## Why this distinction matters for treatment

IPL works on chromophores at ~500–600 nm: melanin (eumelanin) and oxyhemoglobin. **Hemosiderin's absorption peaks are ~410 nm and >600 nm — IPL hits neither well.** Worse, IPL on Fitz III/IV skin where hemosiderin is the substrate can:

1. Fail to clear the iron (wrong target wavelength)
2. Cause post-inflammatory hyperpigmentation in the surrounding skin, *adding* melanin on top of the existing iron
3. In the periorbital zone, present an ocular safety hazard

Q-switched / picosecond Nd:YAG at 1064 nm penetrates deeper, has high photoacoustic efficiency on iron, and is eyelid-safe with properly fitted corneal shields. **This is the right tool for hemosiderin, and only for hemosiderin** — it overlaps less efficiently with melanin (use 532 nm or IPL for that).

Hydroquinone is a tyrosinase inhibitor: it only blocks melanin synthesis. It does nothing to hemosiderin. Applying it to hemosiderin-driven darkening is wasted effort and can irritate thin periorbital skin, causing PIH.

Topical tretinoin accelerates dermal turnover and macrophage activity — modestly useful adjunct for hemosiderin clearance, and broadly useful for melanin via melanosome-transfer suppression.

## Common interpretive mistakes

1. **Assuming all dark periorbital skin is melanin.** Especially in patients with any history of pressure-related capillary rupture (vomiting, severe coughing, weightlifting Valsalva), hemosiderin is more common than melanin in this zone.
2. **Trusting `bloodmap` alone to rule out vascular origin.** `bloodmap` detects active flow, not static iron. Hemosiderin is invisible to `bloodmap` because the blood that caused it has long resolved.
3. **Treating the `brownSpot` mask as the algorithm's verdict on periorbital pigmentation.** The mask is anatomically restricted to forehead + cheeks + nose; it deliberately excludes periorbital. Absence of the mask there is not the same as absence of pigment — see [`device-limitations.md`](device-limitations.md).
4. **Reading `deepRedMap` as "telangiectasia."** It's deep red signal, not flow signal. Use `bloodmap` to confirm active flow vs static iron.

## See also

- [`multispectral-interpretation.md`](multispectral-interpretation.md) — channel-by-channel guide
- [`device-limitations.md`](device-limitations.md) — what the channels can't tell you
- [`../patient/findings/multispectral-analysis.md`](../patient/findings/multispectral-analysis.md) — worked example with all four substrates analysed
