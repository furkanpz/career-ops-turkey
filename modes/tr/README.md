# career-ops -- Türkçe Modlar (`modes/tr/`)

Bu klasör, Career-Ops'un Türkiye pazarına göre uyarlanmış mod katmanını içerir.
Router `modes/tr/` aktif olduğunda her zaman kök `modes/` dosyasını da okur; `modes/tr/*` yalnızca Türkiye'ye özgü ek davranışları tanımlar. Böylece upstream özellikleri korunur.
Bu katman, kullanıcının hedef rol ailesini sistem katmanına gömmez. Hedef roller, anahtar kelimeler ve şirket tercihleri kullanıcı katmanında tanımlanır.

## Ne zaman kullanılır?

`modes/tr/` şu durumlarda tercih edilmelidir:

- aday Türkiye bazlıysa
- ilan Türkiye'de ise veya gerçekçi biçimde Türkiye bazlı adayi kabul ediyorsa
- ilan dili Türkçe veya İngilizce olabilir, ama karar mantığı Türkiye pazarı gerçeğine göre çalışmalıdır
- şehir, hibrit politika, maaş şeffaflığı, şirket netliği ve başvuru eforu kritik filtrelerse

Bu katman yalnızca Türkçe ilanlar için değildir; Türkiye bazlı iş arama akışı içindir. İlan dili İngilizce olabilir; pazar yorumu yine Türkiye/EMEA gerçekleriyle yapılır.

## Nasıl aktive edilir?

### Session bazlı

Claude'a şunu söyle:

> "Bu session'da `modes/tr/` kullan."

veya

> "Türkiye scoring framework ile değerlendir. `modes/tr/_shared.md` ve `modes/tr/teklif.md` kullan."

### Profil bazlı

`config/profile.yml` içine şu konvansiyonu eklenebilir:

```yaml
language:
  primary: tr
  modes_dir: modes/tr
```

## Bu katmanda ne var?

| Dosya | Amaç |
|---|---|
| `_shared.md` | Türkiye puanlama mantığı, güven düzeyi ve öneri kuralları |
| `teklif.md` | Tek ilan için A-G değerlendirme + final score çıktısı |
| `basvur.md` | Canlı başvuru akışı, TR değerlendirme çıktısına göre ihtiyatlı cevap üretimi |
| `pipeline.md` | Pipeline URL işleme akışı, TR puanlama sonucuna göre özetleme |
| `auto-pipeline.md` | Kök davranışı bozmadan TR değerlendirme/PDF/başvuru yardım zinciri |
| `pdf.md` | CV dili seçimi ve TR profil bağlantısı |
| `scan.md` | Türkiye portal metadatası ve tekrar kayıt azaltma kuralları |
| `batch.md` | Worker locale uyumu ve şablon seçimi |
| `tracker.md` | Canonical status kontratı + Türkçe operatör açıklaması |
| `contacto.md` | Türkiye/EMEA erişim mesajlarında dil seçimi |
| `ofertas.md` | Türkiye pazarı karşılaştırma sezgileri |
| `deep.md` | Türkiye/EMEA araştırma lensi |
| `project.md` | Türkiye pazarı sinyal lensi |
| `training.md` | Yerel sinyal değeri lensi |
| `patterns.md` | Canonical status/funnel override |
| `interview-prep.md` | Türkiye/EMEA mülakat araştırma lensi |
| `followup.md` | Follow-up temposu ve taslak üretimi için Türkiye operatör override'ı |

## Tasarım notu

Bu katman, mevcut repo ruhunu korur:

- A-G değerlendirme yüzeyi korunur
- global skor 1-5 aralığında ve ağırlıklı kalır
- red flag'ler ayrı ele alınır
- düşük güvenli veya sınırda vakalarda "başvur" demek yerine "önce doğrula" denir

## Parser uyumluluğu

Yeni Türkçe raporlarda kullanıcıya görünen header ve gövde doğal Türkiye Türkçesiyle yazılır:

- `**Tarih:**`
- `**Rol Türü:**`
- `**Kısa Özet:**`
- `**Çalışma Modeli:**`
- `**Ücret:**`
- `**Puan:**`
- `**İlan URL’si:**`
- `**PDF:**`
- `**Pipeline ID:**`
- `**Şehir:**`
- `**İlan Dili:**`
- `**Çalışma Türü:**`
- `**Maaş Bilgisi:**`
- `**Kaynak:**`
- `**Güven Düzeyi:**`

Tracker status'ları, pipeline note tag'leri ve `data/tr-listings.jsonl` canonical değerleri korur. Dashboard/parser eski English header'ları da geriye uyumluluk için okumaya devam eder.
