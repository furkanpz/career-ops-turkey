# Turkey Job Data Model

## Scope

This document defines a normalized, Turkey-specific job listing model for `career-ops`.

Goals:

- Keep compatibility with the current tracker and pipeline concepts.
- Support richer Turkish market data without forcing breaking changes to `applications.md`.
- Separate raw ingestion fields from normalized analysis fields.
- Stay practical: this is a logical schema contract, not a parser implementation.

Non-goals:

- No parser, scraper, or extractor logic yet.
- No migration of the existing markdown tracker in this step.

## Design Principles

1. Additive first. Existing `data/pipeline.md`, `data/applications.md`, reports, and dashboard flows remain valid. Runtime scanner metadata is projected into `data/tr-listings.jsonl` as a JSONL sidecar before any heavier storage migration is considered.
2. Normalized core, flat projection for consumers. Storage can be relational; downstream tools can still consume a flattened record.
3. Preserve raw evidence. Keep original JD text and raw location/compensation text.
4. Normalize only what is operationally useful for filtering, scoring, and tracking.
5. Turkey-specific defaults should not overwrite listing facts. Candidate targeting may be Turkey-based even when the listing is EMEA-wide or outside Turkey.

## Compatibility With Existing Career-Ops Concepts

Current repo concepts:

- `data/pipeline.md` is the inbox for discovered URLs.
- `data/tr-listings.jsonl` is the additive Turkey listing metadata sidecar keyed by canonical URL.
- `data/applications.md` is the canonical application tracker.
- `tracker-status-registry.json` defines tracker-safe canonical statuses (`templates/states.yml` is only a human-readable mirror):
  - `EVALUATED`
  - `APPLIED`
  - `RESPONSE_RECEIVED`
  - `INTERVIEW`
  - `OFFER`
  - `REJECTED`
  - `DISCARDED`
  - `SKIP`

Recommended compatibility rule:

- The Turkey model becomes the richer source of truth for listings.
- `applications.md` remains a projection for human-facing tracking.
- Only tracker-safe `pipeline_status` values should sync into `applications.md`.
- Pre-tracker states such as `discovered` or `queued` should exist only in the normalized listing layer.

## Entity Overview

Recommended logical tables:

1. `tr_companies`
2. `tr_sources`
3. `tr_locations`
4. `tr_job_listings`
5. `tr_job_listing_content`
6. `tr_job_listing_events` (optional but recommended)

This keeps the schema normalized while still allowing a flat listing view for pipeline/report generation.

## 1. `tr_companies`

Canonical company reference.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | Primary key |
| `canonical_name` | text | yes | Display/company match key, e.g. `Trendyol` |
| `legal_name` | text | no | Optional legal entity name |
| `website_url` | text | no | Canonical company site |
| `linkedin_url` | text | no | Optional reference |
| `created_at` | timestamptz | yes | Audit |
| `updated_at` | timestamptz | yes | Audit |

Constraints:

- `unique(canonical_name)`

## 2. `tr_sources`

Reference table for where the listing was found.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | Primary key |
| `source` | text | yes | Human-readable source, e.g. `LinkedIn`, `Kariyer.net`, `Company Careers` |
| `source_type` | text | yes | Canonical source type |
| `source_domain` | text | no | e.g. `linkedin.com`, `kariyer.net`, `careers.company.com` |
| `created_at` | timestamptz | yes | Audit |
| `updated_at` | timestamptz | yes | Audit |

Recommended canonical `source_type` values:

- `company_careers`
- `job_board`
- `aggregator`
- `staffing_agency`
- `social_network`
- `referral`
- `other`

Constraints:

- `check(source_type in (...))`
- `unique(source, coalesce(source_domain, ''))`

## 3. `tr_locations`

Normalized Turkey location reference.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | Primary key |
| `country_code` | char(2) | no | Actual listing country when known; do not derive from candidate default |
| `city` | text | no | Canonical city name; nullable for country-wide remote, multi-country, or unspecified cases |
| `district` | text | no | e.g. `Kadikoy`, `Cankaya`, `Gebze` |
| `region_scope` | text | no | Optional hiring geography such as `TR`, `EMEA`, `GLOBAL`, `MULTI_COUNTRY` |
| `location_text` | text | yes | Original or cleaned display string from listing |
| `created_at` | timestamptz | yes | Audit |
| `updated_at` | timestamptz | yes | Audit |

Constraints:

- `index(city)`
- `index(district)`

Notes:

- `city` is normalized for filtering.
- `location_text` is preserved as shown in the listing.
- If the listing says `Remote - Turkey` and no concrete city is present, keep `city = null`, `country_code = 'TR'`, and let `work_model` carry the remote meaning.
- If the listing is `EMEA remote` or similar, keep `country_code = null` unless a concrete country is explicit and use `region_scope` to preserve the hiring geography.

