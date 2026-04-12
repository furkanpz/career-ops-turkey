# Turkey Localization Review Findings

> Historical review snapshot. The findings below describe issues found before the current Turkey
> fork completion work. They are preserved for traceability and should not be treated as the active
> product contract.

## Scope

This review covers the current uncommitted Turkey-localization changes in the working tree, with emphasis on:

- breaking changes
- schema and enum mismatches
- naming inconsistencies
- backward-compatibility claims
- Turkish-specific fields that may collide with the existing pipeline

I did not apply fixes.

## Verification Performed

- `node --check cv-template-utils.mjs` -> passes
- `node test-all.mjs` -> fails with 19 failures, all from the absolute-path check
- manual probe of `cv-template-utils.mjs` shows `es` is normalized to `en`

## Findings

### 1. Release-blocker: new TR docs/modes introduce absolute filesystem links and fail the repo test suite

The repo already treats absolute paths as invalid in tracked code/docs via `test-all.mjs:165-178`. New Turkey files contained absolute home-directory links, for example:

- `docs/tr-normalization-spec.md:5`
- `docs/tr-source-adapter-contract.md:11,32-34,268`
- `docs/tr-dashboard-plan.md:20-24,289-316`
- `docs/tr-profile-schema.md:535`
- `docs/tr-cv-output-strategy.md:128`
- `modes/tr/_shared.md:28`
- `modes/tr/teklif.md:99`

This is not theoretical: `node test-all.mjs` currently fails because of these links. As-is, this branch is not merge-safe.

### 2. High risk: TR report row format does not match the dashboard parser contract

`modes/tr/teklif.md:17-25` tells the model to emit Block A rows like:

- `**Arquetipo:** | ...`
- `**Remote:** | ...`
- `**TL;DR:** | ...`

But the dashboard parser only accepts:

- `**Arquetipo** | ...` or `**Arquetipo:** ...`
- `**TL;DR** | ...` or `**TL;DR:** ...`
- `**Remote** | ...`

See `dashboard/internal/data/career.go:17-22`.

That means the mixed `colon + pipe` form requested by the TR mode will not be parsed reliably for archetype, TL;DR, or remote. Dashboard enrichment would silently degrade even if report generation "looks right" to a human.

### 3. High risk: `source_type` is defined with incompatible enums across the new TR contracts

The new Turkey config and adapter contract use one enum family:

- `templates/portals.tr.example.yml:19,76,134`
- `docs/tr-source-adapter-contract.md:69-73,97-100`

Those values are:

- `turkish_job_board`
- `company_careers`
- `global_ats`

But the normalized data model and normalization spec use a different canonical family:

- `docs/tr-data-model.md:94-102`
- `docs/tr-normalization-spec.md:58-76`
- `docs/tr-source-adapter-contract.md:352-355` also uses `job_board` in its own JSON example

Those values are:

- `job_board`
- `aggregator`
- `company_careers`
- `staffing_agency`
- etc.

So the current docs simultaneously claim that `source_type` is:

1. routing/config metadata with values like `global_ats`
2. normalized output with values like `job_board`

If implemented literally, adapters will either emit non-canonical values or need an undocumented translation layer. This is a real schema mismatch, not just wording drift.

### 4. High risk: TR-specific pipeline statuses can be lossy or rejected by the current tracker pipeline

The new Turkey normalization spec adds listing-layer statuses such as:

- `discovered`
- `queued`
- `evaluation_in_progress`
- `closed`
- `duplicate`
- `error`

See `docs/tr-normalization-spec.md:248-306` and `docs/tr-data-model.md:375-398`.

But the current tracker pipeline only accepts the existing tracker-safe statuses:

- `merge-tracker.mjs:31-58`
- `verify-pipeline.mjs:32-42,76-100`

Worse, `merge-tracker.mjs:57-58` silently coerces unknown statuses to `Evaluada`.

That creates a Turkish-specific failure mode:

- if `closed`, `duplicate`, `error`, or another new TR status leaks into `applications.md`, verification will fail or merge will rewrite it to `Evaluada`
- that rewrite is lossy and semantically wrong

Backward compatibility is therefore only preserved if these new enums are perfectly contained outside `applications.md`. The current runtime does not enforce that boundary safely.

### 5. Medium risk: the new CV template helper regresses Spanish/legacy language handling

`cv-template-utils.mjs:51-57` recognizes only `tr` and `en`; everything else falls back to `en`.

At the same time, the updated PDF docs still describe `{{LANG}}` as `en`, `es`, or `tr` in `modes/pdf.md:70-75`, and the repo's operator-facing PDF flow is still Spanish-first.

Observed behavior from a direct CLI probe:

- `resolveCvTemplate({ language: 'es' })` -> English template
- `resolveCvOutputPaths({ language: 'es' })` -> `...-en-...`
- `resolveCvSectionLabels('es')` -> English labels

So once workers follow the new helper-based flow, Spanish output is no longer preserved. That is a backward-compatibility regression for non-TR localized CV generation.

### 6. Medium risk: the PDF path contract is internally inconsistent after language-suffixed naming was added

The batch prompt still tells reports to write:

- `career-ops/output/cv-candidate-{company-slug}-{DATE}.pdf`

at `batch/batch-prompt.md:167-174`

