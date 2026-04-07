# Turkey Dashboard Plan

## Goal

Plan a Turkey-specific dashboard filtering and presentation layer for `career-ops` without broad UI rewrites.

The first iteration should be:

- simple
- operational
- low-risk
- compatible with the current tracker-first dashboard architecture

## Current Dashboard Inspection

### File map

Relevant dashboard files:

- [dashboard/main.go](/Users/furkan/Desktop/Proje/career-ops/dashboard/main.go)
- [dashboard/internal/model/career.go](/Users/furkan/Desktop/Proje/career-ops/dashboard/internal/model/career.go)
- [dashboard/internal/data/career.go](/Users/furkan/Desktop/Proje/career-ops/dashboard/internal/data/career.go)
- [dashboard/internal/ui/screens/pipeline.go](/Users/furkan/Desktop/Proje/career-ops/dashboard/internal/ui/screens/pipeline.go)
- [dashboard/internal/ui/screens/viewer.go](/Users/furkan/Desktop/Proje/career-ops/dashboard/internal/ui/screens/viewer.go)

### Current data flow

The dashboard flow today is:

1. Parse `applications.md`
2. Normalize tracker status
3. Compute status-based metrics
4. Render the pipeline screen with filter tabs, grouped list, preview, and inline status picker

Practical implication:

- the dashboard is still tracker-centric
- it does not yet consume the richer Turkey job model directly
- first-iteration Turkey views should be built from existing tracker data plus light derived metadata

### Likely extension points

### `dashboard/internal/ui/screens/pipeline.go`

This is the main filter and presentation layer.

Current responsibilities:

- filter constants
- `pipelineTabs`
- `statusOptions`
- grouped section labels
- `applyFilterAndSort()`
- `countForFilter()`
- `renderTabs()`
- `renderMetrics()`
- `renderPreview()`

This is the primary file to extend for Turkey-specific dashboard sections.

### `dashboard/internal/data/career.go`

This is the current normalization and enrichment layer.

Current responsibilities:

- parse tracker rows into `CareerApplication`
- normalize statuses via `NormalizeStatus()`
- compute status metrics via `ComputeMetrics()`
- load report summary fields via `LoadReportSummary()`

Today it only extracts:

- `archetype`
- `tldr`
- `remote`
- `comp`

This means several requested Turkey filters do not yet have first-class fields.

### `dashboard/internal/model/career.go`

This is the safest place to add small derived metadata fields later if needed.

Current model is narrow:

- score
- status
- notes
- report path
- summary enrichment

This makes it a good location for additive filter metadata in a future coding pass.

### Current limitations

The dashboard can already support some Turkey-relevant slices, but not all of them natively.

### Available today with low effort

- `high fit`
  - available from `Score`
- `newly found`
  - approximable from tracker `Date`
- `remote`
  - approximable from report summary `Remote`

### Not reliably available today

- `Istanbul`
- `English-required`
- `salary-transparent`
- `ready to apply`

These need one of:

1. note tags
2. small derived metadata fields
3. a future normalized listing/application metadata source

## First Iteration Strategy

Do not redesign the dashboard layout.

Instead:

1. keep the current pipeline screen
2. keep grouped status metrics
3. add a Turkey-specific filter preset
4. derive missing flags using stable note tags and lightweight heuristics

This keeps the first iteration operational without requiring a UI rewrite.

## Proposed Turkey Filter Sections

Recommended first-iteration sections:

- `ALL`
- `HIGH FIT`
- `NEW`
- `REMOTE`
- `ISTANBUL`
- `ENGLISH`
- `SALARY`
- `READY`

These correspond to the user’s requested slices:

- high fit
- newly found
- remote
- Istanbul
- English-required
- salary-transparent
- ready to apply

## Proposed section definitions

### `HIGH FIT`

Definition:

- `score >= 4.0`

Why it is safe:

- already supported by current tracker data
- equivalent to the existing `TOP >=4` idea, but clearer for workflow use

### `NEW`

Definition for v1:

- tracker `Date` within the last 7 days

Important limitation:

- this is tracker recency, not true discovery recency
- in the current system, `Date` is closer to evaluation/entry date than to first-seen source date

Recommended label note:

- document this section as “recently added” in v1

### `REMOTE`

Definition for v1:

- report summary `Remote` field contains a remote-positive phrase such as:
  - `remote`
  - `fully remote`
  - `uzaktan`
  - `remote-first`

Fallback:

- if summary is not loaded yet, optionally inspect stable note tags such as `work_model:remote`

### `ISTANBUL`

Definition for v1:

- explicit note tag `city:istanbul`

Why not infer aggressively:

- current dashboard model has no reliable city field
- role title, company name, or free-text notes are too noisy for safe filtering

### `ENGLISH`

Definition for v1:

- explicit note tag:
  - `lang:en`
  - `lang:tr_en`

Optional heuristic fallback:

- report summary or notes contain `english required`

But recommendation:

- prefer explicit tags to avoid false positives

### `SALARY`

Definition for v1:

- explicit note tag `salary:transparent`

Why a note tag is needed:

- current `Comp` summary is market estimate / comp research, not proof that the listing itself disclosed salary
- using non-empty `Comp` would produce the wrong meaning

### `READY`

Definition for v1:

