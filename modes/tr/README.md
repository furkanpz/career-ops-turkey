# career-ops -- Turkce Modlar (`modes/tr/`)

Bu klasor, Turkiye pazarina gore ayarlanmis career-ops modlarini tutar.

## Ne zaman kullanilir?

`modes/tr/` su durumlarda tercih edilmelidir:

- aday Turkiye bazliysa
- ilan Turkiye'de ise veya gercekci bicimde Turkiye bazli adayi kabul ediyorsa
- ilan dili Turkce veya Ingilizce olabilir, ama karar mantigi Turkiye pazari gercegine gore calismalidir
- sehir, hibrit politika, maas seffafligi, sirket netligi ve basvuru eforu kritik filtrelerse

Bu katman yalnizca Turkce ilanlar icin degil, Turkiye bazli is arama akisi icindir.

## Nasil aktive edilir?

### Session bazli

Claude'a sunu soyle:

> "Bu session'da `modes/tr/` kullan."

veya

> "Turkiye scoring framework ile degerlendir. `modes/tr/_shared.md` ve `modes/tr/teklif.md` kullan."

### Profil bazli

`config/profile.yml` icine su konvansiyonu eklenebilir:

```yaml
language:
  primary: tr
  modes_dir: modes/tr
```

## Bu ilk iterasyonda ne var?

| Dosya | Amac |
|---|---|
| `_shared.md` | Turkiye scoring mantigi, confidence ve recommendation kurallari |
| `teklif.md` | Tek ilan A-F degerlendirmesi + final score output |
| `basvur.md` | Canli basvuru akisi, TR evaluation output'una gore daha ihtiyatli cevap uretimi |
| `pipeline.md` | Pipeline URL isleme akisi, TR scoring sonucuna gore ozetleme |

## Tasarim notu

Bu katman, mevcut repo ruhunu korur:

- A-F bloklari aynen kalir
- global skor 1-5 ve agirlikli kalir
- red flags ayri ele alinir
- dusuk guvenli veya sinirda vakalarda "basvur" demek yerine "once dogrula" denir

## Parser uyumlulugu

Turkce raporlar olusturulurken, dashboard ve mevcut parser riskini azaltmak icin bazi header alanlari makine-dostu tutulmalidir:

- `**Arquetipo:**`
- `**Score:**`
- `**URL:**`
- `**PDF:**`
- `**TL;DR:**`

Gorunen metin Turkce olabilir, ama bu anahtarlar sabit kalmalidir.
