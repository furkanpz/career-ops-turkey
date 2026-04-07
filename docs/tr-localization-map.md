# Turkey Localization Change Map

## Scope

This document maps the repository areas that matter for a Turkey-specific version of `career-ops`.

- No application logic was changed.
- The analysis is conservative: a file is listed only if it clearly participates in Turkish-market behavior, localized output, parser stability, or release safety.
- Categories intentionally overlap. For example, one file can be both `system-layer` and `tracking/status`.

## Executive Summary

The Turkey version is not a simple prompt translation.

Three production risks are already visible in the current repo:

1. Status handling is internally inconsistent. `templates/states.yml` uses English labels, while `normalize-statuses.mjs`, `verify-pipeline.mjs`, several modes, and dashboard parsing still assume Spanish statuses such as `Evaluada` and `Aplicado`.
2. Dashboard report parsing is label-coupled. `dashboard/internal/data/career.go` looks for report headers such as `**Arquetipo:**` and `**TL;DR:**`; Turkish report headings would stop enriching the dashboard unless parsing becomes locale-safe.
3. The updater is fork-hostile. `update-system.mjs` still points to `santifer/career-ops` upstream. A Turkey fork that keeps this behavior risks pulling upstream system files that do not know about Turkish modes or Turkish market defaults.

The safest implementation path is:

- keep one stable internal canonical layer for statuses and machine-readable report keys, preferably English
- add Turkey-facing prompts/output as a dedicated locale layer, preferably `modes/tr/`
- localize display labels, search heuristics, and form handling on top of that stable internal layer

## Repository Classification

### User-layer

These are user-owned files or directories and should stay personalization-only:

- `cv.md`
- `article-digest.md`
- `config/profile.yml`
- `modes/_profile.md`
- `portals.yml`
- `data/*`
- `reports/*`
- `output/*`
- `jds/*`
- `interview-prep/story-bank.md`

### System-layer

These are system-owned files and directories that define behavior, parsing, docs, templates, and tooling:

- `CLAUDE.md`
- `modes/*`
- `modes/de/*`
- `modes/fr/*`
- `batch/*`
- `templates/*`
- `dashboard/*`
- `*.mjs`
- `fonts/*`
- `docs/*`
- `examples/*`
- `README.md`
- `DATA_CONTRACT.md`
- `VERSION`
- `package.json`
- `CONTRIBUTING.md`
- `LEGAL_DISCLAIMER.md`

### Scanning

- `modes/scan.md`
- `templates/portals.example.yml`
- `check-liveness.mjs`
- `modes/pipeline.md`
- `modes/auto-pipeline.md`
- `batch/batch-runner.sh`
- `batch/batch-prompt.md`

### Evaluation

- `CLAUDE.md`
- `modes/_shared.md`
- `modes/oferta.md`
- `modes/ofertas.md`
- `modes/apply.md`
- `modes/contacto.md`
- `modes/deep.md`
- `modes/project.md`
- `modes/training.md`
- `modes/_profile.template.md`

### PDF/CV generation

- `modes/pdf.md`
- `generate-pdf.mjs`
- `templates/cv-template.html`
- `fonts/*`
- `config/profile.example.yml`
- `examples/ats-normalization-test.md`

### Tracking/status

- `templates/states.yml`
- `normalize-statuses.mjs`
- `merge-tracker.mjs`
- `dedup-tracker.mjs`
- `verify-pipeline.mjs`
- `modes/tracker.md`
- `data/applications.md`
- `batch/tracker-additions/*`

### Dashboard

- `dashboard/main.go`
- `dashboard/internal/data/career.go`
- `dashboard/internal/model/career.go`
- `dashboard/internal/ui/screens/pipeline.go`
- `dashboard/internal/ui/screens/viewer.go`
- `dashboard/internal/theme/*`

### Validation/testing

- `doctor.mjs`
- `cv-sync-check.mjs`
- `verify-pipeline.mjs`
- `test-all.mjs`
- `check-liveness.mjs`
- `examples/ats-normalization-test.md`

## Files Likely Needing Changes for a Turkey Version

### MVP-required