## 4. `tr_job_listings`

Core listing record. This is the operational table used by scanning, evaluation, and application tracking.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | Primary key |
| `company_id` | uuid | yes | FK -> `tr_companies.id` |
| `source_id` | uuid | yes | FK -> `tr_sources.id` |
| `location_id` | uuid | no | FK -> `tr_locations.id`; nullable for fully unspecified location |
| `external_listing_id` | text | no | Stable source-side id if available |
| `title` | text | yes | Normalized role title as displayed |
| `work_model` | text | yes | Canonical enum |
| `seniority` | text | yes | Canonical enum |
| `language` | text | yes | Canonical enum |
| `employment_type` | text | yes | Canonical enum |
| `pipeline_status` | text | yes | Canonical enum |
| `compensation_text` | text | no | Raw or lightly cleaned salary/benefits comp string |
| `posted_at` | timestamptz | no | Original posting date/time if derivable |
| `apply_url` | text | yes | Canonical apply URL |
| `confidence_score` | numeric(4,3) | yes | `0.000`-`1.000`; confidence in normalization quality |
| `created_at` | timestamptz | yes | First seen in system |
| `updated_at` | timestamptz | yes | Last mutation |
| `first_seen_at` | timestamptz | yes | Discovery timestamp |
| `last_seen_at` | timestamptz | no | Latest refresh timestamp |

Constraints:

- `check(confidence_score >= 0 and confidence_score <= 1)`
- `check(work_model in (...))`
- `check(seniority in (...))`
- `check(language in (...))`
- `check(employment_type in (...))`
- `check(pipeline_status in (...))`
- `unique(source_id, external_listing_id)` when `external_listing_id` is present
- `unique(apply_url)` is not safe globally; prefer a normalized URL hash index later if dedup becomes strict

Recommended indexes:

- `(pipeline_status, updated_at desc)`
- `(company_id, title)`
- `(posted_at desc nulls last)`
- `(work_model, city)` through a flattened or materialized view

## 5. `tr_job_listing_content`

One-to-one content table for text-heavy fields. Keeps the core listing row operational and fast.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `listing_id` | uuid | yes | PK + FK -> `tr_job_listings.id` |
| `jd_raw` | text | yes | Original extracted job description |
| `jd_clean` | text | no | Cleaned/plain normalized JD text |
| `requirements` | text | no | Extracted requirement section or joined bullets |
| `responsibilities` | text | no | Extracted responsibility section or joined bullets |
| `benefits` | text | no | Extracted benefits/perks section or joined bullets |
| `created_at` | timestamptz | yes | Audit |
| `updated_at` | timestamptz | yes | Audit |

Notes:

- `jd_raw` should preserve source wording as closely as possible.
- `jd_clean` may normalize whitespace, duplicated boilerplate, and repeated headers.
- `requirements`, `responsibilities`, and `benefits` remain nullable until extraction exists.

## 6. `tr_job_listing_events` (Optional, Recommended)

Append-only event log for pipeline history. This avoids overloading `pipeline_status` with too much temporal meaning.

| Column | Type | Required | Notes |
|---|---|---:|---|
| `id` | uuid | yes | Primary key |
| `listing_id` | uuid | yes | FK -> `tr_job_listings.id` |
| `event_type` | text | yes | e.g. `discovered`, `queued`, `evaluated`, `applied`, `status_changed` |
| `old_value` | text | no | Previous status/value |
| `new_value` | text | no | New status/value |
| `event_at` | timestamptz | yes | Event timestamp |
| `notes` | text | no | Optional operator/system notes |

This table is not required to start, but it is the cleanest way to support auditability later.

## Canonical Flattened Listing View

Even with normalized storage, most pipeline/report code will want a flat record. Recommended logical view:

| Field | Source |
|---|---|
| `title` | `tr_job_listings.title` |
| `company` | `tr_companies.canonical_name` |
| `source` | `tr_sources.source` |
| `source_type` | `tr_sources.source_type` |
| `city` | `tr_locations.city` |
| `location_text` | `tr_locations.location_text` |
| `work_model` | `tr_job_listings.work_model` |
| `seniority` | `tr_job_listings.seniority` |
| `language` | `tr_job_listings.language` |
| `employment_type` | `tr_job_listings.employment_type` |
| `compensation_text` | `tr_job_listings.compensation_text` |
| `posted_at` | `tr_job_listings.posted_at` |
| `jd_raw` | `tr_job_listing_content.jd_raw` |
| `jd_clean` | `tr_job_listing_content.jd_clean` |
| `requirements` | `tr_job_listing_content.requirements` |
| `responsibilities` | `tr_job_listing_content.responsibilities` |
| `benefits` | `tr_job_listing_content.benefits` |
| `apply_url` | `tr_job_listings.apply_url` |
| `confidence_score` | `tr_job_listings.confidence_score` |
| `pipeline_status` | `tr_job_listings.pipeline_status` |

