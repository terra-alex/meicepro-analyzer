# Future plan — bloodwork PDF parser + BloodworkScreen

Status: design (not implemented). Follows Phase 2 of `01-dynamic-plan-substrate.md` — plan-generator gating on `labs-first` readiness requires structured lab values to be available in the viewer.

---

## Background and motivation

The substrate-verdict engine can emit a `labs-first` readiness flag — e.g. "elevated iron index — correlate with serum TSat" — but it currently has no mechanism to receive or display the actual lab result. The `BloodworkScreen` is a `ComingSoonScreen` placeholder. This document designs the parser, schema, storage, and integration needed to close that gap.

Framing: this is a **generic capability** built into the Meicepro analyzer. It is not specific to any individual. The parser accepts any lab PDF that follows the layout patterns described below; the Plan generator consumes the structured output.

---

## 1. Schema — TypeScript types

### 1.1 Core types

```typescript
/** Provenance of a reference range value. */
type RefRangeSource = "lab_report" | "library" | "computed";

/** A single measured assay result. */
interface AssayResult {
  /** Canonical identifier: LOINC code preferred; fall back to local lab code. */
  code: string;                        // e.g. "2498-4" (LOINC serum iron) or "IRON_ORO_GR"
  /** English display name (normalised, lowercase). */
  nameEn: string;                      // e.g. "serum iron"
  /** Greek display name as extracted from the PDF (optional). */
  nameEl?: string;                     // e.g. "Σίδηρος ορού"
  /** Numeric result, or a string for qualitative results (e.g. "negative", "positive"). */
  value: number | string;
  unit: string;                        // e.g. "μmol/L", "ng/mL", "%", "mg/L"
  refLow?: number;                     // lower bound of reference range (omit if open)
  refHigh?: number;                    // upper bound of reference range
  refSource: RefRangeSource;
  /** Calculated flag based on value vs refLow/refHigh. null when value is qualitative or ref unknown. */
  flag: "low" | "normal" | "high" | null;
  /** Raw text as it appeared in the PDF, for audit / debugging. */
  rawText?: string;
}

/** A complete lab report parsed from one PDF. */
interface LabReport {
  /** App-generated UUID (never the lab's own accession number). */
  id: string;
  /** ISO 8601 date the blood was drawn (not the report date). */
  collectionDate: string;              // e.g. "2026-02-17"
  /** Date of the report, if different. */
  reportDate?: string;
  /** Lab name, as extracted. */
  lab: string;                         // e.g. "Bioiatriki", "Thriva / Pura", "Medichecks"
  /** ISO 3166-1 alpha-2 country code of the lab. Affects default unit system. */
  labCountry?: "GR" | "GB" | "US" | string;
  /** ISO 639-1 language of the PDF ("el" for Greek, "en" for English). */
  pdfLanguage: "el" | "en" | string;
  /** Accreditation string if found (e.g. "ISO 15189 — ESYD 356-7"). */
  accreditation?: string;
  /** All parsed assay results. */
  assays: AssayResult[];
  /** Parser that produced this record. */
  parserVersion: string;               // e.g. "heuristic-v1.2" or "llm-claude-sonnet-4-6"
  /** Confidence in the parse: "high" means all required fields found; "low" means partial. */
  parseConfidence: "high" | "partial" | "low";
  /** Assay codes the parser attempted but failed to find. */
  missingAssays?: string[];
}
```

### 1.2 Assay catalogue — the 22 assays the Plan generator needs

Grouped by clinical panel. The "why" column explains how each feeds a substrate verdict or treatment gate.

#### Iron panel (6 assays)

| Code (LOINC) | nameEn | nameEl (common) | Unit(s) | Why it matters |
|---|---|---|---|---|
| `2498-4` | serum iron | Σίδηρος ορού | μg/dL or μmol/L | Primary iron status; high → increased hemosiderin substrate |
| `2500-7` | TIBC | Ολική Σιδηροδεσμευτική Ικανότητα / TIBC | μg/dL or μmol/L | Context for TSat calculation |
| `35215-3` | UIBC | Ακόρεστη Σιδηροδεσμευτ. Ικ. | μg/dL or μmol/L | Complement to TIBC |
| `14798-3` | transferrin saturation | Κορεσμός Τρανσφερρίνης / TSat | % | **Key gate**: TSat >50% → `labs-first` readiness for periorbital hemosiderin |
| `2276-4` | ferritin | Φερριτίνη | ng/mL or μg/L | Iron stores; high = chronic overload; low = deficiency anaemia |
| `20509-6` | transferrin | Τρανσφερρίνη | mg/dL or g/L | Optional; used when TIBC not measured directly |