| File | Why it matters | MVP or later | Main risk |
|---|---|---|---|
| `CLAUDE.md` | Entry-point behavior, onboarding, mode routing, language-mode policy, and “first run” guidance all live here. Turkey support needs an explicit Turkish mode strategy and fork-safe update guidance. | MVP | If left unchanged, the agent will keep defaulting to EN/ES assumptions and the fork will behave inconsistently. |
| `config/profile.example.yml` | The example profile still assumes US defaults (`USD`, US phone/location, US timezone, US visa wording). A Turkey version needs sane defaults for Turkey-based candidates. | MVP | New users will start from the wrong compensation, timezone, and location policy. |
| `templates/portals.example.yml` | Scanner keywords and tracked companies are currently global/US/EU biased. Turkey support needs Turkey-relevant title filters, portal strategy, and tracked employers. | MVP | Scanner recall will be low and false positives will be high in the Turkish market. |
| `modes/_shared.md` | Global scoring and writing rules live here. Turkey localization needs a decision on internal canonical terms, Turkish-market compensation framing, and local work-authorization assumptions. | MVP | Localizing only leaf modes while keeping shared rules untouched creates contradictory outputs. |
| `modes/oferta.md` | Single-offer evaluation defines report structure, tracker write-back vocabulary, and compensation analysis wording. | MVP | Turkish reports may not match downstream parsers and the advice may stay market-inaccurate. |
| `modes/pdf.md` | CV output language, paper-format heuristics, section naming, and JD-to-CV phrasing are controlled here. | MVP | The system can generate a Turkish-facing flow with English/Spanish section logic or the wrong formatting assumptions. |
| `modes/apply.md` | Application-form prompts must handle Turkey-specific questions such as work authorization, relocation, compensation format, and potentially local candidate declarations. | MVP | Form answers will miss common Turkey-market fields and create low-trust or incomplete applications. |
| `modes/scan.md` | Scan workflow describes how discovery, dedup, liveness, and portal extraction should work. It must be aligned with Turkey-targeted portals and Turkish expiry signals. | MVP | The scanner will keep using the wrong market model even if `portals.yml` is localized. |
| `modes/auto-pipeline.md` | This is the default orchestration path. It delegates to evaluation, PDF, and application-answer generation. | MVP | Mixed-language and mixed-market behavior will leak into the default user path. |
| `modes/contacto.md` | Outreach currently supports EN by default and ES for Spanish companies. Turkey needs a Turkish branch and Turkey-appropriate recruiter messaging. | MVP | Candidate-facing outreach will stay in the wrong language and tone. |
| `modes/tracker.md` | Tracker instructions define human-facing status transitions and operational vocabulary. | MVP | Human and machine status conventions will diverge further. |
| `batch/batch-prompt.md` | Batch workers generate reports, PDFs, and tracker lines without other context. Turkish support must exist here or batch mode will stay non-localized. | MVP | Batch output will not match single-offer behavior, causing parser and workflow drift. |
| `templates/states.yml` | Canonical state design has to be settled before Turkish aliases or Turkish UI labels are added. This is the status contract between scripts and dashboard. | MVP | Adding Turkish labels on top of the current EN/ES split will make state handling brittle and error-prone. |
| `normalize-statuses.mjs` | Status cleanup currently knows Spanish and some English aliases, not Turkish ones. | MVP | Turkish tracker rows will remain non-canonical and break verification/dashboard views. |
| `merge-tracker.mjs` | Merge logic validates and coerces statuses during TSV ingestion. | MVP | Batch or auto-pipeline tracker writes can silently collapse to the wrong status. |
| `verify-pipeline.mjs` | Verification still checks Spanish-centric canonical statuses. | MVP | The validation tool will flag correct Turkish-localized data as broken, or miss real issues. |
| `check-liveness.mjs` | Expired/apply signal detection already knows EN/DE/FR patterns, but not Turkish ones. | MVP | Turkish ATS pages can be misclassified as expired or uncertain, reducing scan quality. |
| `dashboard/internal/data/career.go` | Dashboard parsing normalizes statuses and extracts report metadata using Spanish/English markers. | MVP | Turkish reports and statuses will stop enriching previews and can break filtering/grouping quality. |
| `dashboard/internal/ui/screens/pipeline.go` | Dashboard tabs, status options, preview labels, and user-facing text are currently English plus a few Spanish report labels. | MVP | The TUI becomes a mixed-language surface even if the rest of the system is localized. |
| `update-system.mjs` | The updater still targets upstream `santifer/career-ops` and does not know about a Turkish mode namespace. | MVP | A production Turkey fork can re-import upstream behavior that ignores or overwrites the localized system surface. |
| `test-all.mjs` | The test suite hardcodes expected system files, status assumptions, and structure. | MVP | The repo can pass tests while Turkey support is partially broken, or fail for the wrong reasons after localization. |

