# Playbook — how to use the meicepro-analyzer

Operational guide. Companion to [`README.md`](README.md) (the *what's-here* navigator) — this is the *what-to-do-when* repertoire.

Organised by scenario. Find the closest match and follow the steps.

---

## Setting up a private personal overlay (recommended pattern)

If you have your own Meicepro report, the recommended pattern is:

- **This repo** stays public, generic, and shareable — methodology + viewer + reverse-engineering.
- **Your personal data** lives in a *separate private repo* on your own GitHub account.
- That private repo includes this one as a **git submodule**, so you get all the reference material without ever risking your PII landing in a public repo.

### Bootstrap

```sh
# Create your private overlay repo locally
mkdir my-skincare && cd my-skincare
git init

# Add this analyzer as a submodule
git submodule add https://github.com/terra-alex/meicepro-analyzer meicepro

# Copy the patient template into the root of your repo
cp -R meicepro/template/patient ./patient

# Customize the patient/ files with your own information
# (see meicepro/PLAYBOOK.md for workflows on adding scans, blood tests, etc.)

# Create your private GitHub repo and push
gh repo create my-skincare --private --source=. --remote=origin --push
```

Your `patient/` directory and your git history stay private. The submodule pulls in `meicepro/reference/`, `meicepro/meicepro-raw/`, `meicepro/viewer/` etc. at a specific pinned version of *this* repo.

To update the submodule to the latest analyzer version later:
```sh
cd meicepro && git pull origin main && cd ..
git add meicepro && git commit -m "Bump analyzer to latest"
```

---

## Workflows

### Workflow 1: "I got a new Meicepro scan"

1. **Get the diagnosis ID** from the email / viewer URL.
2. **Create the scan folder** in your private overlay:
   ```sh
   SHORT_ID=$(echo $DIAGNOSIS_ID | cut -c1-8)
   MONTH=$(date +%Y-%m)
   mkdir -p patient/scans/${MONTH}-meicepro-${SHORT_ID}/images/{center,left,right}
   ```
3. **Download the diagnosis JSON**:
   ```sh
   cd patient/scans/${MONTH}-meicepro-${SHORT_ID}/
   curl -s "https://eu-meicepro-api.meiquc.cn/meicepro-api/open/diagnosis/get/${DIAGNOSIS_ID}/en" \
     | python3 -m json.tool > diagnosis-get-en.pretty.json
   curl -s "https://eu-meicepro-api.meiquc.cn/meicepro-api/open/diagnosis/query/${DIAGNOSIS_ID}/1/10" \
     | python3 -m json.tool > diagnosis-query.pretty.json
   ```
4. **Extract image URLs** from the JSON and download per direction (script template in [`reference/meicepro-api.md`](reference/meicepro-api.md) § 4).
5. **Write the scan README** following the template in `template/patient/scans/README.md`.
6. **Compare to prior scan** using the viewer:
   ```sh
   cd meicepro/viewer/
   pnpm dev
   # then http://localhost:3000/?id=<new>&compareId=<old>
   ```
7. **Update findings** with what changed. Don't overwrite existing analyses — append a new dated section.
8. **Log re-scan in monitoring** if you track quantitative anchors.
9. **Commit** in your *private* repo with `Add Meicepro scan {date}-{shortId}`.

### Workflow 2: "I got new blood test results"

1. **Save the source PDF** somewhere durable (e.g. Google Drive, encrypted).
2. **Create the markdown file**:
   ```sh
   touch patient/blood-tests/$(date +%Y-%m-%d).md
   ```
3. **Use prior panels as templates** — copy the YAML frontmatter and table layout.
4. **Required frontmatter fields**: `date`, `lab`, `panel`, `source_pdf` (absolute path on your machine).
5. **Tabulate the values** under headed sections (CBC, Biochem, Hormones, etc.).
6. **Interpret in context** in a final section — what this panel tells us, cross-referencing prior panels.
7. **Update the bloodwork findings document** if the new panel materially changes a finding. Append, don't rewrite.

### Workflow 3: "I had a procedure done"

1. **Create an outcome file**:
   ```sh
   touch patient/outcomes/$(date +%Y-%m-%d)-{procedure}-session-{N}.md
   ```
2. Capture: procedure, device, operator, clinic, settings (fluence/pulse/spot/passes/zones), pre-photos (link to Meicepro re-scan if one was done), day-0 reaction, subjective tolerance.
3. Add **day-3, day-7, day-30 follow-up** entries to the same file.
4. **Re-scan with Meicepro** at day-30 / day-90 and link from the outcome file.

### Workflow 4: "I'm preparing for a clinic visit"

1. **Read** the patient synopsis (refresher) + any prior consult-prep doc.
2. **Create a new prep doc** in `patient/correspondence/` if one doesn't exist for this visit.
3. **Bring**:
   - The synopsis (printable or screen)
   - Most recent scan side-by-side in the viewer (compare mode)
   - Most recent labs summary
   - Specific points to raise (from the correspondence prep doc)
4. **After the visit**, append "Outcome" section to the prep doc and update the treatment plan if it changed.

### Workflow 5: "I want to compare scans visually"

```sh
cd meicepro/viewer
pnpm dev
```

Then `http://localhost:3000/?id=<diagnosisId>`. Open the **Compare** panel, paste the second diagnosis ID, click "Load B". Use mouse-wheel zoom and drag-to-pan; both scans use synchronised view state. Toggle layers in the layer selector to compare specific channels. URL state persists — bookmarkable.

### Workflow 6: "I want to share this with a clinician"

Don't share the whole private repo. Curate:

| Audience | Share |
|---|---|
| Dermatologist (substrate question) | Your synopsis + multispectral analysis + IPL suitability finding + relevant images |
| GP (iron/HFE workup) | Your bloodwork findings + relevant blood panel + source lab PDF |
| Aesthetic clinic (PN/PRP injector) | Your PRP/PN evaluation + fat-herniation finding |
| New treating clinician (full handover) | Print the synopsis plus links — they can drill down as needed |

Quick assembly to PDF:
```sh
pandoc patient/synopsis.md \
       patient/findings/multispectral-analysis.md \
       patient/findings/ipl-suitability.md \
  -o /tmp/derm-handover.pdf --pdf-engine=xelatex
```

### Workflow 7: "I want to extend the structure"

| Adding... | Goes in (your private overlay)... |
|---|---|
| New scan | `patient/scans/{YYYY-MM}-meicepro-{shortId}/` |
| New blood panel | `patient/blood-tests/{YYYY-MM-DD}.md` |
| New finding from existing data | New MD file in `patient/findings/` |
| New treatment evaluation | New `patient/treatment/{topic}-suitability.md` |
| Clinic visit prep / notes | `patient/correspondence/{YYYY-MM-DD}-{topic}.md` |
| Procedure outcome | `patient/outcomes/{YYYY-MM-DD}-{procedure}-session-{N}.md` |
| Generic Meicepro knowledge | This (public) repo's `reference/` — open a PR |

**Don't**:
- Move `meicepro/` (it's a submodule — let `git submodule update` handle it)
- Put patient-specific data in this public repo's `reference/` or `meicepro-raw/`
- Rewrite historical findings in place. Append dated revision sections.

---

## Maintenance

| Cadence | Task |
|---|---|
| Per scan / blood panel / procedure | Run the corresponding workflow |
| Quarterly | Refresh status table in your synopsis |
| When this analyzer updates | `cd meicepro && git pull origin main && cd .. && git add meicepro && git commit -m "Bump analyzer"` |

### Keeping the synopsis fresh
Your `patient/synopsis.md` is the canonical narrative. It links *outward* — detail files don't link back. When something changes that affects the headline narrative, update the synopsis section that mentions it.

### Don't delete; append
Append-mostly log. When a finding turns out to be wrong, add a dated "Revision" section. Trail is useful.

---

## Tools and commands reference

### Most-used commands

```sh
# Start viewer
cd meicepro/viewer && pnpm dev

# Fetch a new diagnosis JSON
curl -s "https://eu-meicepro-api.meiquc.cn/meicepro-api/open/diagnosis/get/$ID/en" \
  | python3 -m json.tool > /tmp/diagnosis.json

# Find a string across all markdown
grep -rn "transferrin" --include="*.md" patient/

# Find broken cross-references
grep -rEn '\]\([^)]*\)' --include="*.md" patient/ | grep -v "http" | \
  awk -F'[()]' '{print $2}' | sort -u
```

### Useful one-liners

```sh
# Extract all scores from a diagnosis JSON
python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
for face in d['datas']['diagnosis']['diagnosisSkinList']:
    print(f\"dir={face['direction']}: skinScore={face.get('skinScore'):.3f}\")
" patient/scans/<scan>/diagnosis-get-en.pretty.json

# List all image URLs in a diagnosis JSON
python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
for face in d['datas']['diagnosis']['diagnosisSkinList']:
    for k, v in face.items():
        if isinstance(v, str) and v.startswith('https://') and 'oss' in v:
            print(f\"dir={face['direction']:>2} {k}: {v}\")
" patient/scans/<scan>/diagnosis-get-en.pretty.json | head -30
```

---

## Conventions cheat sheet

### Filenames
- **Time-ordered**: `YYYY-MM-DD-{topic}.md` (blood tests use just `YYYY-MM-DD.md`)
- **Topic / category**: kebab-case, descriptive
- **Scan folders**: `YYYY-MM-meicepro-{shortId}/`

### Frontmatter (YAML)
```yaml
---
type: blood-panel | finding | treatment | treatment-evaluation | treatment-rationale | scan | profile | medical-history | correspondence | synopsis
date: YYYY-MM-DD
lab: {clinic name}                # blood panels only
source_pdf: {absolute path}       # blood panels only
status: drafted | active | superseded | resolved | complete
last_updated: YYYY-MM-DD
---
```

### Findings vs treatment boundary
- **Finding** = "what is true about the patient" (descriptive). Lives in `patient/findings/`.
- **Treatment** = "what we propose to do" (action-oriented). Lives in `patient/treatment/`.
- Cross-cutting reasoning (e.g. "labs → defer laser") is split: `findings/{topic}-findings.md` + `treatment/{topic}-rationale.md`.

### Cross-references
- Relative paths: `[link](../path/to/file.md)`
- End detail files with `## See also`
- Don't link from synopsis *back* to detail files — outward only
