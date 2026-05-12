# Raw Meicepro reverse-engineering artifacts

This folder holds the **patient-agnostic** raw artifacts pulled from the Meicepro web viewer. They are the source material that [`../reference/meicepro-api.md`](../reference/meicepro-api.md) was reverse-engineered from. None of them contain patient-specific data.

Patient-specific raw artifacts (the actual diagnosis JSON, images) live under [`../patient/scans/`](../patient/scans/).

## Files

| File | What it is | Generic / patient-agnostic? |
|---|---|---|
| `aging-center.pretty.json` | Aging-morph face-mesh model: 174 landmark source/target point pairs + 318 triangle indices used to warp any face image into an "aged" appearance. No patient references. | **Generic** — the same model is used for every user. |
| `applanguage.json` | Language pack registry: 94 entries listing supported app languages with translation file URLs. | **Generic** — service-wide locale table. |
| `webpack-bundles/` | The compiled Vue/Uniapp JS bundles served by the H5 viewer at `/meicepro-h5/static/js/`. Used for reverse-engineering API endpoints, field names, and symptom code dictionaries. | **Generic** — compiled application code. |

## Webpack bundle index

| Bundle | What it implements |
|---|---|
| `chunk-vendors.js` | Shared vendor dependencies (Vue, UI libs). |
| `index.js` | App entry point and router bootstrap. |
| `pages-index-index.js` | Main home/dashboard page. |
| `pages-ai-ai.js` | AI skin-trend analysis page. |
| `pages-aichat-index.js` | AI chatbot page (voice + text). |
| `pages-report-report.js` | Main report view page (skin analysis + beauty plan). |
| `pages-report-analyze.js` | Per-symptom analysis detail page. |
| `pages-report-beautySkin.js` | "Beauty Skin" sub-report with product list and pricing. |
| `pages-report-aInit.js` | Report initialisation / async data-fetch layer. |
| `pages-report-suggest.js` | Suggestions page (effectively empty / redirect stub, 1 KB). |
| `pages-push-parameters-index.js` | Push notification parameters / product-type configuration. |

The bundles are minified. Use them as a grep target for strings (endpoint paths, field names, symptom codes) rather than reading them top-to-bottom.

## Download date

All files captured on 2026-05-07 from `https://eu-meicepro-api.meiquc.cn` and the corresponding H5 viewer host.

## See also

- [`../reference/meicepro-api.md`](../reference/meicepro-api.md) — the authoritative reverse-engineered reference documentation derived from these artifacts.
- [`../patient/scans/`](../patient/scans/) — patient-specific raw data (diagnosis JSON and OSS images).
