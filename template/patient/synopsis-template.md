---
type: synopsis
status: living document
last_updated: YYYY-MM-DD
---

# Synopsis — {patient short description}

The narrative spine of your overlay. Read this first; it should link out to everything else in `patient/`.

**Patient:** {Name}, {sex}, {age}, Fitzpatrick {type}
**History summary:** {brief}
**Primary question:** {the thing you're trying to answer}
**Most recent scan:** {diagnosis ID + date}

---

## Three-layer analysis

### Layer 1 — Initial clinical exam
{What a clinician saw on visual-only exam; what they recommended.}

→ See `findings/prior-recommendations.md`.

### Layer 2 — Meicepro multispectral analysis
{Per-region substrate read using all channels.}

| Region | Substrate | Confidence |
|---|---|---|
| ... | ... | ... |

→ See `findings/multispectral-analysis.md`.

### Layer 3 — Bloodwork
{What's ruled out (reassuring); what's introduced that changes the plan.}

→ See `findings/bloodwork-findings.md` and `treatment/bloodwork-rationale.md`.

---

## Consolidated treatment plan (in phases)

| Phase | Duration | What happens |
|---|---|---|
| A — Systemic prep | ... | ... |
| B — Procedures | ... | ... |
| C — Monitoring | ... | ... |

→ See `treatment/plan.md`.

---

## What to take to the next clinical consult

{Three or so concrete points; full verbatim version in correspondence/.}

---

## Open items / pending decisions

| Item | Owner | Blocker |
|---|---|---|
| ... | ... | ... |