But the same file now tells workers to actually generate:

- `output/cv-candidate-{company-slug}-{lang}-{DATE}.pdf`

at `batch/batch-prompt.md:214-231`.

This is a naming-contract split inside a single prompt. The most likely outcome is stale `**PDF:**` metadata in reports, even when the actual PDF generation succeeds.

### 7. Medium risk: profile language schema names are not stable across the new TR docs

`config/profile.tr.example.yml:86-95` and `docs/tr-profile-schema.md` use:

- `language.cv_preferences`
- `by_listing_language`

But `docs/tr-cv-output-strategy.md:130-143` uses:

- `language.cv_language_preferences`
- `auto_select_by_posting_language`

These are not additive aliases of the same structure; they are different keys with different behavior knobs. Any future loader or prompt logic will have to guess which one is canonical.

### 8. Medium risk: the new Turkey data model hard-codes `country_code = TR` while the new portal strategy explicitly includes EMEA-wide sources

The new portal config is intentionally "Turkey / EMEA" and includes `en-EMEA` global ATS sources:

- `templates/portals.tr.example.yml:1,21,132-186`

But the new data contracts hard-code Turkey country semantics:

- `docs/tr-data-model.md:25,116,125`
- `docs/tr-source-adapter-contract.md:181-193,368-374`

This is a risky assumption. Many EMEA roles are not Turkey-located even if they are acceptable for a Turkey-based candidate. If `country_code` is always forced to `TR`, downstream filtering and analytics will mis-model cross-border roles.

### 9. Medium risk: TR mode activation is documented, but not wired into the main operating contract

`modes/tr/README.md:28-36` and `config/profile.tr.example.yml:84-88` suggest profile-based activation via `language.modes_dir: modes/tr`.

But `CLAUDE.md:180-197` only documents automatic handling for `modes/de` and `modes/fr`; there is no TR equivalent.

So "profile-based TR activation" is currently a convention, not an enforced behavior. That is acceptable for a draft, but not for a production-ready localization surface.

## Backward Compatibility Assessment

### Preserved

- The new profile additions are mostly additive and optional. `config/profile.tr.example.yml` keeps the legacy `candidate`, `compensation`, and `location` fields intact.
- `generate-pdf.mjs` is unchanged, which avoids introducing renderer-level regressions.
- `templates/cv-template.en.html` and `templates/cv-template.tr.html` currently preserve the same placeholder set as `templates/cv-template.html`.

### Not preserved

- Repo-level test cleanliness is not preserved because tracked docs now violate the absolute-path rule.
- Dashboard report parsing is not preserved for the new TR Block A row format.
- Spanish CV language behavior is not preserved once the helper-driven path is used.
- Tracker safety is not preserved if new TR listing-layer statuses leak into `applications.md`.

## Turkish-Specific Field / Enum Conflict Summary

The highest-risk Turkey-specific collisions with existing pipeline behavior are:

1. `source_type`
   Current TR docs use both config-family enums (`global_ats`) and normalized-family enums (`job_board`) for the same field.

2. `pipeline_status`
   New TR statuses like `closed`, `duplicate`, and `error` are not tracker-safe and can be rejected or silently rewritten.

3. `country_code`
   New TR contracts force `TR`, but the portal strategy explicitly includes EMEA-wide sources.

4. `language`
   The helper currently collapses non-`tr`/`en` values to English, which conflicts with the still-documented `es` path.

## Minimal Patch Plan

Do not broaden scope yet. A minimal safe patch set is:

1. Remove all absolute path links from the new TR docs and modes.
   Use repo-relative plain references instead.

2. Freeze one parser-safe report row syntax for TR reports.
   The lowest-risk option is to match the existing dashboard regexes exactly:
   `**Arquetipo** | ...`, `**Remote** | ...`, `**TL;DR** | ...`

3. Split `source_type` into two explicit concepts before implementation:
   one config/routing field (`adapter_family` or similar) and one normalized output field (`source_type` with canonical values like `job_board`).

4. Add a hard boundary between listing-layer statuses and tracker statuses.
   `applications.md` should only ever receive the existing tracker-safe set; unknown values must not silently default to `Evaluada`.

5. Decide and document one canonical profile language schema.
   Either keep `language.cv_preferences` or rename it everywhere, but stop using both.

6. Restore legacy CV language behavior before adopting the helper in prompts.
   Either support `es` explicitly, or stop documenting `es` as supported in the helper-driven path.

7. Align the PDF filename contract everywhere.
   The report header example, PDF generation steps, and any downstream docs should reference the same naming convention.

8. Clarify geography semantics for the TR data model.
   If the scope is "Turkey-based candidate, possibly EMEA role", then `country_code` cannot be hard-locked to `TR` for every listing.

9. Wire TR mode activation into the main operating contract if it is intended to be first-class.
   At minimum, update `CLAUDE.md`; ideally also add coverage in the repo checks once the surface is official.

## Bottom Line

The Turkey work is directionally sound as an additive design layer, but it is not production-ready yet.

The main blockers are not cosmetic:

- test-suite breakage from absolute paths
- parser-contract drift in report formatting
- enum/schema drift (`source_type`, profile language keys)
- unsafe interaction between new TR statuses and the current tracker pipeline

Those should be resolved before any runtime implementation starts depending on these TR contracts.
