# Turkey PDF Validation Checklist

> Supporting validation note. This checklist remains useful for manual QA, but it is not the
> source of truth for the current PDF runtime. The implemented behavior is defined by
> `cv-template-utils.mjs`, `generate-pdf.mjs`, the `templates/cv-template*.html` files, and the
> PDF-related setup/customization docs.

## Purpose

This checklist defines the minimum validation required before enabling Turkey-ready bilingual CV output in normal use.

Scope:

- Turkish glyph rendering
- page overflow
- section fallback behavior

It assumes additive template support:

- `templates/cv-template.html`
- `templates/cv-template.en.html`
- `templates/cv-template.tr.html`

## Test Matrix

Run checks for all of these combinations:

1. English template + A4
2. English template + Letter
3. Turkish template + A4
4. Turkish template + Letter

At minimum, use:

- one short 1-page CV
- one dense 2-page CV
- one Turkey-localized CV with long Turkish strings

## 1. Turkish Glyph Rendering

### Objective

Verify that Turkish characters render correctly in headings, body text, links, and list items.

### Required sample strings

- `İstanbul, İzmir, Isparta, Çankaya, Şişli, Göktürk`
- `Kıdemli Yazılım Mühendisi`
- `Ölçüm, doğrulama, iş akışı, çözümler`
- `Geliştirdiğim ürün çıktıları doğrudan ölçülebilir iş etkisi yarattı.`

### Pass criteria

- no missing glyph boxes
- no Latin fallback mismatch inside the same line
- dotted/dotless `i` characters render distinctly
- links and contact row preserve Turkish characters

## 2. Page Overflow

### Objective

Catch layout stress caused by longer Turkish text and mixed Turkish-English technical vocabulary.

### High-risk zones

- contact row
- section titles
- competency tags
- job header lines
- education/certification rows
- long company or location strings

### Validation cases

1. long location:
   - `Istanbul, Turkiye (Hybrid, haftada 2 gun ofis)`
2. long role title:
   - `Kıdemli Veri Platformu ve Makine Öğrenmesi Mühendisi`
3. long competency labels:
   - `Dagitik veri isleme ve guvenilir ML is akislari`
4. dense project descriptions in Turkish

### Pass criteria

- no clipped text
- no overlapping sections
- no contact-row collisions
- no broken PDF pagination
- no forced font shrink that materially changes the design hierarchy

## 3. Section Fallback Behavior

### Objective

Verify that bilingual support fails safely when the language-specific path is incomplete.

### What to validate

1. template availability
   - `tr` resolves `cv-template.tr.html`
   - `en` resolves `cv-template.en.html`
   - `es` resolves `cv-template.html`
   - unsupported language values fail explicitly
2. label fallback
   - if Turkish labels are incomplete, English defaults should still populate missing section labels
3. content fallback
   - empty optional sections such as certifications or projects should not produce broken layout behavior

### Pass criteria

- supported languages resolve deterministically to the expected template path
- unsupported languages fail explicitly instead of silently changing language
- missing section labels do not leave raw placeholders visible
- empty optional sections do not produce malformed spacing or placeholder leakage

## 4. ATS-Safe Character Handling

### Objective

Verify that ATS normalization keeps Turkish letters intact while still cleaning problematic Unicode.

### Required checks

- em dash becomes `-`
- smart quotes normalize
- zero-width characters are removed
- Turkish letters remain unchanged:
  - `ç, ğ, ı, İ, ö, ş, ü`

### Pass criteria

- normalization log appears only for the intended characters
- Turkish letters survive HTML -> PDF unchanged

## 5. Language Selection Sanity

### Objective

Verify that template and file naming follow deterministic rules.

### Required checks

1. `--lang=tr` resolves Turkish template when available
2. `--lang=en` resolves English template when available
3. unsupported language values fail explicitly
4. bilingual naming produces:
   - `cv-candidate-{company-slug}-tr-{date}.pdf`
   - `cv-candidate-{company-slug}-en-{date}.pdf`
   - `cv-candidate-{company-slug}-es-{date}.pdf`

### Pass criteria

- no filename collisions between `tr`, `en`, and `es`
- template selection is predictable
- legacy Spanish flow still works through the language-suffixed contract

## 6. Manual Smoke Commands

Template resolution:

```bash
node cv-template-utils.mjs --lang=tr --company-slug=acme --date=2026-04-07
node cv-template-utils.mjs --lang=en --company-slug=acme --date=2026-04-07
node cv-template-utils.mjs --lang=es --company-slug=acme --date=2026-04-07
```

Renderer syntax:

```bash
node --check generate-pdf.mjs
node --check cv-template-utils.mjs
```

End-to-end render:

```bash
node generate-pdf.mjs /tmp/cv-candidate-acme-tr.html output/cv-candidate-acme-tr-2026-04-07.pdf --format=a4
node generate-pdf.mjs /tmp/cv-candidate-acme-en.html output/cv-candidate-acme-en-2026-04-07.pdf --format=a4
```

## Release Gate

Do not consider bilingual Turkey-ready PDF support ready until:

1. glyph rendering passes
2. overflow checks pass
3. section fallback checks pass
4. legacy Spanish-compatible PDF generation still works through `--lang=es`
