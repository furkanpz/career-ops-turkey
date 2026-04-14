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
- PDF template seçimi ve output naming için `cv-template-utils.mjs` kullanılır.
- `automation.application` ve `language.cv_preferences` alanları interactive akıştakiyle aynı şekilde yorumlanır.
