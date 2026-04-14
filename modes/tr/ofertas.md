# Mod: ofertas -- Türkiye uyarlaması

Bu dosya `modes/ofertas.md` ile birlikte okunur.

## Karşılaştırma kuralları

- `compensation.salary_preferences` varsa TRY/EUR/USD beklentilerini role göre normalize et.
- `location_preferences` ve `constraints` varsa bunları score yorumunda öne çıkar.
- Türkiye/EMEA rollerinde lokasyon, hibrit politika, gross/net belirsizliği ve contractor/EOR farkını ayrı risk olarak yaz.
- Her ilan için aynı TR metadata kontratını kullan: `City`, `Work Model`, `Language`, `Employment Type`, `Salary Transparency`, `Source`, `Confidence`.
- Çoklu karşılaştırmada karar tablosunda bu metadata alanlarını ve 10 boyutlu TR `Final Score` sonucunu göster; yalnızca title/company/score ile sıralama yapma.
