# Mod: pdf -- Turkiye locale override

Bu dosya `modes/pdf.md` ile birlikte okunur. `modes/pdf.md` icindeki butun ATS ve template kurallari korunur; bu dosya sadece locale secimi ve Turkiye profili icin override getirir.

## CV dili secimi

`config/profile.yml` icinde `language.cv_preferences` varsa su sirayi uygula:

1. `by_listing_language` eslesmesi
2. `default`
3. fallback `en`

Pratik kural:
- Turkce JD -> varsayilan olarak `tr`
- Ingilizce JD -> varsayilan olarak `en`
- Dil belirsizse `language.cv_preferences.default`

## Profil alanlari

- `location_preferences` ve `constraints` rolun lokasyon gercekligini ozetlerken kullan.
- `compensation.salary_preferences` yalnizca CV framing'i ve comp beklentisi uyumu icin referans olsun; CV'ye maas yazma.
- `automation.application.auto_generate_pdf` false ise kullaniciya PDF generation'in defaultta kapali oldugunu belirt.

## Template ve naming

- Template secimi ve output naming icin `cv-template-utils.mjs` ana cozumleyicidir.
- Batch ve interactive akislarda ayni cozumleyiciyi kullan.
- Turkce CV olusturulsa bile machine kontrati bozulmaz; report header key'leri English kalir.
