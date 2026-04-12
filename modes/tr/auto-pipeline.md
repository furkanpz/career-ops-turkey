# Mod: auto-pipeline -- Turkiye locale override

Bu dosya `modes/auto-pipeline.md` ile birlikte okunur. `modes/auto-pipeline.md` icindeki TAM workflow korunur; bu dosya sadece Turkiye pazari ve Turkce operator deneyimi icin override ekler.

## Override kurallari

1. Evaluation adiminda `modes/tr/teklif.md` kurallari gecerlidir.
2. PDF adiminda `modes/tr/pdf.md` kurallari gecerlidir.
3. Draft application answers gerekiyorsa `modes/tr/basvur.md` ton ve conservative gate kurallari gecerlidir.
4. `config/profile.yml` icinde su alanlari varsa kullan:
   - `language.cv_preferences`
   - `compensation.salary_preferences`
   - `location_preferences`
   - `constraints`
   - `automation.application`

## Turkiye-specific davranis

- `automation.application.auto_generate_pdf` false ise PDF'yi otomatik one cikarma; once kullaniciya bildir.
- `automation.application.auto_draft_form_answers` false ise Section G olusturmadan once kullaniciyi uyar.
- Ilan dili Ingilizce olsa bile aday Turkiye bazliysa sehir, hibrit politika, maas netligi ve legal setup sinyallerini TR scoring icinde koru.
- Report machine-key'leri her zaman English kalir: `Archetype`, `TL;DR`, `Remote`, `Comp`, `Date`, `Score`, `URL`, `PDF`, `Batch ID`.
