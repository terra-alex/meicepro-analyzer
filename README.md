# Meicepro analyzer

Open-source toolkit for working with [Meicepro / Meiquc](https://www.meiquc.cn/) skin-analysis reports. Reverse-engineered API documentation, multispectral interpretation guides, and a self-hostable Next.js viewer that loads any diagnosis report by ID.

Built for people who have had a Meicepro scan (commonly performed at aesthetic clinics across the EU and Asia) and want to do their own analysis with the underlying data rather than rely on the device's auto-generated PDF.

## What's in here

| Folder | What it is |
|---|---|
| [`reference/`](reference/) | Patient-agnostic knowledge: reverse-engineered API, multispectral channel interpretation guide, melanin-vs-hemosiderin differentiation methodology, device limitations. |
| [`meicepro-raw/`](meicepro-raw/) | Generic raw artifacts captured during reverse-engineering: webpack bundles, language pack, aging face-mesh model. |
| [`viewer/`](viewer/) | Next.js 16 viewer app — load any diagnosis report by ID, browse all multispectral layers with zoom/pan, compare two scans side-by-side, view the aging-morph face-mesh warp. |
| [`template/patient/`](template/patient/) | Empty scaffold you can copy into your own *private* repo to build a personal medical-record overlay (see below). |
| [`PLAYBOOK.md`](PLAYBOOK.md) | Operational guide: how to fetch a scan, add a blood panel, log a procedure outcome, prepare for a clinic visit. |

## Quick start

### Use the viewer with your own report

```sh
git clone https://github.com/terra-alex/meicepro-analyzer
cd meicepro-analyzer/viewer
pnpm install
pnpm dev
```

Open `http://localhost:3000/?id=<your-diagnosis-id>`. The diagnosis ID is the `id` query parameter in the URL of any Meicepro report viewer link (look for `eu-meicepro-api.meiquc.cn/meicepro-h5/pages/report/report?id=...`).

The viewer fetches the report from the Meicepro EU API (publicly accessible — no auth required for the `/open/diagnosis/get` endpoint).

### Use the analyzer alongside your own private medical record

Recommended pattern: keep this repo as a public dependency, and overlay your personal data in a separate private repo using a git submodule. See [`PLAYBOOK.md`](PLAYBOOK.md) § "Use this as a submodule in your private workspace" or [`template/patient/`](template/patient/) for the scaffold.

## Reference doc highlights

- [`reference/meicepro-api.md`](reference/meicepro-api.md) — full API reverse-engineering: endpoints, response shapes, OSS image layout, symptom code dictionary (codes 01–18), field semantics, web-viewer behaviour.
- [`reference/multispectral-interpretation.md`](reference/multispectral-interpretation.md) — how to read each image channel: daylight, cross-polarised, parallel-polarised, UV variants, blood maps, brown maps, deep maps, algorithm masks.
- [`reference/melanin-vs-hemosiderin.md`](reference/melanin-vs-hemosiderin.md) — substrate-differentiation methodology. The central reasoning that drives treatment-tool selection (IPL vs Nd:YAG) for periorbital and malar findings.
- [`reference/device-limitations.md`](reference/device-limitations.md) — what the device and its algorithms cannot detect (fat herniation, true lateral profile, certain anatomic exclusions in the algorithm masks). Read this before asking the data a question it can't answer.

## Status

- API reference: complete and tested against the EU region as of 2026-05.
- Viewer: functional. Loads any diagnosis ID, side-by-side compare works, aging morph renders, URL state persists. Has known rough edges around dependency on the OSS image CORS proxy.
- Multispectral guides: stable methodology.
- Patient template: minimal scaffolding only — most personalisation happens in your private overlay.

## Licence

MIT. See [`LICENSE`](LICENSE).

## Disclaimer

This project is reverse-engineering of a third-party device for educational and personal-record purposes. It is **not** a medical device, not affiliated with Meiquc / Meicepro, and produces no diagnoses. Any interpretation or treatment plan derived from this software should be reviewed by a qualified clinician. Use entirely at your own risk.

The maintainers of Meicepro have not authorised, endorsed, or supported this project. Treat all interpretation as approximate and consult qualified dermatology and oculoplastic professionals for any actual treatment decisions.

## Contributing

Issues and pull requests welcome — particularly for:
- Other regional API mappings (the EU region is documented; CN, SEA, etc. may differ)
- Additional symptom code mappings or algorithm behaviour observations
- Viewer enhancements (region-ROI tracker is the most-wanted feature — see [`PLAYBOOK.md`](PLAYBOOK.md))
- Better worked examples / interpretation case studies (synthetic data only — never share real patient data)

## Author

Built by [Alex Venetidis](https://github.com/terra-alex). Reach out via GitHub issues.
