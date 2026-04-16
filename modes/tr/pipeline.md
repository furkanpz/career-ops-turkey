# Mod: pipeline -- TR URL inbox işleme

Bu dosya `modes/pipeline.md` ile birlikte okunur. `modes/pipeline.md` içindeki TAM behavior korunur:

- sequential report numbering
- Playwright -> WebFetch -> WebSearch fallback zinciri
- `local:jds/*` desteği
- erişilemeyen URL'leri `- [!]` olarak işaretleme
- 3+ URL için paralel agent kullanımı
- pending -> processed taşıma

`data/pipeline.md` içindeki birikmiş ilan URL'lerini işler.

## Workflow

1. `data/pipeline.md` oku
2. `Pendientes` altındaki `- [ ]` kayıtları bul
3. Her URL için:
   - varsa `data/tr-listings.jsonl` ve pipeline note tag'lerinden (`city:`, `work_model:`, `lang:`, `salary:`, `source:`, `confidence:`) TR metadata oku
   - rapor numarasını sıralı hesapla
   - JD çıkar
   - `modes/tr/teklif.md` mantığı ile A-G değerlendirmesi yap
   - report header'a doğal Türkçe metadata yaz: `Şehir`, `Çalışma Modeli`, `İlan Dili`, `Çalışma Türü`, `Maaş Bilgisi`, `Kaynak`, `Güven Düzeyi`
   - final puan, güven düzeyi ve karar kategorisi üret
   - TR PDF kapısına göre PDF üret: yalnızca final puan `>= 3.0`, karar `hemen_basvur` veya `secici_basvur`, confidence `low` değil ve lokasyon/maaş/kritik stack blocker yoksa üret
   - karar `basvurma` veya `sinirda_once_dogrula` ise puan `>= 3.0` olsa bile PDF üretme; gerekçeyi raporun Karar bölümünde yaz
   - tracker girişi yaz
   - erişim hatası varsa `- [!]` olarak not düş
4. Var olan başlıkları bozma:
   - legacy `Pendientes` / `Procesadas`
   - veya English `Pending` / `Processed`
   Hangi stil dosyada varsa onu koru

## Özet tablo

İşlem sonunda şu tabloyu göster:

```markdown
| # | Şirket | Rol | Şehir | Çalışma Modeli | İlan Dili | Final Puan | Güven Düzeyi | Karar | PDF |
|---|---|---|---|---|---|---|---|---|---|
```

## Conservative kural

Şu durumda otomatik pozitif ton kullanma:

- recommendation `sinirda_once_dogrula`
- recommendation `basvurma`
- confidence `low`

Bu vakalarda özet satırında bunu açıkça belirt:

- `doğrula`
- `sınırda`
- `düşük güven`

## Sync

Pipeline başlamadan önce:

```bash
node cv-sync-check.mjs
```

Uyarı varsa kullanıcıya bildir.
