# Turkey-Ready Bilingual CV Output Strategy

## Purpose

This document proposes a safe, additive architecture for bilingual ATS CV output in `career-ops`:

- Turkish ATS CV
- English ATS CV

It is based on the current PDF pipeline and explicitly avoids breaking existing PDF generation.

## Current Baseline

Today the repo already has a working HTML-to-PDF path:

1. `modes/pdf.md` defines the content-generation flow.
2. `templates/cv-template.html` provides one placeholder-based HTML template.
3. `generate-pdf.mjs` renders HTML with Playwright and applies ATS-safe Unicode cleanup.

Important current properties:

- the template already supports `{{LANG}}`
- the template uses `DM Sans` and `Space Grotesk` `latin-ext` fonts
- `generate-pdf.mjs` does not strip Turkish letters such as `ç, ğ, ı, İ, ö, ş, ü`
- the current generator contract is simple: `input.html + output.pdf + --format`

That baseline is good. The strategy should extend it, not replace it.

## Strategy Summary

Use one stable rendering pipeline and add a locale-aware template selection layer on top of it.

Recommended architecture:

1. keep `generate-pdf.mjs` unchanged as the renderer
2. keep `templates/cv-template.html` as the legacy/default template
3. add locale-specific templates additively:
   - `templates/cv-template.en.html`
   - `templates/cv-template.tr.html`
4. require all templates to support the same placeholder contract as the current template
5. choose output language before HTML generation, not inside the renderer

This keeps risk low:

- old flows still work
- new bilingual flows stay explicit
- the PDF generator remains template-agnostic

## Proposed Template Architecture

## Option A: Recommended

Add full locale templates with the same placeholder contract:

- `templates/cv-template.html`
  Legacy default and fallback.
- `templates/cv-template.en.html`
  Explicit English ATS template.
- `templates/cv-template.tr.html`
  Explicit Turkish ATS template.

Rules:

- `cv-template.html` remains valid and unchanged for backward compatibility
- `cv-template.en.html` and `cv-template.tr.html` must accept the same placeholders as `cv-template.html`
- visual differences should stay minimal unless a real Turkish layout need appears

Why this is the safest option:

- simple runtime decision
- no template inheritance engine needed
- no renderer change required
- existing prompt and HTML-generation logic can migrate gradually

## Option B: Later

If template duplication becomes expensive, move to:

- one base template
- one locale label/content dictionary

Do not start there. It increases abstraction before the bilingual flow is proven.

## Template Selection Rules

Template selection should be deterministic and conservative.

Recommended precedence:

1. explicit user override
2. explicit role/application requirement
3. JD language
4. profile language preference
5. safe default

### 1. Explicit user override

If the user says:

- "generate Turkish CV"
- "generate English CV"
- "use English CV even for this role"

that must win.

### 2. Explicit role/application requirement

If the job post or apply form clearly requires:

- English CV
- CV in Turkish

that should override JD language heuristics.

### 3. JD language

Recommended rule:

- Turkish JD -> prefer Turkish ATS CV
- English JD -> prefer English ATS CV

Exception:

- if the JD is Turkish but repeatedly requests English application materials, prefer English ATS CV

### 4. Profile language preference

This should align with the proposed profile direction in [docs/tr-profile-schema.md](/Users/furkan/Desktop/Proje/career-ops/docs/tr-profile-schema.md).

Recommended optional profile block:

```yaml
language:
  cv_language_preferences:
    default: "en"
    supported: ["tr", "en"]
    auto_select_by_posting_language: true
    notes: "Use Turkish CV for Turkish-language local roles; English CV for international roles."
```

Recommended fallback behavior:

- if `auto_select_by_posting_language: true`, use JD language unless overridden
- otherwise use `default`

### 5. Safe default

If nothing is explicit:

- default to English ATS CV

Reason:

- current repo behavior already defaults to English-like ATS section naming
- English remains the safer fallback for cross-border applications

## Language Switching Rules

Language switching should affect candidate-facing CV text, not the truth source.

`cv.md` remains the source of truth. The generated CV language is a projection.

### What should switch with language

- section headings
- professional summary
- connective phrasing
- project descriptions
- education/certification labels
- generated competency labels when they are not fixed product or tech names

### What should usually not be translated

- company names
- product names
- library/framework/tool names
- standard technology terms when the JD uses English
- exact ATS keywords from the JD

Recommended ATS rule:

- if the JD uses English technical terms, keep those exact terms in the CV even inside a Turkish CV

Example:

- keep `Python`, `Airflow`, `MLOps`, `A/B testing`, `feature store`
- do not force awkward translations that reduce keyword match

### Turkish CV rule

A Turkish ATS CV should still preserve internationally standard technical vocabulary where that is how recruiters and ATS systems search.

### English CV rule

An English ATS CV for a Turkey-based candidate can still retain Turkey-specific employer/location names without translation.

## Naming Conventions

Use additive naming, not replacement naming.

## Recommended output files

New bilingual flow should prefer:

- `output/cv-candidate-{company-slug}-tr-{YYYY-MM-DD}.pdf`
- `output/cv-candidate-{company-slug}-en-{YYYY-MM-DD}.pdf`

Temporary HTML:

- `/tmp/cv-candidate-{company-slug}-tr.html`
- `/tmp/cv-candidate-{company-slug}-en.html`

## Compatibility rule

The current naming must remain accepted:

- `output/cv-candidate-{company-slug}-{YYYY-MM-DD}.pdf`

Recommended interpretation:

- legacy flow: continue producing the old filename
- bilingual-aware flow: produce the language-suffixed filename

This avoids breaking old automation or user expectations while making bilingual artifacts unambiguous.

## Template Selection Naming

Recommended explicit mapping:

