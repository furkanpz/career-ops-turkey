# Codex Setup

Career-Ops supports Codex through the root `AGENTS.md` file.

If your Codex client reads project instructions automatically, `AGENTS.md`
is enough for routing and behavior. Codex should reuse the same checked-in
mode files, templates, tracker flow, and scripts that already power the
Claude workflow.

## Prerequisites

- A Codex client that can work with project `AGENTS.md`
- Node.js 18+
- Playwright Chromium installed for PDF generation and reliable job verification
- Go 1.21+ if you want the TUI dashboard

## Install

```bash
npm install
npx playwright install chromium
```

## Recommended Starting Prompts

- `Evaluate this job URL with Career-Ops and run the full pipeline.`
- `Scan my configured portals for new roles that match my profile.`
- `Generate the tailored ATS PDF for this role using Career-Ops.`

## Routing Map

1. Read `config/profile.yml` if it exists.
2. If `language.modes_dir` points to an existing localized directory, use it as the override layer.
3. Always read the root canonical mode file first, then the localized override if present.
4. Turkish aliases are supported without replacing canonical commands:
   - `teklif` → canonical `oferta`
   - `basvur` → canonical `apply`

| User intent | Root files | Turkish override when `language.modes_dir: modes/tr` |
|-------------|------------|------------------------------------------------------|
| Raw JD text or job URL | `modes/_shared.md` + `modes/auto-pipeline.md` | `modes/tr/_shared.md` + `modes/tr/auto-pipeline.md` |
| Single evaluation only | `modes/_shared.md` + `modes/oferta.md` | `modes/tr/_shared.md` + `modes/tr/teklif.md` |
| Multiple offers | `modes/_shared.md` + `modes/ofertas.md` | `modes/tr/_shared.md` + `modes/tr/ofertas.md` |
| Portal scan | `modes/_shared.md` + `modes/scan.md` | `modes/tr/_shared.md` + `modes/tr/scan.md` |
| PDF generation | `modes/_shared.md` + `modes/pdf.md` | `modes/tr/_shared.md` + `modes/tr/pdf.md` |
| Outreach / contact | `modes/_shared.md` + `modes/contacto.md` | `modes/tr/_shared.md` + `modes/tr/contacto.md` |
| Live application help | `modes/_shared.md` + `modes/apply.md` | `modes/tr/_shared.md` + `modes/tr/basvur.md` |
| Pipeline inbox processing | `modes/_shared.md` + `modes/pipeline.md` | `modes/tr/_shared.md` + `modes/tr/pipeline.md` |
| Batch processing | `modes/_shared.md` + `modes/batch.md` | `modes/tr/_shared.md` + `modes/tr/batch.md` |
| Tracker status | `modes/tracker.md` | `modes/tr/tracker.md` |
| Deep company research | `modes/deep.md` | `modes/tr/deep.md` |
| Interview research | `modes/interview-prep.md` | `modes/tr/interview-prep.md` |
| Training / certification review | `modes/training.md` | `modes/tr/training.md` |
| Project evaluation | `modes/project.md` | `modes/tr/project.md` |
| Rejection pattern analysis | `modes/patterns.md` | `modes/tr/patterns.md` |
| Follow-up cadence | `modes/followup.md` | `modes/tr/followup.md` |

The key point: Codex support is additive. It should route into the existing
Career-Ops modes and scripts rather than introducing a parallel automation
layer.

Scanner note: `scan` mode is now script-first. Both `/career-ops scan` and `npm run scan` should execute `node scan.mjs` rather than re-implementing portal logic inside the agent prompt.

## Behavioral Rules

- Treat raw JD text or a job URL as the full auto-pipeline path unless the user explicitly asks for evaluation only.
- Keep all personalization in `config/profile.yml`, `modes/_profile.md`, `article-digest.md`, or `portals.yml`.
- Keep parser-safe report keys canonical and English: `Archetype`, `TL;DR`, `Remote`, `Comp`, `Date`, `Score`, `URL`, `PDF`, `Batch ID`.
- Never verify a job’s live status with generic web fetch when Playwright is available.
- Keep `portals.yml` in the user layer. If it is missing the latest Turkey parser keys, warn and point to `templates/portals.tr.example.yml`; do not auto-overwrite it during scans or updates.
- Never submit an application for the user.
- Never add new tracker rows directly to `data/applications.md`; use the TSV addition flow and `merge-tracker.mjs`.

## Verification

```bash
npm run verify

# optional dashboard build
cd dashboard && go build ./...
```
