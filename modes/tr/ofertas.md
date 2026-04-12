# Mod: ofertas -- Turkiye locale override

Bu dosya `modes/ofertas.md` ile birlikte okunur.

## Karsilastirma kurallari

- `compensation.salary_preferences` varsa TRY/EUR/USD beklentilerini role gore normalize et.
- `location_preferences` ve `constraints` varsa bunlari score yorumunda one cikar.
- Turkiye/EMEA rollerinde lokasyon, hibrit politika, gross/net belirsizligi ve contractor/EOR farkini ayri risk olarak yaz.
