# Mod: batch -- Turkiye locale override

Bu dosya `modes/batch.md` ile birlikte okunur. `modes/batch.md` icindeki orchestration davranisi korunur.

## Worker locale kurali

Eger `config/profile.yml` icinde `language.modes_dir: modes/tr` varsa, her worker sunlari da okumak zorundadir:

- `modes/tr/_shared.md`
- `modes/tr/teklif.md`
- `modes/tr/pdf.md`

## Batch uyumluluk kurallari

- Tracker status label'lari canonical English kalir.
- Report machine-key'leri canonical English kalir.
- PDF template secimi ve output naming icin `cv-template-utils.mjs` kullanilir.
- `automation.application` ve `language.cv_preferences` alanlari interactive akistakiyle ayni sekilde yorumlanir.