### Later or conditional

| File | Why it matters | MVP or later | Main risk |
|---|---|---|---|
| `modes/_profile.template.md` | User customization template still frames compensation, geography, and negotiation in generic EN terms. | Later | Onboarding quality is lower, but the system can still function if real user profiles are filled manually. |
| `modes/pipeline.md` | Inbox processing is mostly orchestration, but user-facing warnings and special cases may need Turkish wording. | Later | Mixed operator UX, but core logic can work if upstream canonical keys stay stable. |
| `modes/batch.md` | Batch conductor/operator documentation is Spanish. | Later | Operational UX stays inconsistent; worker behavior matters more than operator prose in MVP. |
| `modes/ofertas.md` | Multi-offer comparison criteria may need Turkey-specific compensation and location weighting. | Later | Decision quality is weaker for local-market comparisons, but core single-offer flow is not blocked. |
| `modes/deep.md` | Research prompts should eventually bias toward Turkish sources, Turkish press, and Turkish company context. | Later | Research output stays globally biased, but the primary workflow still runs. |
| `modes/project.md` | Portfolio-project evaluation is not Turkey-market critical for initial launch. | Later | Advice quality remains generic. |
| `modes/training.md` | Training/course evaluation is not part of the core Turkey-localized application flow. | Later | Guidance remains generic. |
| `generate-pdf.mjs` | The generator itself is mostly locale-agnostic. Change only if Turkish glyph rendering, ATS export, or file naming proves problematic in QA. | Later/conditional | Unnecessary changes here can create regressions in a working PDF pipeline. |
| `templates/cv-template.html` | The template already uses placeholders and `latin-ext` fonts, which likely cover Turkish glyphs. Touch only if visual QA finds layout or glyph issues. | Later/conditional | Premature template edits can introduce PDF regressions without solving a real Turkish-specific problem. |
| `README.md` | Public-facing repo description, quick start, and examples should reflect the Turkey fork before release. | Later | External confusion, but local operation is not blocked. |
| `docs/CUSTOMIZATION.md` | Needs Turkey-specific examples and guidance once the implementation is stable. | Later | Documentation drift. |
| `docs/SETUP.md` | Setup examples should use Turkey defaults once the product surface is finalized. | Later | Onboarding docs remain global/US biased. |
| `docs/ARCHITECTURE.md` | Architecture docs should be updated after the actual Turkish architecture is chosen. | Later | Documentation becomes stale but does not block implementation. |
| `doctor.mjs` | Setup hints and examples should eventually be Turkey-aware. | Later | The health check still works, but guidance remains generic. |
| `DATA_CONTRACT.md` | If `modes/tr/` is introduced, system-layer documentation should include it explicitly. | Later | Contract docs will lag behind real system shape. |

## Reference Files, Not Direct Change Targets

These files are useful as implementation references, but they do not themselves need Turkey changes:

- `modes/de/*`
- `modes/fr/*`

They already demonstrate the repo’s preferred pattern for market-specific mode forks: keep a separate locale directory instead of rewriting all defaults in place.

## Recommended Implementation Boundary

Before any code changes, lock these decisions:

1. Canonical internal statuses
   Recommendation: keep canonical machine statuses and report keys in English, localize aliases and UI labels separately.

2. Locale structure
   Recommendation: add a dedicated `modes/tr/` surface rather than overwriting the current default files in place.

3. Turkey market scope
   Decide whether “Turkey-localized” means:
   - Turkish-language roles only
   - roles in Turkey regardless of language
   - Turkey-based candidate applying globally but with Turkey-specific profile defaults

4. Compensation policy
   Decide whether comp should default to `TRY`, foreign currencies, or mixed reporting based on JD currency.

Without these decisions, implementation work will be noisy and fragile.