#### Haematology — erythrocyte series (2 assays)

| Code | nameEn | nameEl | Unit | Why |
|---|---|---|---|---|
| `718-7` | hemoglobin | Αιμοσφαιρίνη (HGB) | g/dL | Low Hgb indicates iron-deficiency anaemia (opposite gate to overload) |
| `4544-3` | hematocrit | Αιματοκρίτης (HCT / HT) | % | Companion to Hgb; supports anaemia check |

#### Hormonal panel (6 assays)

| Code | nameEn | nameEl | Unit | Why |
|---|---|---|---|---|
| `2986-8` | total testosterone | Τεστοστερόνη ολική | nmol/L or ng/dL | Hormonal modifier of sebum / pigmentation |
| `2243-4` | estradiol (E2) | Οιστραδιόλη | pmol/L or pg/mL | Melasma hormonal driver; relevant for `melanin_melasma` verdict modifier |
| `2857-1` | progesterone | Προγεστερόνη | nmol/L or ng/mL | Cycle-phase modifier for female users |
| `2191-5` | DHEA-S | DHEA-Θ / Θειική DHEA | μmol/L or μg/dL | Androgenic driver; pigmentation modifier |
| `2143-6` | cortisol (morning) | Κορτιζόλη | nmol/L or μg/dL | Cushing pattern exclusion; skin fragility |
| `3016-3` | TSH | Θυρεοτρόπος ορμόνη (TSH) | mIU/L or μIU/mL | Thyroid-driven pigmentation changes; hypothyroid → coarse skin |

#### Inflammation (2 assays)

| Code | nameEn | nameEl | Unit | Why |
|---|---|---|---|---|
| `30522-7` | hs-CRP | C-Αντιδρώσα πρωτεΐνη (υψηλής ευαισθ.) | mg/L | Active systemic inflammation → contraindication for energy-based procedures |
| `11502-2` | ESR (Westergren) | Ταχύτητα καθίζησης ερυθρών (ΤΚΕ) | mm/h | Non-specific inflammation; complements hs-CRP |

#### Vitamins (3 assays)

| Code | nameEn | nameEl | Unit | Why |
|---|---|---|---|---|
| `1989-3` | 25-OH vitamin D | 25-υδροξυβιταμίνη D | ng/mL or nmol/L | Skin barrier; immune modulation; <20 ng/mL → advisory in Plan output |
| `2132-9` | vitamin B12 | Βιταμίνη Β12 | pmol/L or pg/mL | Macrocytosis, neurological; indirectly skin-relevant |
| `2284-8` | folate | Φυλλικό οξύ / Φολικό οξύ | nmol/L or ng/mL | Methylation; mild pigmentation modulator |

#### Metabolic (2 assays)

| Code | nameEn | nameEl | Unit | Why |
|---|---|---|---|---|
| `59261-8` | HbA1c | Γλυκοζυλιωμένη αιμοσφαιρίνη (HbA1c) | mmol/mol or % | Glycation affects skin AGEs and microvasculature |
| `2345-7` | fasting glucose | Γλυκόζη νηστείας (GLUC) | mg/dL or mmol/L | Baseline metabolic; supplements HbA1c interpretation |

**Total: 22 required assays.** The parser MUST flag any report where it cannot find ≥ 4 of the 6 iron-panel assays — those are the primary Plan-generator gates.

---

## 2. Parser strategy comparison

### Layout patterns observed in real lab PDFs

Three distinct layouts appear across the PDF corpus:

