# Reference

Patient-agnostic knowledge about the Meicepro / Meiquc skin-analysis system and how to interpret its outputs. Nothing in this folder is tied to a specific patient — it would all be the same for any user of the device.

## Files

| File | What it covers |
|---|---|
| [`meicepro-api.md`](meicepro-api.md) | Reverse-engineered API: endpoints, request/response shapes, OSS image layout, symptom codes (01–18), field semantics, web viewer behaviour. The canonical reference doc. |
| [`multispectral-interpretation.md`](multispectral-interpretation.md) | How to read each image channel (daylight, cross/parallel-polarised, UV variants, blood maps, brown maps, deep maps, algorithm masks). |
| [`melanin-vs-hemosiderin.md`](melanin-vs-hemosiderin.md) | Differential approach for separating melanin (freckles, lentigines, PIH, melasma) from hemosiderin (dermal iron from past bleeding) and active telangiectasia. The central reasoning that drives treatment-tool selection (IPL vs Nd:YAG). |
| [`device-limitations.md`](device-limitations.md) | What the Meicepro algorithm and capture rig cannot detect or distinguish. Important: don't ask the data a question it can't answer. |

## See also

- [`../meicepro-raw/`](../meicepro-raw/) — raw API dumps and webpack bundles that were reverse-engineered to produce these docs.
- [`../patient/findings/multispectral-analysis.md`](../patient/findings/multispectral-analysis.md) — example of these reference docs applied to a specific patient.