Preferred rule:

- explicit note tag `readiness:ready_to_apply`

Safe heuristic fallback:

- `status == evaluated`
- `score >= 4.0`
- `HasPDF == true`

Reason:

- this approximates “application packet is prepared and worth acting on”
- explicit tags should override heuristics when present

## Recommended metadata bridge

The lowest-risk bridge is to use machine-readable note tags in `applications.md`.

Recommended tags:

- `city:istanbul`
- `work_model:remote`
- `lang:en`
- `lang:tr_en`
- `salary:transparent`
- `readiness:ready_to_apply`

Optional additional tags:

- `source:linkedin`
- `source:kariyer_net`
- `country:tr`
- `work_model:hybrid`

Why this bridge works well:

- `CareerApplication` already carries `Notes`
- no tracker schema rewrite is required
- filters can be added incrementally
- future normalized data can replace tag parsing later

## Proposed implementation shape

### Phase 1: Add derived filter helpers

Files:

- [dashboard/internal/data/career.go](/Users/furkan/Desktop/Proje/career-ops/dashboard/internal/data/career.go)
- [dashboard/internal/model/career.go](/Users/furkan/Desktop/Proje/career-ops/dashboard/internal/model/career.go)

Plan:

1. Add small helper functions for:
   - recent entry detection
   - note tag presence
   - remote summary detection
2. Keep them read-only and additive.
3. Do not change tracker parsing format.

Optional additive model fields if needed:

- `IsRecent`
- `IsRemote`
- `CityTag`
- `LanguageTag`
- `SalaryTransparent`
- `ReadyToApply`

But this is optional for v1; helper functions alone may be enough.

### Phase 2: Replace generic tabs with a Turkey preset

Primary file:

- [dashboard/internal/ui/screens/pipeline.go](/Users/furkan/Desktop/Proje/career-ops/dashboard/internal/ui/screens/pipeline.go)

Plan:

1. Introduce new filter constants:
   - `filterHighFit`
   - `filterNew`
   - `filterRemote`
   - `filterIstanbul`
   - `filterEnglish`
   - `filterSalary`
   - `filterReady`
2. Replace the current generic tab set for the Turkey mode or preset:
   - `ALL`
   - `HIGH FIT`
   - `NEW`
   - `REMOTE`
   - `IST`
   - `EN`
   - `SAL`
   - `READY`
3. Keep labels short so the current tab row still fits terminal width.

Why replace instead of adding many more tabs:

- the current layout is single-row and width-sensitive
- too many tabs will degrade readability quickly

### Phase 3: Keep metrics status-based

Do not rewrite the metrics bar in v1.

Reason:

- current metrics are driven by normalized tracker statuses
- they remain useful even when the active filter tabs become Turkey-specific

So in v1:

- filter tabs become Turkey-specific
- metrics bar remains status-centric

This is a good operational compromise.

### Phase 4: Keep preview simple, add tag hints only if needed

Current preview already shows:

- archetype
- TL;DR
- comp
- remote

For v1, do not redesign preview layout.

Optional small enhancement:

- show detected note tags only when they drive the current filter

Examples:

- `City: Istanbul`
- `Language: EN`
- `Salary: transparent`
- `Ready: yes`

But this is optional; filtering can ship before preview enhancements.

## Proposed operational definitions table

| Section | V1 data source | V1 rule | Reliability |
|---|---|---|---|
| `HIGH FIT` | score | `score >= 4.0` | high |
| `NEW` | tracker date | `date within last 7 days` | medium |
| `REMOTE` | report summary or note tag | remote-positive summary or `work_model:remote` | medium |
| `ISTANBUL` | note tag | `city:istanbul` | high when tagged |
| `ENGLISH` | note tag | `lang:en` or `lang:tr_en` | high when tagged |
| `SALARY` | note tag | `salary:transparent` | high when tagged |
| `READY` | note tag or heuristic | `readiness:ready_to_apply` or evaluated+high-fit+pdf | medium |

## What not to do in v1

- do not rewrite the dashboard layout
- do not replace grouped status rendering
- do not add a second complex navigation layer
- do not parse city/language/salary transparency from arbitrary free text
- do not make the dashboard depend on the future Turkey normalized job model before that layer exists in runtime

## Recommended simple rollout

1. Add note-tag-aware filter helpers.
2. Add a Turkey filter preset in `pipeline.go`.
3. Keep metrics and status picker unchanged.
4. Use short labels in the existing tab row.
5. Treat `NEW`, `REMOTE`, and `READY` as heuristic-backed sections.
6. Treat `ISTANBUL`, `ENGLISH`, and `SALARY` as explicit-tag-backed sections.

## Suggested future phase after v1

Once the richer Turkey listing/application metadata exists at runtime, replace note-tag heuristics with structured fields:

- `city`
- `work_model`
- `language`
- `salary_transparent`
- `ready_to_apply`
- `first_seen_at`

At that point, the same UI can stay mostly unchanged while the filter quality improves significantly.

## Decision Summary

The safest first Turkey dashboard iteration is:

- keep the current dashboard screen architecture
- add a Turkey-specific filter preset
- rely on existing score/date/report summary fields where possible
- use stable note tags for missing metadata
- leave metrics, grouping, and status editing behavior intact
