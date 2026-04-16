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
- PDF sadece puan `>= 3.0` diye üretilmez. Karar kategorisi `hemen_basvur` veya `secici_basvur` değilse, confidence `low` ise ya da lokasyon/maaş/kritik stack blocker varsa PDF üretme ve report header'da `PDF: Üretilmedi` yaz.
- `automation.application.auto_draft_form_answers` false ise başvuru cevapları taslağı oluşturmadan önce kullanıcıyı uyar.
- İlan dili İngilizce olsa bile aday Türkiye bazlıysa şehir, hibrit politika, maaş netliği ve legal setup sinyallerini TR scoring içinde koru.
- Report'un görünür yüzeyi doğal Türkçe olur: `Rol Türü`, `Kısa Özet`, `Çalışma Modeli`, `Ücret`, `Tarih`, `Puan`, `İlan URL’si`, `PDF`, `Pipeline ID`.
- Report header'a dashboard için doğal Türkçe metadata ekle:
  `Şehir`, `Çalışma Modeli`, `İlan Dili`, `Çalışma Türü`, `Maaş Bilgisi`, `Kaynak`, `Güven Düzeyi`.
- Scanner'dan gelen `data/tr-listings.jsonl` veya pipeline note tag'leri varsa (`city:`, `work_model:`, `lang:`, `salary:`, `source:`, `confidence:`) bunları kanıt olarak kullan; report'ta doğal Türkçe karşılıklarını yaz. Yoksa JD'den çıkar ve belirsiz alanları metadata tipine göre güvenli değerle yaz: şehir ve maaş için `Bilinmiyor`, çalışma modeli / ilan dili / çalışma türü için `Belirtilmemiş`.