**Layout A — Greek two-column (Bioiatriki, Marathoneio, older format pre-~2019)**
- Two-column: left = assay name + parenthetical abbreviation + dotted leader + colon + result + unit; right = reference range ("T.A." = Τιμές Αναφοράς).
- Header fields scattered across the top of each page (surname, name, DOB, collection date, order number).
- Section headers in all-caps Greek (e.g. `ΒΙΟΧΗΜΙΚΕΣ ΕΞΕΤΑΣΕΙΣ`, `ΑΙΜΟΔΙΑΓΡΑΜΜΑ`).
- Later Bioiatriki format (~2020+): single-column per assay, method note below, species-of-sample note below.
- Extracted text by `pdftotext -layout` is dense with whitespace padding; column positions vary by page.
- Greek text extracted correctly by Poppler (`pdftotext`).

**Layout B — English structured table (Thriva/Pura, Medichecks, OneWelbeck)**
- Single-column, one row per assay: `Biomarker | Result | Unit | Ref Range | Status`.
- Status is a coloured pill word ("OPTIMAL", "NORMAL", "ABNORMAL") — extractable as text.
- Section headers in plain English (e.g. "Advanced Iron Profile · 5 biomarkers").
- Doctor's narrative summary at top — parse separately, discard for structured output.
- Thriva uses `umol/L` (not `μmol/L`) in text output — normalise on ingest.

**Layout C — scanned / image PDF (e.g. older Bioiatriki ≤2021 reports, some private-clinic panels)**
- `pdftotext` returns 0 or 6 bytes — the PDF has no text layer.
- Requires OCR path.

### 2a Heuristic (pdftotext text-extract + regex + alias dictionary)

**Strengths**: zero API cost; fully offline; deterministic; fast (<100ms per PDF); inspectable regex corpus; no data leaves the device.

**Weaknesses**: brittle against layout drift; dotted-leader layout requires careful column detection; Greek text correct in Poppler but `pdf.js` (browser-native) has inconsistent Unicode normalisation for Greek polytonic and some combining characters — **pdfjs-dist must be tested against real Greek PDFs before committing to it as the extract engine.**

### 2b LLM-extract (PDF → text → Claude API with structured JSON schema)

**Strengths**: handles layout variability gracefully; Greek alias resolution "for free" without a hand-coded dictionary; can reason about unit conversions; works on partially-garbled extractions; can emit `parseConfidence` naturally.

**Weaknesses**: requires a network call and an Anthropic API key; per-report cost (~$0.005–$0.02 at Sonnet 4.x pricing for a 3–6 page PDF); latency ~2–4 seconds; PII risk if the raw PDF text includes patient name/DOB (see §5).

### 2c OCR + heuristic (for scanned PDFs)

**Strengths**: handles Layout C.

**Weaknesses**: Tesseract's Greek model (`ell`) is adequate but not excellent on lab fonts; an alternative is Google Cloud Vision or AWS Textract (both handle Greek well). Adding an OCR dependency is a significant complexity jump.

### Recommendation

**Primary: LLM-extract (2b) with Claude API.**

Rationale:
1. The alias dictionary problem is hard: the same analyte appears as "Σίδηρος ορού", "Σίδηρος Ορού (Fe)", "IRON SERUM", "Serum Iron", "Fe (serum)", and so on. An LLM handles these without explicit enumeration.
2. Greek/English bilingual extraction is a first-class strength of Claude — no library gap to work around.
3. The `labs-first` gate is high-stakes: a false-negative miss (parser skips TSat 72%) is worse than the small API cost.
4. The user controls when parsing happens (manual upload action) — latency is acceptable.
5. PII can be stripped from the extracted text before the API call (see §5).

Implementation: use `pdfjs-dist` to extract raw text; apply a PII-scrubber regex (strip name/DOB/AMKA lines identified by heuristic prefixes); send cleaned text to Claude with a strict JSON schema via `tool_use` / `response_format`. Parse the structured response into `LabReport`.

**Fallback: heuristic regex (2a) for Layout B (Thriva / Medichecks / OneWelbeck).**

English structured-table labs have a stable, machine-friendly format. A regex parser for these is low-risk and removes the API dependency for the most common English-lab source. The Layout B heuristic can be the offline/no-key path; the LLM path activates for Greek reports and any report the regex parser cannot confidently parse (parseConfidence = "low").

**OCR fallback (2c):** defer to v3. Surface a "scanned PDF — manual entry required" message in v1/v2. A manual-entry form is a better v2 answer than a full OCR pipeline.

