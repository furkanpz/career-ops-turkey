# Turkey Profile Schema

## Scope

This document defines a Turkey-ready, backward-compatible profile schema for `career-ops`.

Deliverables covered here:

- inspection of the current profile example
- inventory of where profile values are used today
- an additive Turkey-oriented schema design
- validation notes for future `doctor` / `cv-sync-check` / verification scripts

Non-goals:

- no runtime loader rewrite in this step
- no parser implementation in this step
- no breaking changes to existing `config/profile.yml` consumers

## Current State

### Existing example profile

The current base example in `config/profile.example.yml` has these top-level sections:

- `candidate`
- `target_roles`
- `narrative`
- `compensation`
- `location`

Current notable fields:

- `candidate.full_name`
- `candidate.email`
- `candidate.phone`
- `candidate.location`
- `candidate.linkedin`
- `candidate.portfolio_url`
- `candidate.github`
- `candidate.twitter`
- `candidate.canva_resume_design_id` optional
- `target_roles.primary`
- `target_roles.archetypes`
- `narrative.headline`
- `narrative.exit_story`
- `narrative.superpowers`
- `narrative.proof_points`
- `narrative.dashboard` optional
- `compensation.target_range`
- `compensation.currency`
- `compensation.minimum`
- `compensation.location_flexibility`
- `location.country`
- `location.city`
- `location.timezone`
- `location.visa_status`
- `location.onsite_availability` optional

### Where profile values are used today

There is no central structured YAML loader in the codebase yet. Today, profile usage is mostly one of these patterns:

1. Presence checks
2. String-level sanity checks
3. Human/agent instructions that tell the agent to read values from `profile.yml`
4. Template placeholder sourcing for PDF/report generation

### Direct technical checks

| File | Current usage |
|---|---|
| `doctor.mjs` | Only checks that `config/profile.yml` exists |
| `cv-sync-check.mjs` | Warns if `full_name`, `email`, or `location` appear missing or still match example placeholders |

Important implication:

- New Turkey-specific fields must remain optional.
- Backward compatibility depends on preserving current keys, especially `full_name`, `email`, and `candidate.location`.

### Instructional / prompt consumers

These files explicitly instruct the agent to read profile values:

| File | Current usage |
|---|---|
| `CLAUDE.md` | onboarding, customization guidance, language mode conventions |
| `modes/_shared.md` | profile is always a source of truth for identity and targets |
| `modes/_profile.template.md` | exit story, comp targets, location policy |
| `modes/pdf.md` | reads name, email, LinkedIn, portfolio, location, Canva design id |
| `batch/batch-prompt.md` | reads candidate identity and PDF placeholders from profile |
| `modes/de/_shared.md` | reads exit story, proof points, comp range, location policy |
| `modes/fr/_shared.md` | same pattern for French modes |
| `modes/de/bewerben.md` | salary expectation guidance from profile |
| `modes/fr/postuler.md` | salary expectation guidance from profile |

### Docs that define or describe profile expectations

| File | Current usage |
|---|---|
| `docs/SETUP.md` | tells users to fill profile with personal details |
| `docs/CUSTOMIZATION.md` | documents existing profile sections |
| `README.md` | setup instructions point to `config/profile.example.yml` |

### Output template consumers

| File | Current usage |
|---|---|
| `templates/cv-template.html` | placeholder targets for email, LinkedIn, and portfolio links |

## Design Goals

1. Preserve current behavior for existing users.
2. Keep the current top-level schema valid.
3. Add Turkey-ready fields as optional extensions.
4. Support both Turkey-local compensation and cross-border compensation.
5. Make job filtering and automation preferences explicit instead of buried in free text.

## Backward-Compatible Design

### Compatibility contract

The following existing fields stay valid and should not be removed:

- `candidate.full_name`
- `candidate.email`
- `candidate.location`
- `compensation.target_range`
- `compensation.currency`
- `compensation.minimum`
- `compensation.location_flexibility`
- `location.country`
- `location.city`
- `location.timezone`
- `location.visa_status`

Future tools may prefer richer structured fields when present, but they must fall back to the legacy fields above.

### Recommended schema

Keep these existing top-level sections:

- `candidate`
- `target_roles`
- `narrative`
- `compensation`
- `location`

Add these optional top-level sections:

- `language`
- `location_preferences`
- `constraints`
- `automation`

Add this optional nested section:

- `compensation.salary_preferences`

