# career-ops -- Turkce Modlar (`modes/tr/`)

Bu klasor, Turkiye pazarina gore ayarlanmis career-ops override katmanini tutar.
Router `modes/tr/` aktif oldugunda her zaman kok `modes/` dosyasini da okur; `modes/tr/*` sadece locale-specific override ekler. Bu sayede feature parity korunur.
Bu katman, kullanicinin hedef rol ailesini sistem katmanina gommez. Hedef roller, keywordler ve company tercihleri kullanici katmaninda tanimlanir.

## Ne zaman kullanilir?

`modes/tr/` su durumlarda tercih edilmelidir:

- aday Turkiye bazliysa
- ilan Turkiye'de ise veya gercekci bicimde Turkiye bazli adayi kabul ediyorsa
- ilan dili Turkce veya Ingilizce olabilir, ama karar mantigi Turkiye pazari gercegine gore calismalidir
- sehir, hibrit politika, maas seffafligi, sirket netligi ve basvuru eforu kritik filtrelerse

Bu katman yalnizca Turkce ilanlar icin degil, Turkiye bazli is arama akisi icindir. Ilan dili Ingilizce olabilir; locale behavior yine Turkiye-market lensi ile calisir.

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

## Bu katmanda ne var?

| Dosya | Amac |
|---|---|
| `_shared.md` | Turkiye scoring mantigi, confidence ve recommendation kurallari |
| `teklif.md` | Tek ilan A-F degerlendirmesi + final score output |
| `basvur.md` | Canli basvuru akisi, TR evaluation output'una gore daha ihtiyatli cevap uretimi |
| `pipeline.md` | Pipeline URL isleme akisi, TR scoring sonucuna gore ozetleme |
| `auto-pipeline.md` | Koku bozmadan TR evaluation/PDF/apply override zinciri |
| `pdf.md` | CV language secimi ve TR profile wiring |
| `scan.md` | Turkiye portal metadata ve dedup heuristics |
| `batch.md` | Worker locale parity ve template secimi |
| `tracker.md` | Canonical status kontrati + Turkce operator aciklamasi |
| `contacto.md` | Turkiye/EMEA outreach dil secimi |
| `ofertas.md` | Turkiye-market compare heuristics |
| `deep.md` | Turkiye/EMEA arastirma lensi |
| `project.md` | Turkiye pazari signal lensi |
| `training.md` | Yerel signal degeri lensi |
| `patterns.md` | Canonical status/funnel override |
| `interview-prep.md` | Turkiye/EMEA interview research lensi |
| `followup.md` | Follow-up cadence ve draft generation icin Turkiye operator override |

## Tasarim notu

Bu katman, mevcut repo ruhunu korur:

- A-F bloklari aynen kalir
- global skor 1-5 ve agirlikli kalir
- red flags ayri ele alinir
- dusuk guvenli veya sinirda vakalarda "basvur" demek yerine "once dogrula" denir

## Parser uyumlulugu

Turkce raporlar olusturulurken, dashboard ve parser icin bazi header alanlari canonical English kalmalidir:

- `**Archetype** |`
- `**Remote** |`
- `**Score:**`
- `**URL:**`
- `**PDF:**`
- `**TL;DR** |`
- `**Date:**`
- `**Batch ID:**`

Gorunen govde Turkce olabilir, ama bu anahtarlar sabit kalmalidir.
