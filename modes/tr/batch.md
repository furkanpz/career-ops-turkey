# Mod: batch -- Türkiye uyarlaması

Bu dosya `modes/batch.md` ile birlikte okunur. `modes/batch.md` içindeki orchestration davranışı korunur.

## Worker locale kuralı

Eğer `config/profile.yml` içinde `language.modes_dir: modes/tr` varsa, her worker şunları da okumak zorundadır:

- `modes/tr/_shared.md`
- `modes/tr/teklif.md`
- `modes/tr/pdf.md`

## Batch uyumluluk kuralları

- Tracker status label'ları canonical English kalır.
- `data/tr-listings.jsonl` ve pipeline note tag'leri canonical değerleri korur.
- Her report header'ı doğal Türkiye Türkçesiyle görünür metadata üretir: `Şehir`, `Çalışma Modeli`, `İlan Dili`, `Çalışma Türü`, `Maaş Bilgisi`, `Kaynak`, `Güven Düzeyi`.
- Worker, scanner sidecar veya pipeline tag'leri varsa bunları kanıt olarak kullanır; report'ta doğal Türkçe karşılıklarını yazar. Yoksa JD'den çıkarır ve belirsiz alanları metadata tipine göre güvenli değerle bırakır: şehir ve maaş için `Bilinmiyor`, çalışma modeli / ilan dili / çalışma türü için `Belirtilmemiş`.
- PDF template seçimi ve output naming için `cv-template-utils.mjs` kullanılır.
- `automation.application` ve `language.cv_preferences` alanları interactive akıştakiyle aynı şekilde yorumlanır.