---

## 3. Alias dictionary — initial mapping

The parser uses this dictionary to map raw text matches → canonical `nameEn`. Matching is case-insensitive, accent-insensitive (normalise to NFD then strip combining chars for Greek matching).

### Iron panel

| Greek aliases | English aliases | nameEn | LOINC |
|---|---|---|---|
| Σίδηρος ορού, Σίδηρος Ορού (Fe), Ολικός Σίδηρος Ορού, Σίδηρο ορού | Serum Iron, Iron (serum), Fe (serum), Iron Serum | serum iron | 2498-4 |
| Ολική Σιδηροδεσμευτική Ικανότητα, Ολική ΣΔΙ, Σιδηροδεσμευτική Ικανότητα Ορού | TIBC, Total Iron Binding Capacity, Total iron-binding capacity | TIBC | 2500-7 |
| Ακόρεστη Σιδηροδεσμευτ. Ικ., Ακόρεστη ΣΔΙ | UIBC, Unsaturated iron-binding cap., Unsaturated Iron Binding Capacity | UIBC | 35215-3 |
| Κορεσμός Τρανσφερρίνης, Κορεσμός Μεταφερρίνης, % Κορεσμός Τρανσφ. | Transferrin Saturation, TSat, % Transferrin Saturation | transferrin saturation | 14798-3 |
| Φερριτίνη, Φερρίτίνη (occasional accent variation) | Ferritin | ferritin | 2276-4 |
| Τρανσφερρίνη, Μεταφερρίνη | Transferrin | transferrin | 20509-6 |

### Vitamin panel

| Greek aliases | English aliases | nameEn | LOINC |
|---|---|---|---|
| 25-υδροξυβιταμίνη D, 25(OH)D, 25-ΟΗ Βιταμίνη D, Βιταμίνη D 25-OH | 25-OH Vitamin D, Vitamin D (25-hydroxy), 25-hydroxyvitamin D | 25-OH vitamin D | 1989-3 |
| Βιταμίνη Β12, Κυανοκοβαλαμίνη | Vitamin B12, Total B12, Cobalamin | vitamin B12 | 2132-9 |
| Φυλλικό οξύ, Φολικό οξύ, Φολάτη | Folate, Folic Acid, Serum Folate | folate | 2284-8 |

### Thyroid panel

| Greek aliases | English aliases | nameEn | LOINC |
|---|---|---|---|
| Θυρεοτρόπος ορμόνη, Θυρεοειδοτρόπος ορμόνη, TSH ορού | TSH, Thyroid Stimulating Hormone, Thyrotropin | TSH | 3016-3 |
| Ελεύθερη Τ3, Ελ. Τ3, FT3 | Free T3, FT3, Free Triiodothyronine | free T3 | 3051-0 |
| Ελεύθερη Τ4, Ελ. Τ4, FT4 | Free T4, FT4, Free Thyroxine | free T4 | 3054-4 |

### Haematology

| Greek aliases | English aliases | nameEn | LOINC |
|---|---|---|---|
| Αιμοσφαιρίνη, HGB, HB | Hemoglobin, Haemoglobin, Hgb, HGB | hemoglobin | 718-7 |
| Αιματοκρίτης, HCT, ΗΤ | Hematocrit, Haematocrit, HCT | hematocrit | 4544-3 |
| Μέσος Όγκος Ερυθρών, MCV | MCV, Mean Corpuscular Volume | MCV | 787-2 |

### Inflammation

| Greek aliases | English aliases | nameEn | LOINC |
|---|---|---|---|
| C-Αντιδρώσα πρωτεΐνη, CRP, hs-CRP, Υψ. Ευαισθ. CRP | hs-CRP, High-sensitivity CRP, hsCRP, C-Reactive Protein | hs-CRP | 30522-7 |
| Ταχύτητα Καθίζησης Ερυθρών, ΤΚΕ | ESR, Erythrocyte Sedimentation Rate, Westergren | ESR | 11502-2 |

### Hormonal

