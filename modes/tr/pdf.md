# Mod: pdf -- Türkiye uyarlaması

Bu dosya `modes/pdf.md` ile birlikte okunur. `modes/pdf.md` içindeki bütün ATS ve template kuralları korunur; bu dosya sadece dil/locale seçimi ve Türkiye profili için ek davranış getirir.

## CV dili seçimi

`config/profile.yml` içinde `language.cv_preferences` varsa şu sırayı uygula:

1. `by_listing_language` eşleşmesi
2. `default`
3. fallback `en`

Pratik kural:
- Türkçe JD -> varsayılan olarak `tr`
- İngilizce JD -> varsayılan olarak `en`
- Dil belirsizse `language.cv_preferences.default`

## Profil alanları

- `location_preferences` ve `constraints` rolün lokasyon gerçekliğini özetlerken kullan.
- `compensation.salary_preferences` yalnızca CV framing'i ve comp beklentisi uyumu için referans olsun; CV'ye maaş yazma.
- `automation.application.auto_generate_pdf` false ise kullanıcıya PDF generation'ın defaultta kapalı olduğunu belirt.

## Şablon ve adlandırma

- Template seçimi ve output naming için `cv-template-utils.mjs` ana çözümleyicidir.
- Batch ve interactive akışlarda aynı çözümleyiciyi kullan.
- `config/profile.yml` içinde `candidate.phone` boşsa CV header'da telefon alanını ve ona ait ayırıcıyı tamamen çıkar; boş `{{PHONE}}` placeholder'ı bırakma.
- Türkçe CV oluşturulsa bile machine kontratı bozulmaz; report header key'leri English kalır.
