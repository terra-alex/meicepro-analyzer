# AGENTS.md — guidance for AI coding agents

This is the **public meicepro-analyzer repository**. It contains reverse-engineering documentation, multispectral interpretation guides, raw artifacts (webpack bundles, language pack, face-mesh model), and a Next.js viewer app. **No patient PII may ever land in this repository.**

If you're working on a private skincare overlay that uses this repo as a submodule, see the AGENTS.md in that repo.

## Hard rules

1. **No patient data, ever.** No names, dates of birth, identifier numbers (AMKA, NHS, insurance), email addresses, phone numbers, real diagnosis UUIDs, or identifiable face images. The `.gitignore` blocks `/patient/` at repo root as a safety net, but you should not even create such content here. If you spot any PII in this repo, treat it as a security incident — open an issue and scrub it.
2. **No real OSS image URLs.** The patient-image OSS URLs include account/customer/session UUIDs that are themselves PII. If demonstrating image layouts, use `https://example.invalid/...` placeholder hostnames.
3. **Don't include a patient template that uses real data.** The `template/patient/` scaffold should be empty or use clearly synthetic placeholder values (`Demo Patient`, `00000000-0000-0000-0000-000000000000`, etc.).
4. **License is MIT.** Don't add code under incompatible licences. New top-level dependencies should be MIT, Apache-2.0, BSD, or ISC.

## Project layout

| Folder | Editability | Notes |
|---|---|---|
| `reference/` | Append-mostly | Methodology docs. Add new files freely. Edit existing only for factual corrections. |
| `meicepro-raw/` | Don't edit | Captured artifacts. Replace only with newer captures of the same source. |
| `viewer/` | Active code | Next.js 16 app — **breaking changes vs older Next.js**. See `viewer/AGENTS.md` for framework-specific rules. |
| `template/patient/` | Append-only | Add empty templates for new structural patterns. Don't put data here. |
| `PLAYBOOK.md` | Living document | Update when workflows change. |
| `README.md` | Living document | Keep the top section accurate. |

## Conventions

- **Filenames** for time-ordered content: `YYYY-MM-DD-{topic}.md`. For methodology / topic content: kebab-case.
- **Frontmatter** is optional for stable reference docs. Use it for time-stamped or status-tracking files.
- **Cross-references** use relative paths. End detail files with `## See also` linking to siblings and parents.
- **Don't delete; append.** When a finding turns out to be wrong, add a dated revision section explaining the new view. Trail is itself useful.
- **Commits**: descriptive subject lines, body explains rationale for non-obvious changes. No commit message should reference patient data.

## Viewer (Next.js 16) — important framework note

The viewer uses **Next.js 16** which has breaking changes vs the Next.js you may have been trained on. Before writing any viewer code: read the relevant guide in `viewer/node_modules/next/dist/docs/` and check `viewer/AGENTS.md` for the project's specific Next.js conventions. Don't trust your training-data memory of App Router / Server Components patterns without verifying against the local docs.

## Working with the user

- Confirm before pushing — even private. Once pushed, even rewriting history is messy.
- Use `git mv` for renames within this repo to preserve history.
- For structural changes, validate the proposal with a Plan-type subagent first (the pattern that built the original structure).

## Disclaimer to honour

This project is for educational and personal-record purposes. It is **not** a medical device. Any code, documentation, or interpretation must include or preserve the disclaimer in `README.md`. Don't strip the "not a medical device / not affiliated" language from any doc.

## See also

- [`README.md`](README.md) — top-level navigator
- [`PLAYBOOK.md`](PLAYBOOK.md) — workflows
- [`viewer/AGENTS.md`](viewer/AGENTS.md) — Next.js-specific guidance