## Proposed schema

### `candidate`

Unchanged. Remains the source of identity and public links.

Required in practice for current repo behavior:

- `full_name`
- `email`
- `candidate.location`

### `target_roles`

Unchanged. Existing archetype-driven evaluation depends on this remaining human-readable.

### `narrative`

Unchanged. Existing prompts already use this as the framing layer.

### `compensation`

Keep the legacy fields:

- `target_range`
- `currency`
- `minimum`
- `location_flexibility`

Add optional structured currency-specific preferences:

```yaml
compensation:
  target_range: "TRY 1,800,000-2,400,000 gross annual"
  currency: "TRY"
  minimum: "TRY 1,500,000 gross annual"
  location_flexibility: "Istanbul preferred, remote-first"
  salary_preferences:
    TRY:
      target_min: 1800000
      target_max: 2400000
      minimum: 1500000
      period: "gross_annual"
    EUR:
      target_min: 45000
      target_max: 65000
      minimum: 40000
      period: "gross_annual"
    USD:
      target_min: 55000
      target_max: 85000
      minimum: 50000
      period: "gross_annual"
```

Rationale:

- current prompts already reference `target_range` and `minimum`
- Turkey workflows need structured salary values in `TRY`, `EUR`, and `USD`
- keeping both avoids breaking old prompts and future parsers can move to the structured block gradually

### `location`

Keep the current fields:

- `country`
- `city`
- `timezone`
- `visa_status`
- `onsite_availability` optional

This remains the concise summary block for current prompts.

### `language`

New optional section.

Recommended shape:

```yaml
language:
  modes_dir: "modes/tr"
  cv_preferences:
    default: "en"
    supported: ["tr", "en", "es"]
    by_listing_language:
      tr: "tr"
      en: "en"
```

Purpose:

- `modes_dir` aligns with the existing `modes/de` and `modes/fr` convention already documented in the repo
- `cv_preferences` makes CV language behavior explicit for Turkish and English listings

### `location_preferences`

New optional section.

Recommended shape:

```yaml
location_preferences:
  preferred_cities:
    - "Istanbul"
    - "Ankara"
    - "Izmir"
  relocation_flexibility:
    willing: true
    scope: "within_turkey"
    notes: "Relocation possible for the right role."
  work_model_preference:
    priority_order: ["remote", "hybrid", "onsite"]
    acceptable: ["remote", "hybrid", "onsite"]
```

This covers the required additions:

- preferred cities
- relocation flexibility
- remote/hybrid/onsite preference

Canonical `relocation_flexibility.scope` values:

- `none`
- `same_city_only`
- `within_turkey`
- `international`
- `case_by_case`

Canonical `work_model_preference` values:

- `remote`
- `hybrid`
- `onsite`

### `constraints`

New optional section.

Recommended shape:

```yaml
constraints:
  must_haves:
    - "Senior-level ownership"
    - "Competitive compensation"
  deal_breakers:
    - "5 days/week mandatory onsite"
    - "Unpaid trial project"
```

Purpose:

- make apply/no-apply decisions explicit
- support future scoring penalties and filtering

### `automation`

New optional section.

Recommended shape:

```yaml
automation:
  application:
    auto_generate_pdf: true
    auto_generate_cover_letter: true
    auto_draft_form_answers: true
    auto_fill_easy_fields: false
    require_manual_review_before_submit: true
    follow_up_outreach: "manual_first"
```

This covers application automation preferences without violating the repo's current human-in-the-loop policy.

Canonical `follow_up_outreach` values:

- `disabled`
- `manual_first`
- `assisted`
- `auto_draft_only`

## Recommended Full Turkey Schema

This is a locale-aware starter example, not a recommended default candidate persona.
Users should replace role targets, narrative, and compensation with their own data.

