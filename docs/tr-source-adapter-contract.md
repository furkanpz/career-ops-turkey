# Turkey Source Adapter Contract

## Purpose

This document defines a stable adapter contract for Turkey-specific job sources in `career-ops`.

Goals:

- keep parser logic replaceable per source family
- force every adapter to emit the same normalized schema
- align adapter output with [docs/tr-data-model.md](/Users/furkan/Desktop/Proje/career-ops/docs/tr-data-model.md) and [docs/tr-normalization-spec.md](/Users/furkan/Desktop/Proje/career-ops/docs/tr-normalization-spec.md)
- keep the contract additive and maintainable

Non-goals:

- no full parser implementation yet
- no runtime framework decision in this step
- no storage migration in this step

## Design Principles

1. One adapter contract, many source families.
2. Adapters may fetch differently, but they must emit one shared normalized envelope.
3. Raw evidence is preserved. Normalized fields never replace raw evidence.
4. Unknown beats guessed. Adapters must prefer `unknown` or `null` over weak inference.
5. Normalization is shared, not adapter-specific. Adapters extract raw signals; shared normalization utilities map them to canonical enums.

## Where This Fits

The current repo already has:

- source metadata in [templates/portals.tr.example.yml](/Users/furkan/Desktop/Proje/career-ops/templates/portals.tr.example.yml)
- a normalized target model in [docs/tr-data-model.md](/Users/furkan/Desktop/Proje/career-ops/docs/tr-data-model.md)
- normalization rules in [docs/tr-normalization-spec.md](/Users/furkan/Desktop/Proje/career-ops/docs/tr-normalization-spec.md)

The adapter layer sits between source discovery and normalized listing storage:

1. source config selects adapter by `parser_key`
2. adapter fetches and extracts raw listing signals
3. shared normalizer maps raw values into canonical fields
4. downstream scan, dedup, tracker, and evaluation consume the normalized envelope

## Adapter Registry Contract

Each adapter is registered by `parser_key`.

Recommended rule:

- `parser_key` is the only routing key used to select an adapter
- `source_type`, `locale`, `language`, and `anti_duplication` remain configuration metadata passed into the adapter

Examples from the current Turkey config:

- `kariyernet_search`
- `secretcv_search`
- `yenibiris_search`
- `youthall_search`
- `custom_careers_hub`
- `greenhouse_board`
- `ashby_board`
- `lever_board`
- `workable_board`
- `teamtailor_board`

## Adapter Interface

Recommended logical interface:

```ts
type AdapterFamily =
  | "turkish_job_board"
  | "company_careers"
  | "global_ats";

type FetchMode =
  | "websearch_result"
  | "html_page"
  | "json_api"
  | "playwright_snapshot";

interface TrSourceAdapter {
  key: string;                  // must match parser_key
  family: AdapterFamily;
  version: string;              // adapter contract version, not app version

  supports(source: SourceConfig): boolean;

  discover(request: AdapterRequest): Promise<AdapterBatchResult>;
}
```

This stays intentionally small. Avoid adapter-specific public methods unless a real source family forces them.

## Adapter Request

```ts
interface SourceConfig {
  name: string;
  source_type: "turkish_job_board" | "company_careers" | "global_ats";
  parser_key: string;
  locale?: string;
  language?: string[];
  careers_url?: string;
  scan_method?: string;
  scan_query?: string;
  api?: string;
  anti_duplication?: Record<string, unknown>;
}

interface AdapterRequest {
  source: SourceConfig;
  fetch_mode: FetchMode;
  fetched_at: string;           // ISO timestamp
  input: AdapterInput;
  limits?: {
    max_items?: number;
    max_pages?: number;
  };
}

type AdapterInput =
  | { kind: "websearch"; results: WebSearchResult[] }
  | { kind: "html"; url: string; html: string }
  | { kind: "json"; url: string; payload: unknown }
  | { kind: "snapshot"; url: string; text: string; html?: string };
```

Rules:

- the adapter must not assume a single fetch path forever
- the adapter should accept whichever fetch mode the scanner decided to use
- `input` is raw evidence, never pre-normalized business data

## Adapter Batch Result

```ts
interface AdapterBatchResult {
  adapter_key: string;
  contract_version: "tr-source-adapter/v1";
  source_name: string;
  fetched_at: string;
  items: NormalizedListingCandidate[];
  warnings: AdapterWarning[];
  errors: AdapterError[];
}
```

Rules:

- partial success is valid
- a batch may contain both items and warnings
- parser failures should be item-scoped where possible, not batch-fatal

## Shared Normalized Output Schema

Every adapter must emit the same item shape, even when many fields are `null`.

```ts
interface NormalizedListingCandidate {
  contract_version: "tr-listing-candidate/v1";

  source: {
    source_name: string;        // e.g. Kariyer.net, Company Careers
    source_type: string;        // aligned to tr-data-model source_type
    parser_key: string;
    adapter_family: AdapterFamily;
    source_url: string;         // page where the item was found
    apply_url: string;          // canonical application URL
    listing_url: string;        // if distinct from apply_url
    external_listing_id: string | null;
    locale: string | null;
    language_expected: string[] | null;
  };

  company: {
    raw_name: string;
    canonical_name: string;
    aliases: string[] | null;
  };

  listing: {
    title_raw: string;
    title: string;
    location_text: string | null;
    city: string | null;
    country_code: "TR";
    work_model: string;         // canonical enum or unknown
    seniority: string;          // canonical enum or unknown
    language: string;           // canonical enum or unknown
    employment_type: string;    // canonical enum or unknown
    compensation_text: string | null;
    posted_at: string | null;   // ISO timestamp when reliable, else null
    pipeline_status: "discovered";
  };

  content: {
    jd_raw: string | null;
    jd_clean: string | null;
    requirements: string | null;
    responsibilities: string | null;
    benefits: string | null;
  };

  dedup: {
    url_fingerprint: string | null;
    company_key: string | null;
    title_key: string | null;
    location_key: string | null;
    source_priority_hint: string | null;
    anti_duplication: Record<string, unknown> | null;
  };

  quality: {
    confidence_score: number;   // 0.000 - 1.000
    extraction_warnings: string[];
    expired_signal_detected: boolean;
  };

  provenance: {
    discovered_at: string;
    fetched_via: FetchMode;
    raw_input_ref: string | null;
    evidence_excerpt: string | null;
  };
}
```

