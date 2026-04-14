# Mod: batch -- Türkiye uyarlaması

Bu dosya `modes/batch.md` ile birlikte okunur. `modes/batch.md` içindeki orchestration davranışı korunur.

## Worker locale kuralı

Eğer `config/profile.yml` içinde `language.modes_dir: modes/tr` varsa, her worker şunları da okumak zorundadır:

- `modes/tr/_shared.md`
- `modes/tr/teklif.md`
- `modes/tr/pdf.md`

## Batch uyumluluk kuralları

- Tracker status label'ları canonical English kalır.
- Report machine-key'leri canonical English kalır.
- Her report header'ı parser-safe TR metadata üretir: `City`, `Work Model`, `Language`, `Employment Type`, `Salary Transparency`, `Source`, `Confidence`.
- Worker, scanner sidecar veya pipeline tag'leri varsa bunları kullanır; yoksa JD'den çıkarır ve belirsiz alanları metadata tipine göre güvenli değerle bırakır: city ve salary için `unknown`, work model/language/employment type için `unspecified`.
- PDF template seçimi ve output naming için `cv-template-utils.mjs` kullanılır.
- `automation.application` ve `language.cv_preferences` alanları interactive akıştakiyle aynı şekilde yorumlanır.
