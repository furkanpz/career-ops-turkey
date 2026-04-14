# Turkey Validation Plan

This document is an active validation checklist, but any inline sample candidate or sample listing
should be treated as placeholder data only. It does not define a default user persona.

## Purpose

This plan defines the minimum practical validation required before treating the Turkey-localized surface as release-ready.

It is intentionally conservative:

- prefer checks that can be run in this repo today
- separate automated checks from manual QA where no runtime exists yet
- use concrete pass/fail criteria

## Test Strategy

Run write-heavy checks in a disposable working copy, not in the user's real tracker data.

Recommended setup:

```bash
tmpdir="$(mktemp -d)"
rsync -a --exclude '.git' --exclude 'node_modules' ./ "$tmpdir/"
cd "$tmpdir"
npm install
```

If `node_modules/` already exists locally and you want a faster copy:

```bash
tmpdir="$(mktemp -d)"
rsync -a --exclude '.git' ./ "$tmpdir/"
cd "$tmpdir"
```

## Global Gates

Run these first on every Turkey-localization change set:

```bash
node test-all.mjs --quick
npm run doctor
```

Pass:

- `node test-all.mjs --quick` exits `0`
- `npm run doctor` exits `0`

Fail:

- any syntax, path, contract, or setup check fails

These are not Turkey-specific, but they are the fastest signal that the branch is not merge-safe.

## 1. Profile Loading

### Unit

#### PL-U1: TR example profile preserves legacy required keys

Command:

```bash
rg -n "full_name|email|location|target_range|currency|minimum|location_flexibility|timezone|visa_status" config/profile.tr.example.yml
```

Pass:

- all legacy keys required by current prompts and checks are present
- the TR additions are additive, not replacements

Fail:

- any legacy key is missing or renamed

#### PL-U2: Setup scripts accept the TR example profile

Setup:

```bash
cp config/profile.tr.example.yml config/profile.yml
cat > cv.md <<'EOF'
# Deniz Kaya

Technology professional with hands-on delivery experience across software, operations, and product-adjacent
work. Comfortable with Turkish and English application flows. Looking for roles that match the user's own
targets after `config/profile.yml` and `modes/_profile.md` are customized.
EOF
```

Command:

```bash
npm run doctor
npm run sync-check
```

Pass:

- `npm run doctor` exits `0`
- `npm run sync-check` exits `0`
- no profile-related error is printed

Fail:

- either script exits non-zero because of `config/profile.yml`
- the TR example breaks required-field detection

### Integration

#### PL-I1: TR profile can replace the default starter profile without changing current setup flow

Setup:

```bash
rm -f config/profile.yml
cp config/profile.tr.example.yml config/profile.yml
```

Command:

```bash
npm run doctor
node test-all.mjs --quick
```

Pass:

- setup still works with `config/profile.yml` copied from the TR example
- no repo-level test fails because of the TR profile file itself

Fail:

- a user following the normal setup flow would get a broken repo state

### Manual QA

#### PL-M1: Backward-compatibility review

Review `config/profile.tr.example.yml` manually.

Pass:

- existing top-level sections still exist: `candidate`, `target_roles`, `narrative`, `compensation`, `location`
- new sections are clearly optional
- the file still reads like a valid starter template for today's repo, not a future-only schema

Fail:

- the template assumes a runtime loader that does not exist yet
- the template implies new fields are required when current scripts do not support that

## 2. Portal Config

### Unit

#### PC-U1: TR portal template keeps the current scanner contract shape

Command:

```bash
rg -n "^(title_filter|search_queries|tracked_companies):" templates/portals.tr.example.yml
```

Pass:

- all three top-level keys appear exactly once

Fail:

- any top-level key is missing or renamed

#### PC-U2: TR portal template adds metadata additively

Command:

```bash
rg -n "adapter_family:|parser_key:|locale:|language:|anti_duplication:" templates/portals.tr.example.yml
```

Pass:

- metadata exists only as extra sibling fields
- existing keys such as `query`, `careers_url`, `scan_method`, and `scan_query` remain intact where expected

Fail:

- metadata replaces existing required keys
- entries stop looking like the base `portals.example.yml` structure

### Integration

#### PC-I1: TR portal template can be installed as `portals.yml` without breaking setup

Setup:

```bash
cp templates/portals.tr.example.yml portals.yml
```

Command:

```bash
npm run doctor
node test-all.mjs --quick
```

Pass:

- `portals.yml` is accepted by the current setup flow
- no repo-level check fails because of the TR portal template itself

Fail:

- the file cannot be used as a drop-in replacement starter config