## Field Rules

### Required fields

These must always be present:

- `source.source_name`
- `source.source_type`
- `source.parser_key`
- `source.adapter_family`
- `source.source_url`
- `source.apply_url`
- `company.raw_name`
- `company.canonical_name`
- `listing.title_raw`
- `listing.title`
- `listing.country_code`
- `listing.work_model`
- `listing.seniority`
- `listing.language`
- `listing.employment_type`
- `listing.pipeline_status`
- `quality.confidence_score`
- `quality.extraction_warnings`
- `quality.expired_signal_detected`
- `provenance.discovered_at`
- `provenance.fetched_via`

If a value is unknown, emit `unknown` or `null` according to the field type. Do not omit keys.

### Canonical enums

Adapters must emit enum values already normalized to the target spec for:

- `source.source_type`
- `listing.work_model`
- `listing.seniority`
- `listing.language`
- `listing.employment_type`

Those canonical values must come from [docs/tr-normalization-spec.md](/Users/furkan/Desktop/Proje/career-ops/docs/tr-normalization-spec.md).

### Raw vs normalized split

Adapters should preserve:

- `title_raw`
- `location_text`
- `compensation_text`
- `jd_raw`

Adapters should also emit normalized variants:

- `title`
- `city`
- `work_model`
- `seniority`
- `language`
- `employment_type`

### URL contract

Rules:

1. `apply_url` should be the canonical application endpoint when known.
2. `listing_url` may equal `apply_url`.
3. `source_url` is where the adapter saw the item.
4. `external_listing_id` should be emitted only when the source exposes a stable identifier.

## Warning and Error Contract

```ts
interface AdapterWarning {
  code: string;
  message: string;
  item_ref?: string | null;
}

interface AdapterError {
  code: string;
  message: string;
  fatal: boolean;
  item_ref?: string | null;
}
```

Recommended warning codes:

- `missing_location`
- `ambiguous_language`
- `weak_company_match`
- `list_page_only`
- `missing_external_id`
- `partial_jd`

Recommended error codes:

- `unsupported_input`
- `parse_failed`
- `blocked_by_source`
- `malformed_payload`
- `empty_result`

## Stability Rules

1. `parser_key` is stable once published.
2. Contract changes should be additive within `v1`.
3. Removing or renaming top-level output fields requires a new contract version.
4. Family-specific quirks must stay inside adapters, not leak into downstream consumers.
5. Shared normalization utilities must own canonical enum mapping, not each adapter.

## Maintainability Rules

1. Prefer one adapter per source pattern, not one adapter per employer, unless HTML shape is truly unique.
2. Use `custom_careers_hub` plus site-specific extractor profiles before creating many one-off adapters.
3. Keep adapter output flat enough for pipeline use, but preserve enough provenance to debug extraction failures.
4. Dedup hints should come from config and adapter output, not from hardcoded company-specific logic in the scanner.

## Minimal Example

```json
{
  "contract_version": "tr-listing-candidate/v1",
  "source": {
    "source_name": "Kariyer.net",
    "source_type": "job_board",
    "parser_key": "kariyernet_search",
    "adapter_family": "turkish_job_board",
    "source_url": "https://www.kariyer.net/is-ilani/...",
    "apply_url": "https://www.kariyer.net/is-ilani/...",
    "listing_url": "https://www.kariyer.net/is-ilani/...",
    "external_listing_id": "123456",
    "locale": "tr-TR",
    "language_expected": ["tr", "en"]
  },
  "company": {
    "raw_name": "Ornek Teknoloji A.S.",
    "canonical_name": "Ornek Teknoloji",
    "aliases": null
  },
  "listing": {
    "title_raw": "Kıdemli Veri Mühendisi",
    "title": "Kıdemli Veri Mühendisi",
    "location_text": "İstanbul / Hibrit",
    "city": "Istanbul",
    "country_code": "TR",
    "work_model": "hybrid",
    "seniority": "senior",
    "language": "tr_en",
    "employment_type": "full_time",
    "compensation_text": null,
    "posted_at": null,
    "pipeline_status": "discovered"
  },
  "content": {
    "jd_raw": null,
    "jd_clean": null,
    "requirements": null,
    "responsibilities": null,
    "benefits": null
  },
  "dedup": {
    "url_fingerprint": null,
    "company_key": "ornekteknoloji",
    "title_key": "kidemliverimuhendisi",
    "location_key": "istanbul",
    "source_priority_hint": "kariyer.net",
    "anti_duplication": {
      "canonical_source": "kariyer.net"
    }
  },
  "quality": {
    "confidence_score": 0.81,
    "extraction_warnings": [],
    "expired_signal_detected": false
  },
  "provenance": {
    "discovered_at": "2026-04-07T20:00:00Z",
    "fetched_via": "websearch_result",
    "raw_input_ref": null,
    "evidence_excerpt": "Kıdemli Veri Mühendisi @ Ornek Teknoloji"
  }
}
```

## Recommended Next Step

After this contract is accepted:

1. define shared normalization helpers that implement the enum mappings
2. define the adapter registry keyed by `parser_key`
3. add one thin parser per source family before adding per-site overrides
