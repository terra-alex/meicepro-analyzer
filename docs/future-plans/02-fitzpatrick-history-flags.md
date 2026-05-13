# Future plan — Fitzpatrick + history-flags intake

Status: design draft. Implementation deferred to Phase 2 of the dynamic-plan rollout (see `01-dynamic-plan-substrate.md`).

## Is Fitzpatrick available from the Meicepro API?

**Yes — two paths, both already in the public open-API response.** This contradicts an earlier assumption that we'd need a separate intake form for skin type.

Fields present in the sample diagnosis response (`sample-report.json` shape, verified 2026-05-12):

| Path | Value in sample | Source | Notes |
|------|-----------------|--------|-------|
| `customer.skinType` | `2` | Questionnaire (self-reported / clinician-entered at scan time) | 1..6 Fitzpatrick-ish scale. Self-report has known poor correlation with objective ITA, especially in S/E Asian populations. |
| `diagnosis.customerQueryResponse.skinType` | `2` | Mirror of the above on the diagnosis record | Use as a fallback when the customer object is not joined. |
| `diagnosisSkinList[].skinType` | `null / 3 / null` (L / F / R) | Device-derived per-face algorithm | **Front capture only.** Present when the algorithm could compute it. More objective than the questionnaire. |
| `customer.itaStandard` | `null` | ITA classification | Field exists but is unpopulated in the open API. Likely requires `diagnosisITA/queryAll` (authenticated). |
| `diagnosis.diagnosisITA` / `diagnosisITAId` | `null` / `null` | Foreign keys to ITA table | Not in open API. |

**Recommendation:** Use `diagnosisSkinList[front].skinType` as the primary Fitzpatrick signal when present; fall back to `customer.skinType`; if both null, prompt the clinician. Never silently default to "III" — that's a known source of IPL over-fluence.

A small banner in the report header should display "Fitzpatrick: III (front-face algorithm)" or "Fitzpatrick: II (self-reported)" so the clinician knows the provenance.

## History flags the viewer should collect

These are not in the Meicepro API and would need a viewer-side intake form. The clinical reviewer (laser-derm pass) identified two tiers:

### Tier A — changes verdict interpretation (must collect before scan analysis)

| Flag | Why | Default for sample mode |
|------|-----|-------------------------|
| Valsalva history (recurrent vomiting, severe coughing, heavy lifting, eating-disorder hx) | Raises hemosiderin prior in periorbital zone | unchecked |
| Current pregnancy | Raises melasma prior; modifies hormonal recommendations | unchecked |
| Hormonal contraception (OCP, levonorgestrel IUD) | Same as pregnancy for melasma | unchecked |
| Known HFE mutation / serum ferritin elevation | Promotes periorbital "possible hemosiderin" → "likely hemosiderin" | unchecked |
| Recent sun exposure (last 2 weeks) | Transient melanin inflation; recommends 4-week wash-out before baseline | unchecked |
| Chief complaint free-text (`diagnosisCc`) | Already in API; surface in UI and scan for keywords (`petechiae`, `bruise`, `vomit`) to boost hemosiderin posterior | use API value |

### Tier B — gates recommendations, not verdicts (collect before Plan screen)

| Flag | Effect |
|------|--------|
| Fitzpatrick III+ (auto-detected from API) | Constrains IPL fluence; adds mandatory test patch |
| Fitzpatrick V–VI | Contraindicates IPL regardless of substrate |
| Active isotretinoin | Contraindicates ablative + most non-ablative laser |
| Keloid history | Gates any skin-breaking procedure |
| Procedure in last 6 weeks | Defers all energy recommendations |
| Current anticoagulants | Modifies Nd:YAG bruising risk + consent language |
| Active acne in target zone | Treat acne first; defer IPL |
| Active rosacea flare | Defer until quiescent (bloodmap is misleading) |

## UX

**Do not** demand a long form before every scan — clinicians will skip it. Two-step model:

1. **Pre-scan checklist (5–7 items)** at scan time covering the highest-stakes Tier-B items: Fitz override, current isotretinoin, recent procedure, keloid hx, plus one free-text "anything else clinically relevant." Stored against the scan in localStorage keyed by `diagnosisId`.
2. **Contextual prompts on the Substrate screen** that ONLY fire when a verdict makes them relevant. E.g., periorbital `hemosiderin` verdict → "Does this patient have a history of Valsalva activities or eating disorder?" Pregnancy / hormonal prompt only fires on diffuse-malar `melanin_*` verdicts in a female patient. The prompts modify the displayed prior-probability label, not silently change the verdict.

Storage: `localStorage["meicepro:context:" + diagnosisId] = { tier_a: {...}, tier_b: {...}, captured_at }`. Auto-clear when an export is performed (medical PII).

## Open questions

- Is there a Meicepro endpoint that returns the `itaStandard` from `/meicepro-api/diagnosisITA/queryAll`? Would require API key + research.
- Should the chief-complaint free-text trigger an LLM-based keyword extractor? Out of scope until Tier A coverage is real.
- How is the questionnaire-derived `customer.skinType` actually captured by the device? If it's the clinician's input rather than a true self-report, its reliability is higher.

## Reference

- API field audit performed 2026-05-12 against the sample diagnosis response and the API docs at `reference/meicepro-api.md`.
