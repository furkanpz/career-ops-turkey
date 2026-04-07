# Turkey Parser Implementation Plan

## Goal

Implement Turkey-aware source adapters in a way that preserves one stable downstream schema and avoids per-site parser sprawl.

This plan is intentionally lightweight. It defines sequencing and ownership boundaries, not full parser code.

## Implementation Principles

1. Build the shared contract first, then family adapters.
2. Share normalization and dedup helpers across families.
3. Start with high-signal sources, not broad source count.
4. Keep source-family adapters thin; put site quirks behind extractor profiles or small override modules.

## Shared Foundation

These pieces should exist before family-specific parser work:

### 1. Adapter registry

Responsibility:

- map `parser_key` to adapter implementation
- validate that config and adapter family agree
- provide a single invocation path for scanner code

Suggested output:

- `registerAdapter(adapter)`
- `getAdapter(parser_key)`
- `runAdapter(request)`

### 2. Shared normalization helpers

Responsibility:

- canonical enum mapping using [docs/tr-normalization-spec.md](/Users/furkan/Desktop/Proje/career-ops/docs/tr-normalization-spec.md)
- company/title/location cleanup
- URL cleanup and fingerprint preparation

Must own:

- `source_type`
- `work_model`
- `seniority`
- `language`
- `employment_type`

Must not own:

- site-specific selector logic
- source-specific fetch decisions

### 3. Shared dedup helpers

Responsibility:

- URL fingerprint generation
- company/title/location key generation
- source precedence based on `anti_duplication`

The first implementation only needs deterministic fingerprints and precedence hints. Full fuzzy dedup can come later.

## Family Plan

## 1. Turkish Job Boards

### Scope

Initial parser keys:

- `kariyernet_search`
- `secretcv_search`
- `yenibiris_search`
- `youthall_search`

### Primary fetch mode

- `websearch_result`

Optional second step later:

- hydrate the chosen result with `html_page` when the listing page is directly accessible

### Expected extraction pattern

Primary signals often come from:

- search result title
- result URL
- result snippet
- listing page title if hydrated

### First implementation target

Produce discovery-grade normalized candidates with:

- company
- title
- source URLs
- coarse location
- confidence score

Do not block the first version on full JD extraction.

### Risks

- boards frequently duplicate employer postings
- result titles may include location and urgency noise
- access and HTML structure may change often

### Maintainability rule

Treat these as search adapters first, not page-HTML parsers. Avoid deep board-specific DOM work unless a board proves stable and high-value.

## 2. Company Career Pages

### Scope

Initial parser key:

- `custom_careers_hub`

Current examples in the Turkey config:

- Trendyol
- Hepsiburada
- Insider
- Papara
- iyzico
- Dream Games
- Peak

### Primary fetch modes

- `playwright_snapshot`
- `html_page`

### Expected extraction pattern

Company pages will vary, but most still expose repeated card/list structures with:

- job title
- location
- department
- detail/apply link

### First implementation target

Build one generic company-careers adapter with configurable extractor profiles:

- list container selector hints
- item link selector hints
- location selector hints
- title cleanup rules

Only create a company-specific override when the generic profile clearly fails.

### Risks

- bespoke HTML and JS-heavy pages
- pagination or “load more” interactions
- content split between listing cards and detail pages

### Maintainability rule

Prefer:

- one adapter
- small extractor profiles per site

Do not create seven separate adapters for seven companies unless their structures truly diverge beyond a profile layer.

## 3. Global ATS Pages

### Scope

Initial parser keys:

- `greenhouse_board`
- `ashby_board`
- `lever_board`
- `workable_board`
- `teamtailor_board`

### Primary fetch modes

- `json_api` where reliably available
- `html_page` or `playwright_snapshot` otherwise

### Expected extraction pattern

These sources are the best early parser targets because they are comparatively structured and reusable across many employers.

### First implementation target

Implement ATS-family adapters in this order:

1. `greenhouse_board`
2. `lever_board`
3. `ashby_board`
4. `workable_board`
5. `teamtailor_board`

Reason:

- Greenhouse and Lever often expose cleaner structures and stable IDs
- Ashby is common but can be more JS-driven
- Workable and Teamtailor are useful coverage additions after the core is stable

### Risks

- region-specific domain variants
- ATS-specific redirects and closed-job behaviors
- mismatch between board list URLs and final apply URLs

### Maintainability rule

These should be true reusable family adapters. Do not contaminate them with Turkey-company-specific exceptions unless those exceptions are impossible to express through config.

## Suggested Delivery Order

### Phase 1: Contract and shared utilities

Deliver:

- adapter registry
- shared normalization helpers
- shared dedup helpers
- test fixtures for contract validation

Success condition:

- any adapter can emit `tr-listing-candidate/v1` and pass schema validation

### Phase 2: One adapter per family

Deliver:

- `kariyernet_search`
- `custom_careers_hub`
- `greenhouse_board`

Success condition:

- one Turkish board, one company page family, and one global ATS family can all emit the same normalized shape

### Phase 3: Expand family coverage

Deliver:

- `secretcv_search`
- `yenibiris_search`
- `lever_board`
- `ashby_board`
- extractor profiles for 2-3 company pages

Success condition:

- at least 80 percent of configured Turkey sources route through a supported adapter family

### Phase 4: Hardening

Deliver:

- liveness integration by `locale` and `language`
- stronger dedup keys using `anti_duplication`
- confidence scoring calibration
- regression fixtures for contract drift

Success condition:

- parser output remains stable across source refreshes and downstream consumers do not need family-specific branching

## Minimal Test Strategy

Each adapter family should have:

1. one golden input fixture
2. one malformed input fixture
3. one low-confidence but valid input fixture

Validate:

- required keys always exist
- canonical enums are valid
- unknown/null handling is deterministic
- warnings are emitted instead of silent guessing

## What Not To Do

- do not implement full JD section extraction before the listing envelope is stable
- do not let each adapter invent its own dedup format
- do not normalize enums differently per adapter
- do not mix fetch orchestration and parsing logic into one large source-specific class

## Recommended First Coding Slice

The best first implementation slice is:

1. registry + contract validator
2. shared normalizer
3. `greenhouse_board`
4. `kariyernet_search`
5. `custom_careers_hub`

That slice proves the architecture across all three source families with minimal surface area.
