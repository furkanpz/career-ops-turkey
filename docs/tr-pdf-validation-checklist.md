# Turkey PDF Validation Checklist

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

1. template fallback
   - if `cv-template.tr.html` is missing, selection should fall back to `cv-template.html`
   - if `cv-template.en.html` is missing, selection should fall back to `cv-template.html`
2. label fallback
   - if Turkish labels are incomplete, English defaults should still populate missing section labels
3. content fallback
   - empty optional sections such as certifications or projects should not produce broken layout behavior

### Pass criteria

- PDF still renders when locale-specific template is unavailable
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
3. unsupported language values fall back to English
4. bilingual naming produces:
   - `cv-candidate-{company}-tr-{date}.pdf`
   - `cv-candidate-{company}-en-{date}.pdf`
5. legacy naming remains available when explicitly requested

### Pass criteria

- no filename collisions between `tr` and `en`
- template selection is predictable
- legacy flow still works

## 6. Manual Smoke Commands

Template resolution:

```bash
node cv-template-utils.mjs --lang=tr --company-slug=acme --date=2026-04-07
node cv-template-utils.mjs --lang=en --company-slug=acme --date=2026-04-07
```

Renderer syntax:

```bash
node --check generate-pdf.mjs
node --check cv-template-utils.mjs
```

End-to-end render:

```bash
node generate-pdf.mjs /tmp/cv-candidate-acme-tr.html /tmp/cv-candidate-acme-tr.pdf --format=a4
node generate-pdf.mjs /tmp/cv-candidate-acme-en.html /tmp/cv-candidate-acme-en.pdf --format=a4
```

## Release Gate

Do not consider bilingual Turkey-ready PDF support ready until:

1. glyph rendering passes
2. overflow checks pass
3. section fallback checks pass
4. legacy PDF generation still works unchanged
