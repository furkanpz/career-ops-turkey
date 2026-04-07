# Turkey Portal Configuration Layer

## Purpose

`templates/portals.tr.example.yml` defines a Turkey-specific discovery layer for job scanning without changing the current scanner contract.

It keeps the existing configuration shape:

- `title_filter`
- `search_queries`
- `tracked_companies`

The new file adds metadata fields that are safe to ignore today and useful for a future Turkey-aware parser and dedup layer:

- `source_type`
- `parser_key`
- `locale`
- `language`
- `anti_duplication`

## Compatibility

The current scanner mainly relies on:

- `query`
- `enabled`
- `careers_url`
- `scan_method`
- `scan_query`
- `api`

`templates/portals.tr.example.yml` preserves those keys and only adds metadata beside them. That means:

- existing implementations can continue reading the old fields
- future Turkey-specific logic can route parsing and dedup behavior from the new metadata

No part of this config assumes automatic submission. It is only a discovery surface.

## Design Principles

### 1. Keep the same repo contract

The new file follows the same style as `templates/portals.example.yml` rather than inventing a new schema.

### 2. Prefer direct company pages over aggregators

Turkish job boards are useful for discovery, but they duplicate listings aggressively and often wrap employer postings. For that reason:

- `tracked_companies` remains the highest-trust source
- Turkish job boards are used through `search_queries`
- `anti_duplication` metadata tells a future scanner which source should win

### 3. Treat Turkey as mixed-language

Real Turkey-market hiring is not Turkish-only. Many employers publish:

- Turkish postings for local teams
- English postings for engineering, product, and regional roles
- EMEA-wide postings that still accept Turkey-based candidates

That is why the template includes both:

- local Turkish boards
- Turkey-founded company pages
- global ATS providers commonly used in Turkey / EMEA hiring

## Source Categories Included

### Turkish job boards

The template includes realistic WebSearch discovery hooks for:

- `kariyer.net`
- `secretcv`
- `yenibiris`
- `youthall` as optional early-career coverage

These are modeled as `search_queries` because board HTML and access patterns are more volatile than direct employer pages.

### Company career pages

The template includes a compact set of Turkey-relevant employers with direct career pages:

- Trendyol
- Hepsiburada
- Insider
- Papara
- iyzico
- Dream Games
- Peak

This is intentionally not exhaustive. The goal is a realistic starter layer, not a directory of every Turkey employer.

### Global ATS providers used by Turkey / EMEA employers

The template adds site-filtered search coverage for:

- Greenhouse
- Ashby
- Lever
- Workable
- Teamtailor

These are common enough in EMEA hiring that they deserve first-class discovery coverage even when the employer is not Turkey-native.

## Field Reference

### `source_type`

High-level source classification.

Suggested values in this template:

- `turkish_job_board`
- `company_careers`
- `global_ats`

This helps future scanner logic choose trust level, dedup precedence, and parser behavior.

### `parser_key`

A stable parser hint, not an executable instruction.

Examples used in the template:

- `kariyernet_search`
- `secretcv_search`
- `yenibiris_search`
- `youthall_search`
- `greenhouse_board`
- `ashby_board`
- `lever_board`
- `workable_board`
- `teamtailor_board`
- `custom_careers_hub`

This is the key field that should drive future locale-aware extraction rules.

### `locale`

Expected page or source locale, such as:

- `tr-TR`
- `en-TR`
- `en-EMEA`

This is useful for text extraction, liveness heuristics, and choosing the right expired/apply patterns.

### `language`

Expected posting languages. This is an operational hint for content analysis and title normalization.

Examples:

- `[tr, en]`
- `[en]`

### `anti_duplication`

Hints for future dedup logic. These are advisory, not currently executable rules.

Patterns used in the template:

- `canonical_source`
- `company_aliases`
- `prefer_company_page_over_job_board`
- `prefer_url_job_id`
- `normalize_company_from_result`
- `strip_title_suffixes`

These are the minimum useful hints for Turkey because duplicates often appear across:

- employer page and local board
- English and Turkish title variants
- same role with only location or remote tags changed

## Maintenance Guidance

Use this file as a starting point, not a final catalog.

When extending it:

1. Prefer adding a small number of high-signal employers over large noisy board lists.
2. Keep `parser_key` stable once introduced.
3. Add `company_aliases` whenever a company appears under multiple legal or brand names.
4. Add Turkish and English title variants only when they materially improve discovery.
5. Do not encode any apply or submit behavior here.

## Recommended Next Step

If this config layer is accepted, the next implementation step should be scanner-side support for:

1. parser dispatch by `parser_key`
2. locale-aware liveness checks by `locale` and `language`
3. dedup precedence using `anti_duplication`

Until then, the file is still useful as a realistic Turkey-focused template and migration target for user `portals.yml` files.