This satisfies the minimum required output fields while preserving normalized storage.

## Canonical Enumerations

### `work_model`

- `remote`
- `hybrid`
- `on_site`
- `field`
- `unspecified`

### `seniority`

- `intern`
- `new_grad`
- `junior`
- `mid`
- `senior`
- `staff`
- `principal`
- `lead`
- `manager`
- `director`
- `head`
- `vp`
- `c_level`
- `unspecified`

### `language`

- `tr`
- `en`
- `tr_en`
- `de`
- `fr`
- `ar`
- `ru`
- `multilingual`
- `unspecified`

### `employment_type`

- `full_time`
- `part_time`
- `contract`
- `internship`
- `temporary`
- `freelance`
- `consulting`
- `apprenticeship`
- `unspecified`

### `pipeline_status`

Tracker-safe statuses already in the repo are preserved. Pre-tracker stages are additive.

- `discovered`
- `queued`
- `evaluation_in_progress`
- `evaluated`
- `applied`
- `response_received`
- `interview`
- `offer`
- `rejected`
- `discarded`
- `skip`
- `closed`
- `duplicate`
- `error`

Compatibility note:

- Only `evaluated`, `applied`, `response_received`, `interview`, `offer`, `rejected`, `discarded`, and `skip` should round-trip into `applications.md`.

## Field-Level Definitions

| Field | Rule |
|---|---|
| `title` | Store the human-visible role title, lightly cleaned but not re-authored |
| `company` | Derived from `tr_companies.canonical_name` |
| `source` | Derived from `tr_sources.source` |
| `source_type` | Derived from `tr_sources.source_type` |
| `city` | Canonical Turkish city name for filtering; nullable only if truly unspecified |
| `location_text` | Preserve source display text, including district or `Remote - Turkey` wording |
| `work_model` | Canonical enum from listing wording |
| `seniority` | Canonical enum from title and JD clues |
| `language` | Primary working/application language expectation for the listing |
| `employment_type` | Canonical contract type, not work arrangement |
| `compensation_text` | Unparsed salary/benefits comp phrase; do not force numeric parsing yet |
| `posted_at` | Use source date when available; otherwise null |
| `jd_raw` | Full raw source text |
| `jd_clean` | Cleaned and normalized variant of `jd_raw` |
| `requirements` | Requirement section text if identifiable |
| `responsibilities` | Responsibility section text if identifiable |
| `benefits` | Benefits/perks section text if identifiable |
| `apply_url` | Final application target URL, not a search results URL |
| `confidence_score` | Confidence in normalized values, not confidence that the job is real |

## Projection To Existing Tracker

When this model is projected into `data/applications.md`:

| Tracker column | Turkey model source |
|---|---|
| `Date` | `posted_at::date` if known, otherwise evaluation date |
| `Company` | `company` |
| `Role` | `title` |
| `Status` | tracker-safe `pipeline_status` only |
| `Notes` | optional summary of `work_model`, `city`, or comp |

Do not project:

- `discovered`
- `queued`
- `evaluation_in_progress`
- `duplicate`
- `error`

Those belong to the richer listing layer, not the current markdown tracker.

## Recommended Future Extensions

These are explicitly additive and can be added later without breaking this model:

- `tr_job_listing_language_details` for multiple explicit language requirements
- `tr_job_listing_compensation` for parsed currency/range fields
- `tr_job_listing_skills` for structured skill extraction
- `tr_job_listing_tags` for sector or department tags
- `tr_job_listing_dedup` for normalized URL/content fingerprints

## Example Flattened Record

```json
{
  "title": "Software Engineer",
  "company": "ExampleTech",
  "source": "LinkedIn",
  "source_type": "job_board",
  "city": "Istanbul",
  "location_text": "Istanbul, Turkiye / Hybrid",
  "work_model": "hybrid",
  "seniority": "senior",
  "language": "tr_en",
  "employment_type": "full_time",
  "compensation_text": "Ozel saglik sigortasi + yemek karti + bonus",
  "posted_at": "2026-04-05T09:00:00Z",
  "jd_raw": "...",
  "jd_clean": "...",
  "requirements": "...",
  "responsibilities": "...",
  "benefits": "...",
  "apply_url": "https://www.linkedin.com/jobs/view/1234567890/",
  "confidence_score": 0.93,
  "pipeline_status": "queued"
}
```

## Decision Summary

This schema is the recommended Turkey-specific listing layer because it:

- keeps existing tracker behavior intact
- gives the pipeline a normalized base for filtering and dedup
- preserves raw Turkish job-market phrasing
- leaves room for future structured parsing without redoing the model