- language `en` -> `templates/cv-template.en.html`
- language `tr` -> `templates/cv-template.tr.html`
- fallback -> `templates/cv-template.html`

## Validation Concerns

## 1. Turkish character support

Critical characters:

- `ç`
- `ğ`
- `ı`
- `İ`
- `ö`
- `ş`
- `ü`

Current risk assessment:

- `generate-pdf.mjs` does not normalize these away
- current fonts include `latin-ext`, which is the correct direction

Validation requirement:

- add a Turkish glyph fixture and render a PDF containing all core Turkish characters in headings, body text, bullet lists, and contact row

Minimum fixture content should include:

- `İstanbul, İzmir, Isparta, Çankaya, Şişli, Göktürk`
- `Kıdemli Yazılım Mühendisi`
- `Ölçüm, doğrulama, iş akışı, çözümler`

## 2. `lang` attribute correctness

This is critical for Turkish casing behavior.

Current template already supports `{{LANG}}`.

Rule:

- Turkish HTML must render with `lang="tr"`
- English HTML must render with `lang="en"`

Why it matters:

- CSS `text-transform: uppercase` on section titles can behave incorrectly for Turkish if the language context is wrong
- Turkish dotted/dotless `i` is the highest-risk case

## 3. Layout overflow

Turkish text can be longer than English in:

- section labels
- summary sentences
- competency tags
- location strings
- certification titles

Highest-risk zones in the current template:

- `.contact-row`
- `.section-title`
- `.competency-tag`
- `.job-header`
- `.edu-header`

Validation rules:

1. render both `tr` and `en` outputs
2. test with long Turkish city/location strings
3. test with long Turkish section labels
4. test with 1-page and 2-page CVs
5. compare overflow behavior on both A4 and Letter outputs

Recommended overflow policy:

- allow wrap in competency and contact rows
- avoid shrinking font size dynamically unless necessary
- prefer content-budget controls in the prompt before CSS hacks

## 4. ATS-safe punctuation normalization

Current generator replaces:

- em dash
- en dash
- smart quotes
- ellipsis
- zero-width characters
- non-breaking spaces

This is good and should remain unchanged.

Validation concern:

- ensure normalization does not damage Turkish text copied from rich sources

Specifically verify:

- apostrophes in Turkish writing
- copied text from Word/LinkedIn
- mixed English/Turkish punctuation

## 5. Keyword integrity across languages

The Turkish CV must not lose ATS signal when the JD is full of English technical terms.

Validation rule:

- compare extracted JD keywords with final CV text and verify the important technical terms remain present verbatim when they were present in the JD

Examples:

- `Machine Learning`
- `feature engineering`
- `MLOps`
- `data pipeline`
- `A/B testing`

## 6. Paper format interaction

Current rule in `modes/pdf.md`:

- US/Canada -> `letter`
- rest of world -> `a4`

Recommended bilingual rule:

- language does not choose paper size
- destination market chooses paper size

Examples:

- English CV for US company -> `letter`
- English CV for Turkey or EMEA role -> `a4`
- Turkish CV for Turkey role -> `a4`

## Safe Runtime Architecture

Recommended future flow:

1. detect desired CV language
2. choose template path
3. choose section label set
4. generate language-specific content
5. render HTML with the existing placeholder contract
6. pass HTML to `generate-pdf.mjs`
7. run post-render validation checks

Important boundary:

- language choice and content generation happen before `generate-pdf.mjs`
- `generate-pdf.mjs` stays a pure renderer

## Recommended Placeholder Contract

Do not create different placeholder names per language.

All templates should keep the same placeholders:

- `{{LANG}}`
- `{{PAGE_WIDTH}}`
- `{{NAME}}`
- `{{EMAIL}}`
- `{{LINKEDIN_URL}}`
- `{{LINKEDIN_DISPLAY}}`
- `{{PORTFOLIO_URL}}`
- `{{PORTFOLIO_DISPLAY}}`
- `{{LOCATION}}`
- `{{SECTION_SUMMARY}}`
- `{{SUMMARY_TEXT}}`
- `{{SECTION_COMPETENCIES}}`
- `{{COMPETENCIES}}`
- `{{SECTION_EXPERIENCE}}`
- `{{EXPERIENCE}}`
- `{{SECTION_PROJECTS}}`
- `{{PROJECTS}}`
- `{{SECTION_EDUCATION}}`
- `{{EDUCATION}}`
- `{{SECTION_CERTIFICATIONS}}`
- `{{CERTIFICATIONS}}`
- `{{SECTION_SKILLS}}`
- `{{SKILLS}}`

This is the main compatibility guarantee.

## Recommended Validation Checklist

Before enabling bilingual output in production, validate:

1. English legacy generation still works with `templates/cv-template.html`.
2. Turkish template renders all Turkish glyphs correctly.
3. `lang="tr"` fixes Turkish uppercase behavior in headings.
4. Long Turkish labels do not overflow key layout regions.
5. A4 and Letter both render cleanly.
6. ATS normalization does not alter Turkish letters.
7. Language-suffixed output names do not collide with legacy output names.

## Recommended Rollout

### Phase 1

- keep current template as default
- add `cv-template.tr.html`
- use shared placeholder contract
- produce `-tr-` file naming only for the new Turkey flow

### Phase 2

- add `cv-template.en.html` for explicit English parity
- introduce explicit template selection logic
- add glyph and overflow regression fixtures

### Phase 3

- add profile-driven language selection
- add preflight validation for language, glyph safety, and overflow-risk warnings

## Final Recommendation

The safest architecture is:

- one unchanged renderer
- one legacy template kept in place
- two additive locale templates
- one shared placeholder contract
- explicit language-based naming
- validation focused on Turkish casing, glyph coverage, and overflow

That gives Turkey-ready bilingual support without destabilizing the existing PDF flow.