| Greek aliases | English aliases | nameEn | LOINC |
|---|---|---|---|
| Τεστοστερόνη ολική, Τεστοστερόνη, T (total) | Testosterone, Total Testosterone | total testosterone | 2986-8 |
| Οιστραδιόλη, E2, Οιστρογόνα | Oestradiol, Estradiol, E2 | estradiol (E2) | 2243-4 |
| Κορτιζόλη (πρωινή), Κορτιζόλη | Cortisol, Morning Cortisol | cortisol | 2143-6 |
| Θειική DHEA, DHEA-θειικό, DHEA-S, DHEA-Σ | DHEA-S, DHEA Sulphate, Dehydroepiandrosterone Sulphate | DHEA-S | 2191-5 |
| Ινσουλίνη νηστείας | Fasting Insulin | fasting insulin | 20448-7 |

### Metabolic

| Greek aliases | English aliases | nameEn | LOINC |
|---|---|---|---|
| Γλυκόζη νηστείας, Σάκχαρο νηστείας, GLUC | Fasting Glucose, Glucose (fasting), Blood Sugar | fasting glucose | 2345-7 |
| Γλυκοζυλιωμένη αιμοσφαιρίνη, HbA1c, Γλυκ. Αιμοσφ. | HbA1c, Glycated Haemoglobin, Glycosylated Hemoglobin | HbA1c | 59261-8 |

---

## 4. Reference range library

### Strategy

The parser collects reference ranges in two ways:

1. **Lab-reported ranges** (preferred): parsed from the same line or row as the assay result. Provenance = `"lab_report"`. These are used as-is; the flag (`low` / `normal` / `high`) is computed against them.

