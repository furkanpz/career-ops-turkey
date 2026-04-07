# Turkey Localization Task Breakdown

## Priority Model

- `P0`: must be decided before implementation
- `P1`: required for a production-safe Turkey MVP
- `P2`: important hardening after MVP
- `P3`: polish and release hygiene

## P0

| Priority | Task | Files | Why now | Exit criteria |
|---|---|---|---|---|
| P0 | Freeze the internal localization boundary | `templates/states.yml`, `normalize-statuses.mjs`, `merge-tracker.mjs`, `verify-pipeline.mjs`, `dashboard/internal/data/career.go` | The repo already mixes English labels and Spanish operational states. Turkish should not become a third incompatible layer. | One documented decision exists for canonical internal statuses and machine-readable report keys. |
| P0 | Decide Turkey scope | `CLAUDE.md`, `config/profile.example.yml`, `templates/portals.example.yml`, `modes/_shared.md` | “Turkey-localized” can mean different things operationally. Scanner, comp, and form behavior depend on this definition. | A short design note states whether the target is Turkish-language roles, Turkey-market roles, or Turkey-based candidates applying globally. |
| P0 | Choose locale structure | `CLAUDE.md`, `DATA_CONTRACT.md`, `update-system.mjs`, `test-all.mjs` | The repo already has `modes/de/` and `modes/fr/`. A Turkey implementation should follow one clear path. | A documented choice exists between `modes/tr/` and in-place edits. Recommended choice: `modes/tr/`. |

## P1

| Priority | Task | Files | Why now | Exit criteria |
|---|---|---|---|---|
| P1 | Add Turkey-facing core mode set | `modes/_shared.md`, `modes/oferta.md`, `modes/pdf.md`, `modes/apply.md`, `modes/scan.md`, `modes/auto-pipeline.md`, `modes/contacto.md`, `modes/tracker.md`, `batch/batch-prompt.md` | These files define the main evaluate → PDF → tracker → apply workflow. | The primary user flow can run fully with Turkish-market assumptions and Turkish-facing output where intended. |
| P1 | Localize candidate defaults | `config/profile.example.yml`, `modes/_profile.template.md` | New users need sane Turkey defaults from day one. | Example profile values use Turkey-appropriate location, timezone, phone, and comp defaults. |
| P1 | Rebuild scanner assumptions for Turkey | `templates/portals.example.yml`, `modes/scan.md`, `check-liveness.mjs`, `modes/auto-pipeline.md` | Turkey support is not useful if discovery still points to the wrong job market. | Scanner config, title filters, and liveness signals are explicitly Turkey-aware. |
| P1 | Normalize tracker/status behavior | `templates/states.yml`, `normalize-statuses.mjs`, `merge-tracker.mjs`, `verify-pipeline.mjs`, `modes/tracker.md` | Status handling is a shared contract; it must be stable before Turkish labels or aliases are added. | Turkish tracker rows can be ingested, normalized, merged, and verified without manual cleanup. |
| P1 | Make dashboard locale-safe | `dashboard/internal/data/career.go`, `dashboard/internal/ui/screens/pipeline.go` | Dashboard parsing currently depends on specific Spanish report labels and English UI text. | Dashboard filters, preview enrichment, and status changes work with the chosen Turkish implementation strategy. |
| P1 | Make the fork safe to operate | `update-system.mjs`, `CLAUDE.md`, `test-all.mjs` | A Turkey fork should not accidentally self-revert to upstream behavior. | Updater strategy is explicit and tests cover the Turkish system shape. |

## P2

| Priority | Task | Files | Why now | Exit criteria |
|---|---|---|---|---|
| P2 | Cover secondary decision modes | `modes/ofertas.md`, `modes/deep.md`, `modes/project.md`, `modes/training.md`, `modes/pipeline.md`, `modes/batch.md` | These modes are user-visible but not required for initial Turkey launch. | Secondary modes no longer leak generic EN/ES assumptions into the Turkey fork. |
| P2 | Run PDF visual and ATS QA | `modes/pdf.md`, `templates/cv-template.html`, `generate-pdf.mjs`, `fonts/*`, `examples/ats-normalization-test.md` | Template changes should be driven by real rendering evidence, not guesswork. | Turkish glyphs, spacing, headings, and ATS-safe output are verified on realistic sample CVs. |
| P2 | Add regression coverage for Turkish statuses and reports | `test-all.mjs`, `verify-pipeline.mjs`, `dashboard/internal/data/career.go` | The most likely breakage after localization is parser drift. | Tests or fixtures cover Turkish tracker/status/report scenarios. |

## P3

| Priority | Task | Files | Why now | Exit criteria |
|---|---|---|---|---|
| P3 | Update public docs | `README.md`, `docs/CUSTOMIZATION.md`, `docs/SETUP.md`, `docs/ARCHITECTURE.md`, `doctor.mjs`, `DATA_CONTRACT.md` | Documentation should follow the implemented system, not lead it. | Public docs describe the Turkey fork accurately and no longer use US/Spain-first examples by default. |
| P3 | Refresh examples for Turkish workflows | `examples/*` | Examples should validate the real UX after the core system is stable. | At least one Turkey-relevant sample profile/report/CV exists and renders correctly. |

## Suggested Execution Order

1. Resolve P0 decisions first.
2. Implement status canonicalization before changing dashboard or batch output.
3. Implement scanner market assumptions before evaluating scanner quality.
4. Localize the core modes before touching docs.
5. Only change the PDF template or generator after Turkish rendering QA proves a real need.

## Non-goals for the First Coding Pass

- Rewriting every existing EN/ES/DE/FR file in place.
- Changing the PDF engine without a demonstrated Turkish rendering problem.
- Updating contributor-facing docs before the runtime behavior is stable.
