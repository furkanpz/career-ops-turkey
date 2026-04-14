# Mod: ofertas -- Türkiye uyarlaması

Bu dosya `modes/ofertas.md` ile birlikte okunur.

## Karşılaştırma kuralları

- `compensation.salary_preferences` varsa TRY/EUR/USD beklentilerini role göre normalize et.
- `location_preferences` ve `constraints` varsa bunları score yorumunda öne çıkar.
- Türkiye/EMEA rollerinde lokasyon, hibrit politika, gross/net belirsizliği ve contractor/EOR farkını ayrı risk olarak yaz.