### Manual QA

#### PC-M1: High-signal portal sampling

Manually inspect one entry from each source family:

- one Turkish job board
- one global ATS source
- one direct company careers source

Pass:

- every `tracked_companies` entry has `careers_url`
- sources that rely on search have `query` or `scan_query`
- metadata values match the intended meaning and do not contradict the normalized model

Fail:

- missing `careers_url` on tracked companies
- EMEA-wide entries are mislabeled as Turkey-only without explanation
- config metadata uses enum names that conflict with downstream docs

## 3. Normalization

## Reality Check

Turkey listing normalization now has a runtime implementation in `tr-listing-normalizer.mjs` and an additive user-layer sidecar at `data/tr-listings.jsonl`.

Validation must cover:

- contract consistency checks
- fixture-based QA against the normalization spec
- sidecar merge/upsert behavior keyed by canonical URL
- dashboard fallback order: sidecar first, then note tags, then report metadata

Any future enum expansion must update the normalizer, scanner fixtures, dashboard parser tests, and this validation plan in the same change.

### Unit

#### NM-U1: Enum consistency review across normalization docs

Command:

```bash
rg -n "adapter_family|source_type|language|pipeline_status|country_code|region_scope" docs/tr-normalization-spec.md docs/tr-data-model.md docs/tr-source-adapter-contract.md templates/portals.tr.example.yml
```

Pass:

- `adapter_family` is used only for config/routing metadata
- `source_type` is used only for normalized output semantics
- tracker-safe statuses are clearly separated from richer listing-layer statuses
- `country_code` assumptions do not contradict source scope
- `region_scope` is available for EMEA/global eligibility cases

Fail:

- `source_type` means config routing in one file and normalized output in another without an explicit mapping layer
- `pipeline_status` values intended only for listing discovery can leak into `applications.md`

### Integration

#### NM-I1: Manual fixture walk-through against the spec

Use this fixture table during review:

| Raw input | Expected canonical result |
|---|---|
| `Maslak / Istanbul - Hibrit` | `city=Istanbul`, `work_model=hybrid` |
| `Remote - Turkey` | `city=null`, `work_model=remote` |
| `Uzman Yardimcisi` | `seniority=junior` |
| `Turkce ve Ingilizce` | `language=tr_en` |
| `Tam zamanli sozlesmeli` | `employment_type=contract` |
| `Turkey`, `Türkiye`, `TR` in location | not copied into `city` |

Pass:

- every mapping is deterministic and conservative
- ambiguous values stay `unspecified` or `null`
- raw text is preserved where the spec says to preserve it

Fail:

- mappings guess beyond explicit evidence
- location or language values are over-normalized
- tracker-only semantics are mixed into listing normalization

### Manual QA

#### NM-M1: Unspecified-beats-guessed review

Review ambiguous cases such as:

- mixed `remote/hybrid`
- cityless Turkey-wide remote roles
- English UI with Turkish working-language requirement

Pass:

- the proposed Turkey behavior prefers `unspecified` over weak inference

Fail:

- the localization layer invents certainty to improve filtering or scoring

## 4. Scoring

## Reality Check

There is no standalone scoring engine in the repo today.

Turkey scoring validation is therefore mostly a prompt/output-contract QA problem:

- `modes/tr/teklif.md`
- `docs/tr-evaluation-output-spec.md`
- `docs/tr-scoring-framework.md`

### Unit

#### SC-U1: Required TR output markers are present

Command:

```bash
rg -n "Global Score|Red Flag Cap|Final Score|Confidence|Recommendation Category|Borderline|Strengths|Risks|Recommendation" modes/tr/teklif.md docs/tr-evaluation-output-spec.md
```

Pass:

- all required score and recommendation markers appear in both the mode prompt and the output spec

Fail:

- required score metadata is missing, renamed, or only documented in one place

#### SC-U2: Parser-safe report header markers are preserved

Command:

```bash
rg -n "\\*\\*Date:\\*\\*|\\*\\*Arquetipo:\\*\\*|\\*\\*Score:\\*\\*|\\*\\*URL:\\*\\*|\\*\\*PDF:\\*\\*" modes/tr/teklif.md docs/tr-evaluation-output-spec.md
```

Pass:

- the TR report header keeps machine-stable keys

Fail:

- header keys are localized or renamed in a way that would break current downstream parsing

### Integration

#### SC-I1: Strong / borderline / no-go scoring fixtures

Prepare three TR evaluation reports manually or via the agent:

- strong fit
- borderline fit
- no-go role with a critical red flag