2. **Library fallback**: when no range is found in the PDF (e.g. the lab prints only the result, or the range is on a separate summary page that wasn't extracted), the parser looks up a reference range from a bundled library keyed by `{loincCode, sex, ageGroup, unit}`. Provenance = `"library"`. The library is a static JSON file shipped with the parser.

3. **Computed ranges**: for ratios (e.g. TSat = iron / TIBC × 100) that the lab may not print directly, the parser can compute the value and derives a range from the library. Provenance = `"computed"`.

### Library provenance display

Every `AssayResult` carries `refSource`. The UI MUST display this distinctly:

- `"lab_report"` → show range as-is, no qualifier.
- `"library"` → show range with a ⓘ tooltip: "Reference range from internal library — your lab may use different thresholds."
- `"computed"` → show with a ⊕ icon: "Computed from measured components."

### Unit normalisation

Ranges are stored in SI units in the library. The parser normalises:
- `μg/dL → μmol/L` for serum iron (÷ 5.585)
- `ng/mL → nmol/L` for 25-OH D (× 2.496)
- `ng/dL → nmol/L` for testosterone (× 0.0347)
- `pmol/L → pg/mL` for E2 (÷ 3.671)
- `mmol/mol → %` for HbA1c (via IFCC formula: % = (mmol/mol / 10.929) + 2.15)

The display layer shows the unit as it appeared in the PDF; comparison always happens in normalised units.

### Seed values for the library (male, adult, fasted)

| nameEn | refLow | refHigh | Unit (SI) | Source |
|---|---|---|---|---|
| serum iron | 10 | 30 | μmol/L | WHO / IFCC |
| TIBC | 45 | 81 | μmol/L | IFCC |
| transferrin saturation | 20 | 50 | % | AASLD / EFSA |
| ferritin (male) | 30 | 300 | μg/L | WHO |
| hemoglobin (male) | 130 | 176 | g/L | WHO |
| hematocrit (male) | 40 | 52 | % | WHO |
| TSH | 0.27 | 4.2 | mIU/L | ATA |
| 25-OH vitamin D (sufficiency) | 75 | 250 | nmol/L | Endocrine Society |
| hs-CRP (optimal) | 0 | 1.0 | mg/L | ACC/AHA |
| HbA1c (non-diabetic) | 0 | 42 | mmol/mol | NICE |
| fasting glucose | 3.9 | 5.5 | mmol/L | WHO |

Sex and age group are required parameters for the library lookup (testosterone, estradiol, ferritin differ significantly). The viewer should carry the patient's biological sex from the Meicepro API's `customer.sex` field.

---

## 5. Storage — PII rules and recommendation

### Options

**Option A — localStorage only (client-side, per-device)**
- Parsed `LabReport[]` serialised to JSON, stored under a namespaced key (e.g. `meicepro:labReports:v1`).
- Never leaves the device; no server-side persistence.
- Survives browser sessions (until user clears site data).
- **Pro**: zero data-egress risk; no backend changes.
- **Con**: not synced across devices; lost on browser wipe; cannot be in the private repo.

**Option B — patient repo markdown files (current approach)**
- Manually maintained `.md` files in `patient/blood-tests/YYYY-MM-DD.md` with structured frontmatter.
- **Pro**: version-controlled; diff-auditable; repo is private; clinician can annotate.
- **Con**: requires manual transcription; no automation; viewer has to parse the markdown — circular problem.

**Option C — viewer imports from patient repo markdown (hybrid)**
- User drags a `.md` file (or the viewer reads from a local path they point to) and the viewer parses the frontmatter into `LabReport` on load.
- **Pro**: single source of truth remains the private repo; viewer is read-only.
- **Con**: markdown parser required in the viewer; user must keep markdown files updated.

### Recommendation: Option A (localStorage) for the viewer, Option B for the source of truth.

The viewer's BloodworkScreen is a client-only consumer. It should:
1. Accept a PDF upload (or a drag of the already-parsed markdown file as an optional quick-import path).
2. Parse → produce `LabReport` → store in `localStorage`.
3. On first load, if `localStorage` is empty, prompt the user to upload.

The `patient/blood-tests/*.md` files remain the canonical record in the private skincare repo. The viewer's localStorage is a derived cache, not a primary record.

**PII handling for the LLM-extract path**: before sending PDF text to the Claude API, the parser applies a scrubber that:
- Removes lines matching surname / name patterns (Greek: `Επώνυμο.*:`, `Όνομα.*:`; English: `Patient:`, `Surname:`, `Forename:`).
- Removes DOB lines (`Ημερομηνία γέννησης.*:`, `D.O.B.*:`).
- Removes national ID / AMKA patterns (`ΑΜΚΑ:?\s*\d{11}`, `NHS:?\s*[\d\s]+`).
- Removes accession / order numbers (`Αρ.Εντολής.*:`, `PID.*:`).
- Retains: collection date, lab name, assay rows, reference ranges, section headers.

The scrubber runs locally before any network call. The `LabReport` object stored in localStorage contains only the assay data and the collection date — no patient name, no DOB, no national ID.

---

## 6. Integration with BloodworkScreen and Plan generator

### BloodworkScreen UX

```
┌─────────────────────────────────────────────────────┐
│ Bloodwork · systemic correlate                      │
├─────────────────────────────────────────────────────┤
│  [Upload lab PDF]   or   [Add manual entry]         │
│                                                     │
│  ● Iron panel          TSat  72%  ● HIGH            │
│    Serum iron          39.5 μmol/L  HIGH            │
│    TIBC                55 μmol/L    Normal          │
│    Ferritin            115 μg/L     Normal          │
│                                                     │
│  ● Vitamin D           17.1 ng/mL   ● DEFICIENT     │
│  ● hs-CRP              0.18 mg/L    ● OPTIMAL       │
│  ● TSH                 1.7 mIU/L    ● NORMAL        │
│                                                     │
│  Trend: TSat over time  [sparkline]                 │
│    72% → 63% → 54% → 48%  (4 reports)              │
│                                                     │
│  ⚠ labs-first flag active for periorbital zone      │
│    "Elevated TSat — correlate before Nd:YAG"       │
│    TSat must be <50% and stable for 2 readings      │
│    before the readiness flag resolves to proceed.  │
└─────────────────────────────────────────────────────┘
```

### When `labs-first` resolves to `proceed`

The Plan generator holds a `labs-first` readiness until all of:
1. The relevant assay is present in `LabReport[]` (at least one report, collection date ≤ 6 months ago).
2. The assay flag is `"normal"` (or `"low"` where that is clinically acceptable, per the gate's rule).
3. If the prior reading was `"high"`, at least **two consecutive** `"normal"` readings are required (to exclude transient correction).

For the iron / hemosiderin gate specifically:
- TSat must be ≤ 50% on two consecutive fasted readings.
- Ferritin must not be simultaneously rising (would indicate continued loading).
- When both conditions met → readiness = `proceed`.

### Trend display

The iron sparkline already exists in `RoiScreen` (currently faked with hardcoded data). The BloodworkScreen can render a proper multi-assay sparkline component consuming real `LabReport[]` data. The RoiScreen's periorbital iron index sparkline should eventually be overlaid with the TSat trend on the same timeline — showing correlation between the multispectral heuristic and the bloodwork gate is the main clinical value proposition of the whole feature.

The trend data shape:
```typescript
interface LabTrendPoint {
  date: string;          // ISO date
  value: number;
  flag: AssayResult["flag"];
}

type LabTrendSeries = {
  [loincCode: string]: LabTrendPoint[];
};
```

### Which labs surface in the UI

The Plan generator (not the parser) decides which assays are "worth showing" — only those that are:
- In the 22-assay mandatory catalogue, AND
- Either flagged `"high"` / `"low"`, OR
- Relevant to an active verdict (e.g. iron panel always shows if any zone has `hemosiderin` verdict).

All other assays are parsed and stored but not foregrounded. The user can expand a "Show all parsed assays" accordion.

---

## 7. Implementation phasing

### v1 — minimum viable (next PR after Phase 2 of substrate)

**Parser**: LLM-extract path only, English-layout PDFs first (Thriva / Medichecks / OneWelbeck). Scrubber + Claude API call + JSON schema response. Produce `LabReport` and store in localStorage.

**Assays covered in v1**: iron panel (6) + vitamin D + hs-CRP + TSH. That is 9 of 22 — sufficient for the most common `labs-first` gate (iron overload) and the most common advisory (vitamin D).

**UI**: BloodworkScreen replaces `ComingSoonScreen`. Upload button. Displays parsed iron panel and vitamin D. Shows `labs-first` status badge. No trend (single report).

**Storage**: localStorage only. No import of existing markdown files.

### v2

**Parser additions**:
- Greek-layout heuristic fallback for Bioiatriki (Layout A). This unlocks the multi-year historical corpus.
- Expand assay coverage to all 22.
- Manual-entry form for assays the parser misses.
- "Scanned PDF" detection → graceful fallback message.

**UI additions**:
- Multi-report trend sparklines, overlaid with the periorbital iron index from RoiScreen data.
- `proceed` gate resolution logic with "2 consecutive normal" rule.
- Quick-import from existing `patient/blood-tests/*.md` markdown (drag file → parse frontmatter tables).

### v3

**Parser additions**:
- OCR path for scanned PDFs (Tesseract `ell` + `eng` models, or a cloud OCR option the user opts into).
- Confidence calibration: compare LLM-extracted values against heuristic-extracted values; surface discrepancies.

**UI additions**:
- Export parsed data back to a markdown report for the private patient repo.
- Side-by-side "bloodwork timeline × scan timeline" view.
- Alert system: "Your last iron panel was 8 months ago — consider re-testing before scheduling the Nd:YAG."

---

## 8. Open questions — decisions needed before implementation

1. **API key ownership model**: the LLM-extract path requires an Anthropic API key. Does the viewer prompt the user to supply their own key (stored in localStorage, never in the repo), or does the analyzer serve as a backend proxy? The current viewer is a fully static Next.js export — adding a proxy requires a serverless function or a change to the deployment model.

2. **Fasted vs non-fasted flag**: TSat is meaningfully different on fasted vs non-fasted samples (non-fasted can read ~10 percentage points higher). The `labs-first` gate rule should only count fasted TSat as valid. Does the upload flow ask the user to confirm whether the sample was fasted, or does the parser try to infer this from the report text?

3. **Sex and age context for reference ranges**: the library needs `{sex, ageGroup}` to select the right range (ferritin male ≠ female; estradiol male is a completely different range). The Meicepro API has `customer.sex`. Is it acceptable to pull that from the loaded report JSON, or does the user confirm it explicitly in the BloodworkScreen? What if the scan patient and the bloodwork uploader differ?

4. **Minimum re-test interval for the `proceed` gate**: the design proposes "2 consecutive normal readings." What is the minimum time between readings to count as "consecutive" for clinical purposes? (Suggested: ≥ 4 weeks apart.) This is a clinical judgment call.

5. **Which labs the Plan generator surfaces to the clinician vs hides**: not every abnormal result changes a treatment recommendation. Scope creep risk — should the BloodworkScreen only show results the Plan generator uses (iron, vitamin D, hs-CRP, TSH), or should it be a full lab viewer? Showing everything risks turning the viewer into a general health app, which is outside the device's clinical framing.

6. **Scanned PDF handling in v1**: the design defers OCR to v3 and shows a "manual entry required" prompt. Is that acceptable to the user for the ~30% of the PDF corpus that is scanned, or does it block meaningful v1 use?

7. **Markdown quick-import scope**: the existing `patient/blood-tests/*.md` files already have structured tables. A markdown parser could import them directly. However, parsing markdown tables from an arbitrary file is fragile. Should v2 define a strict frontmatter schema (e.g. JSON-in-YAML) that the parser can rely on, or is the current ad-hoc table format acceptable?

8. **Multi-patient use**: the current viewer is single-patient (one loaded report JSON). If a clinician loads multiple patients' reports in different tabs, localStorage is shared. Should lab data be namespaced by the Meicepro report ID, or by a user-provided label?

9. **Trend sparkline data source**: the RoiScreen's periorbital iron index trend is currently faked. When real bloodwork data is available, should the iron index values come from the actual scans (requiring real longitudinal Meicepro data) or remain illustrative until multiple scan reports are loaded?

10. **Disclaimer language**: the analyzer's disclaimer explicitly states "not a medical device" and "no diagnoses produced." A `labs-first → proceed` gate looks, from the outside, like a medical clearance. The UI copy must be precise: "This flag is a reminder to correlate with a clinician, not a clinical clearance." Confirm the exact wording with the user before launch.

---

## Appendix — PDF extraction commands (for development / testing)

```bash
# Extract text from a digital PDF (preserves Greek Unicode correctly):
pdftotext -layout "path/to/report.pdf" output.txt

# Check if a PDF is scanned (text layer absent):
pdftotext "path/to/report.pdf" - | wc -c
# < 100 bytes → likely scanned; use OCR path

# Greek-aware extraction with pdfjs-dist (browser context):
# Ensure pdfjsLib.GlobalWorkerOptions.workerSrc is set;
# use getTextContent() with includeMarkedContent: false;
# join items by x-position proximity to reconstruct rows.
```

Layout-specific notes for the heuristic fallback:

- **Bioiatriki (Layout A, modern)**: assay name is followed by `(ABBREV)` in parentheses, then spaces, `:`, then the result. The reference range appears after more whitespace. Match pattern: `^([^\n:]+?)\s*(?:\([A-Zα-ωΑ-Ω/-]+\))?\s*:\s*([\d.,<>]+)\s*([\S]+)\s+([\d.,<>]+)\s*-\s*([\d.,<>]+)`.
- **Bioiatriki (Layout A, pre-2019)**: result and reference range on the same line with the unit between them. Abbreviation in parentheses after the assay name.
- **Thriva/Medichecks (Layout B)**: strict 5-column table. After stripping the doctor narrative (everything before the first `\n\n[A-Z][a-z]+ Profile`), rows match: `^([A-Za-z ()/%,-]+)\s{2,}([\d.,<>X]+)\s{2,}(\S+)\s{2,}([\d.]+\s*[–-]\s*[\d.]+)\s{2,}(OPTIMAL|NORMAL|ABNORMAL|HIGH|LOW)`.
- **Medichecks hormones**: reference ranges span multiple lines (one row per sex/phase), which defeats the single-line pattern. Extract value and unit only; look up range from library.

---

## See also

- `01-dynamic-plan-substrate.md` — substrate verdict engine and `labs-first` readiness flag design
- `02-fitzpatrick-history-flags.md` — patient-context flags; history intake form
- `viewer/components/screens/BloodworkScreen.tsx` — current placeholder
- `viewer/components/screens/RoiScreen.tsx` — iron index sparkline (currently faked; real data from this parser would replace the hardcoded array)
- `viewer/lib/clinical/types.ts` — substrate types; `LabReport` would live alongside these
