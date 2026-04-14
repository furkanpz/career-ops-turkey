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
   - rapor numarasını sıralı hesapla
   - JD çıkar
   - `modes/tr/teklif.md` mantığı ile A-G değerlendirmesi yap
   - final score, confidence ve recommendation category üret
   - root pipeline kuralına göre PDF gerekiyorsa üret
   - tracker girişi yaz
   - erişim hatası varsa `- [!]` olarak not düş
4. Var olan başlıkları bozma:
   - legacy `Pendientes` / `Procesadas`
   - veya English `Pending` / `Processed`
   Hangi stil dosyada varsa onu koru

## Özet tablo

İşlem sonunda şu tabloyu göster:

```markdown
| # | Şirket | Rol | Final Score | Confidence | Recommendation | PDF |
|---|---|---|---|---|---|---|
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