Validate the outputs against the framework.

Pass:

- strong case: may reach `hemen_basvur` only if confidence is not low and no major/critical red flag exists
- borderline case: uses `sinirda_once_dogrula`
- no-go case: uses `basvurma`
- final recommendation matches the documented thresholds and caps

Fail:

- a low-confidence or red-flagged case still gets an aggressive recommendation
- borderline logic is ignored

### Manual QA

#### SC-M1: Human sanity review of recommendation conservatism

Review at least 3 TR reports.

Pass:

- strengths are evidence-based
- risks are explicit
- recommendation protects both candidate time and recruiter time

Fail:

- generic praise replaces evidence
- salary or company confidence is overstated
- the output pushes "apply" on weak or unknown evidence

## 5. Tracker Writes

### Unit

#### TW-U1: Merge script dry-run accepts tracker-safe TSV rows

Setup:

```bash
mkdir -p data reports batch/tracker-additions
cat > data/applications.md <<'EOF'
| # | Fecha | Empresa | Rol | Score | Estado | PDF | Report | Notas |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-04-01 | Acme | Data Engineer | 4.0/5 | EVALUATED | ❌ | [001](reports/001-acme-2026-04-01.md) | seed |
EOF
cat > reports/001-acme-2026-04-01.md <<'EOF'
# Evaluación: Acme — Data Engineer

**Fecha:** 2026-04-01
**Arquetipo:** Data
**Score:** 4.0/5
**PDF:** pending
EOF
cat > batch/tracker-additions/002.tsv <<'EOF'
2	2026-04-07	Peak	Software Engineer	EVALUATED	4.3/5	❌	[002](reports/002-peak-2026-04-07.md)	TR fixture
EOF
cat > reports/002-peak-2026-04-07.md <<'EOF'
# Evaluación: Peak — Software Engineer

**Fecha:** 2026-04-07
**Arquetipo:** Software / Backend / Platform
**Score:** 4.3/5
**PDF:** pending
EOF
```

Command:

```bash
node merge-tracker.mjs --dry-run
```

Pass:

- the TSV row is parsed
- no crash occurs
- the merge preview treats the row as a new valid tracker entry

Fail:

- the TSV is rejected
- status or score columns are misread

### Integration

#### TW-I1: Merge plus verify end-to-end

Use the same fixture as `TW-U1`.

Command:

```bash
node merge-tracker.mjs --verify
node verify-pipeline.mjs
```

Pass:

- merge completes
- `verify-pipeline.mjs` exits `0`
- `data/applications.md` contains the expected new row
- report link stays valid

Fail:

- merge writes malformed rows
- verification fails after merge

#### TW-I2: Duplicate update behavior

Setup:

```bash
rm -rf batch/tracker-additions
mkdir -p batch/tracker-additions
cat > batch/tracker-additions/003.tsv <<'EOF'
3	2026-04-08	Acme	Data Engineer	EVALUATED	4.6/5	✅	[003](reports/003-acme-2026-04-08.md)	Re-eval
EOF
cat > reports/003-acme-2026-04-08.md <<'EOF'
# Evaluación: Acme — Data Engineer

**Fecha:** 2026-04-08
**Arquetipo:** Data
**Score:** 4.6/5
**PDF:** output/cv-candidate-acme-en-2026-04-08.pdf
EOF
```

Command:

```bash
node merge-tracker.mjs --verify
node verify-pipeline.mjs
```

Pass:

- no duplicate row is created for the same company/role
- the existing row is updated with the newer report and score context

Fail:

- the merge creates duplicate tracker history for the same role when it should update in place

### Manual QA

#### TW-M1: Human review of written tracker rows

Review the final markdown row.

Pass:

- score format is still `X.X/5`
- status is a tracker-safe value
- report link is relative and valid
- notes remain readable after merge or re-eval

Fail:

- markdown structure is corrupted
- tracker row mixes listing-layer metadata into the status column

## 6. Status Normalization

### Unit

#### SN-U1: Current alias coverage still works

Setup:

```bash
cat > data/applications.md <<'EOF'
| # | Fecha | Empresa | Rol | Score | Estado | PDF | Report | Notas |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-04-01 | Acme | Data Engineer | **4.0/5** | enviada | ❌ | [001](reports/001-acme-2026-04-01.md) | |
| 2 | 2026-04-02 | Peak | Backend Engineer | 3.9/5 | rechazada 2026-04-05 | ❌ | [002](reports/002-peak-2026-04-02.md) | |
| 3 | 2026-04-03 | Trendyol | Platform Engineer | 4.4/5 | repost #77 | ❌ | [003](reports/003-trendyol-2026-04-03.md) | |
EOF
```