```yaml
candidate:
  full_name: "Deniz Kaya"
  email: "deniz@example.com"
  phone: "+90 555 123 45 67"
  location: "Istanbul, Turkiye"
  linkedin: "linkedin.com/in/denizkaya"
  portfolio_url: "https://denizkaya.dev"
  github: "github.com/denizkaya"

target_roles:
  primary:
    - "Software Engineer"
    - "Product Manager"
  archetypes:
    - name: "Software / Backend / Platform"
      level: "Senior/Staff"
      fit: "primary"
    - name: "Product / Program"
      level: "Mid/Senior"
      fit: "secondary"

narrative:
  headline: "Technology professional with experience turning ambiguous problems into shipped outcomes"
  exit_story: "Looking for roles where strong execution, cross-functional delivery, and technical judgment matter."
  superpowers:
    - "Structured problem solving"
    - "Cross-functional execution"

compensation:
  target_range: "TRY 1,200,000-1,800,000 gross annual"
  currency: "TRY"
  minimum: "TRY 1,000,000 gross annual"
  location_flexibility: "Remote-first, Istanbul preferred"
  salary_preferences:
    TRY:
      target_min: 1200000
      target_max: 1800000
      minimum: 1000000
      period: "gross_annual"
    EUR:
      target_min: 35000
      target_max: 55000
      minimum: 30000
      period: "gross_annual"
    USD:
      target_min: 40000
      target_max: 70000
      minimum: 35000
      period: "gross_annual"

location:
  country: "Turkiye"
  city: "Istanbul"
  timezone: "Europe/Istanbul"
  visa_status: "Turkiye citizen"

language:
  cv_preferences:
    default: "en"
    supported: ["tr", "en", "es"]
    by_listing_language:
      tr: "tr"
      en: "en"

location_preferences:
  preferred_cities: ["Istanbul", "Ankara", "Izmir"]
  relocation_flexibility:
    willing: true
    scope: "within_turkey"
  work_model_preference:
    priority_order: ["remote", "hybrid", "onsite"]
    acceptable: ["remote", "hybrid", "onsite"]

constraints:
  must_haves:
    - "Senior-level ownership"
  deal_breakers:
    - "5 days/week mandatory onsite"

automation:
  application:
    auto_generate_pdf: true
    auto_generate_cover_letter: true
    auto_draft_form_answers: true
    auto_fill_easy_fields: false
    require_manual_review_before_submit: true
    follow_up_outreach: "manual_first"
```

## Validation Notes For Future `doctor` / `cv-sync-check` / Verify Scripts

These checks are recommendations for future implementation. They should be additive and warning-first unless a field is already required today.

### Keep current required checks unchanged

Do not tighten these yet:

- `config/profile.yml` must exist
- `full_name` should exist
- `email` should exist
- `candidate.location` should exist

This preserves current loader behavior and onboarding flow.

### Recommended future warnings

#### `compensation.salary_preferences`

Warn if:

- a currency key is not one of `TRY`, `EUR`, `USD`
- `target_min > target_max`
- `minimum > target_min`
- `period` is missing or not one of:
  - `gross_annual`
  - `net_annual`
  - `gross_monthly`
  - `net_monthly`

#### `language.cv_preferences`

Warn if:

- `default` is not included in `supported`
- `supported` contains unsupported values
- `by_listing_language` maps to values outside `supported`

Recommended canonical language codes for this block:

- `tr`
- `en`
- `de`
- `fr`

#### `location_preferences.preferred_cities`

Warn if:

- the field exists but is not an array of strings
- entries are duplicated after case-insensitive normalization
- all entries are empty strings

#### `location_preferences.relocation_flexibility`

Warn if:

- `willing` is not boolean
- `scope` is outside the allowed enum

#### `location_preferences.work_model_preference`

Warn if:

- `priority_order` contains duplicates
- `priority_order` contains values outside `remote`, `hybrid`, `onsite`
- `acceptable` is empty
- `acceptable` contains a value not present in the canonical work-model enum

#### `constraints`

Warn if:

- `must_haves` is not an array of strings
- `deal_breakers` is not an array of strings
- the same normalized phrase appears in both arrays

#### `automation.application`

Warn if:

- `require_manual_review_before_submit` is explicitly `false`
- `follow_up_outreach` is outside the allowed enum

Rationale:

- the repo's current policy explicitly requires human review before submission
- future automation can assist, but it should not silently bypass that control

### Suggested implementation order for future validators

1. Extend `cv-sync-check.mjs` with warning-only checks for new optional fields.
2. Keep `doctor.mjs` limited to existence/readiness checks unless a true setup dependency is introduced.
3. Add deeper semantic profile validation to a dedicated future script rather than overloading `verify-pipeline.mjs`, which is currently tracker-focused.

## Decision Summary

The recommended Turkey-ready profile schema is:

- additive
- optional-field-first
- compatible with current prompts and checks
- explicit about Turkish market preferences without forcing a loader rewrite

Use `config/profile.tr.example.yml` as the reference starter template.
