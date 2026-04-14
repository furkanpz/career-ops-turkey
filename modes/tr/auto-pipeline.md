# Mod: auto-pipeline -- Türkiye uyarlaması

Bu dosya `modes/auto-pipeline.md` ile birlikte okunur. `modes/auto-pipeline.md` içindeki TAM workflow korunur; bu dosya sadece Türkiye pazarı ve Türkçe operatör deneyimi için ek davranış tanımlar.

## Override kuralları

1. Evaluation adımında `modes/tr/teklif.md` kuralları geçerlidir.
2. PDF adımında `modes/tr/pdf.md` kuralları geçerlidir.
3. Draft application answers gerekiyorsa `modes/tr/basvur.md` ton ve conservative gate kuralları geçerlidir.
4. `config/profile.yml` içinde şu alanları varsa kullan:
   - `language.cv_preferences`
   - `compensation.salary_preferences`
   - `location_preferences`
   - `constraints`
   - `automation.application`

## Türkiye-specific davranış

- `automation.application.auto_generate_pdf` false ise PDF'yi otomatik öne çıkarma; önce kullanıcıya bildir.
- `automation.application.auto_draft_form_answers` false ise Section G oluşturmadan önce kullanıcıyı uyar.
- İlan dili İngilizce olsa bile aday Türkiye bazlıysa şehir, hibrit politika, maaş netliği ve legal setup sinyallerini TR scoring içinde koru.
- Report machine-key'leri her zaman English kalır: `Archetype`, `TL;DR`, `Remote`, `Comp`, `Date`, `Score`, `URL`, `PDF`, `Batch ID`.