Command:

```bash
node normalize-statuses.mjs --dry-run
```

Pass:

- `enviada` maps to `APPLIED`
- dated `rechazada` maps to `REJECTED`
- `repost #77` maps to `DISCARDED` and is marked for note preservation

Fail:

- supported aliases are not normalized
- score cleanup or note preservation breaks

### Integration

#### SN-I1: Unknown Turkish statuses must not silently pass

Setup:

```bash
cat > data/applications.md <<'EOF'
| # | Fecha | Empresa | Rol | Score | Estado | PDF | Report | Notas |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-04-01 | Papara | Data Engineer | 4.2/5 | Yeni | ❌ | [001](reports/001-papara-2026-04-01.md) | |
| 2 | 2026-04-02 | iyzico | Backend Engineer | 4.0/5 | Inceleniyor | ❌ | [002](reports/002-iyzico-2026-04-02.md) | |
EOF
```

Command:

```bash
node normalize-statuses.mjs --dry-run
node verify-pipeline.mjs
```

Pass:

- these rows are treated as invalid for today's tracker contract
- release is blocked until alias support or tracker-boundary rules are implemented

Fail:

- Turkish workflow statuses silently pass as tracker-safe
- unknown values are rewritten without an explicit policy decision

This is a conservative gate on purpose.

### Manual QA

#### SN-M1: Tracker-status boundary review

Review the Turkey status design against the tracker scripts.

Pass:

- only tracker-safe statuses are written to `applications.md`
- richer workflow states stay outside the tracker column unless explicit alias support exists

Fail:

- listing or readiness states are written directly into tracker rows

## 7. PDF Generation

### Unit

#### PDF-U1: Template helper behavior

Command:

```bash
node --check cv-template-utils.mjs
node cv-template-utils.mjs --lang=tr --company-slug=acme --date=2026-04-07
node cv-template-utils.mjs --lang=en --company-slug=acme --date=2026-04-07
```

Pass:

- helper syntax is valid
- `tr` resolves the TR template when present
- `en` resolves the EN template when present
- output naming is deterministic

Fail:

- helper crashes
- template resolution is ambiguous

#### PDF-U2: Renderer syntax

Command:

```bash
node --check generate-pdf.mjs
```

Pass:

- syntax check passes

Fail:

- syntax check fails

### Integration

#### PDF-I1: Minimal Turkish glyph render

Setup:

```bash
cat > /tmp/tr-pdf-fixture.html <<'EOF'
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>TR PDF Fixture</title>
</head>
<body>
  <h1>İstanbul, İzmir, Çankaya, Şişli</h1>
  <p>Kıdemli Yazılım Mühendisi</p>
  <p>Ölçüm, doğrulama, iş akışı, çözümler</p>
  <p>Geliştirdiğim ürün çıktıları doğrudan ölçülebilir iş etkisi yarattı.</p>
</body>
</html>
EOF
```

Command:

```bash
node generate-pdf.mjs /tmp/tr-pdf-fixture.html /tmp/tr-pdf-fixture.pdf --format=a4
```

Pass:

- command exits `0`
- `/tmp/tr-pdf-fixture.pdf` exists
- PDF page count is at least `1`

Fail:

- renderer crashes
- output file is missing or unreadable

#### PDF-I2: ATS normalization does not strip Turkish letters

Reuse `PDF-I1`.

Pass:

- smart quotes, dashes, and zero-width junk can be normalized
- Turkish letters `ç, ğ, ı, İ, ö, ş, ü` remain intact in the visible output

Fail:

- Turkish letters are lost, folded, or replaced

### Manual QA

#### PDF-M1: Visual checklist

Use the existing matrix in `docs/tr-pdf-validation-checklist.md`.

At minimum inspect:

- contact row
- section titles
- long Turkish strings
- long competency tags
- mixed Turkish/English technical vocabulary

Pass:

- no overflow
- no clipped text
- no broken glyphs
- no placeholder leakage

Fail:

- any visible layout break
- Turkish casing or glyph rendering looks wrong

## Release Decision

Treat the Turkey-localized surface as ready only if all of the following are true:

- global gates pass
- profile checks pass
- portal config checks pass
- normalization contract review passes
- scoring QA passes
- tracker merge and verification pass
- status normalization tests do not allow tracker corruption
- PDF integration and visual QA pass

If normalization or scoring still depend on docs-only behavior with no runtime implementation, manual QA remains release-blocking for those areas.
