# Mod: ofertas -- Türkiye uyarlaması

Bu dosya `modes/ofertas.md` ile birlikte okunur.

## Karşılaştırma kuralları

- `compensation.salary_preferences` varsa TRY/EUR/USD beklentilerini role göre normalize et.
- `location_preferences` ve `constraints` varsa bunları score yorumunda öne çıkar.
- Türkiye/EMEA rollerinde lokasyon, hibrit politika, gross/net belirsizliği ve contractor/EOR farkını ayrı risk olarak yaz.
- Her ilan için aynı doğal TR metadata kontratını kullan: `Şehir`, `Çalışma Modeli`, `İlan Dili`, `Çalışma Türü`, `Maaş Bilgisi`, `Kaynak`, `Güven Düzeyi`.
- Çoklu karşılaştırmada karar tablosunda bu metadata alanlarını ve 10 boyutlu TR `Final Puan` sonucunu göster; yalnızca title/company/score ile sıralama yapma.
