# Mod: teklif -- Türkiye için tam A-G değerlendirme

Bu dosya `modes/oferta.md` ile birlikte okunur. `modes/oferta.md` içindeki A-G özellik yüzeyinin TAMAMI korunur: story bank entegrasyonu, başvuru cevapları gating'i, ATS anahtar kelime çıkarımı, report kaydı ve tracker writeback davranışı düşmez.

Kullanıcı bir ilan metni veya URL verdiğinde, HER ZAMAN A-G değerlendirme yüzeyini üret. Ardından Türkiye scoring framework ile final sonucu ver.

## Adım 0 -- Rol türü tespiti

İlanı uygun rol türüne ata. Gerekirse en yakın 2 rol türünü belirt.

Bu seçim şunları etkiler:

- Blok B'de hangi proof point'lerin öne çıkacağı
- Blok E'de CV'nin nasıl yeniden çerçeveleneceği
- Blok F'de hangi STAR hikâyelerinin seçileceği
- başvuru cevapları taslağının güvenli şekilde açılıp açılmayacağı

## Blok A -- Rol özeti

Tablo mutlaka şu satırları içerir:

- `**Rol Türü** | ...`
- `**Alan** | ...`
- `**İşin Odağı** | ...`
- `**Kıdem** | ...`
- `**Çalışma Modeli** | ...`
- `**Ekip Büyüklüğü** | ...` veya `Bilinmiyor`
- `**Kısa Özet** | ...`

`Kısa Özet` tek cümlede rolün gerçek özünü anlatmalı. Boş slogan istemiyorum.

## Blok B -- CV eşleşmesi

`cv.md` oku. İlandaki her ana gereksinimi CV'deki somut kanıtla eşleştir.

`modes/oferta.md` içindeki story-bank ve keyword extraction davranışı korunur. `interview-prep/story-bank.md` varsa tekrar kullan, yoksa uygun hikâyeleri ekle.

Gerekli alt bölümler:

1. Gereksinim -> CV kanıtı tablosu
2. Gaps
3. Her gap için kısa mitigation

Her açık için şu soruları cevapla:

1. Gerçek engel mi, tercih sebebi mi?
2. Aday yakın deneyim gösterebilir mi?
3. Portfolyo veya case study ile açık kapanır mı?
4. Başvuru metninde nasıl daha dürüst ama güçlü çerçevelenir?

## Blok C -- Kıdem ve strateji

Şunları açıkça yaz:

1. İlan seviyesi
2. Adayın bu archetype'teki doğal seviyesi
3. Eğer hafif uyumsuzluk varsa nasıl pozisyonlanmalı
4. Eğer daha düşük seviye riski varsa bunun pratik sonucu ne olur

## Blok D -- Maaş ve piyasa

WebSearch ile araştır:

- güncel maaş verisi
- şirketin ücret itibarı
- role talebi / piyasa doygunluğu sinyali

Türkiye için özellikle bak:

- gross vs net açık mı?
- aylık vs yıllık açık mı?
- TRY / EUR / USD açık mı?
- payroll mu contractor / EOR mu?
- maaş bilgisi yoksa, buna rağmen adil bir piyasa tahmini kurulabiliyor mu?

`config/profile.yml -> compensation.salary_preferences` varsa TRY/EUR/USD beklentilerini bu blokta referans al. `constraints` ve `location_preferences` ile çelişen ücret/lokasyon düzenlerini risk hanesine taşımayı unutma.

Emin değilsen bunu söyle. Uydurma yapma.

## Blok E -- CV kişiselleştirme planı

Tablo:

| # | Bölüm | Mevcut durum | Önerilen değişiklik | Neden |
|---|---|---|---|---|

Top 5 CV değişikliği ve gerekiyorsa Top 5 LinkedIn değişikliği ver.

## Blok F -- Mülakat planı

6-10 STAR+R hikâyesi ver:

| # | JD gereksinimi | STAR+R hikâyesi | S | T | A | R | Reflection |
|---|---|---|---|---|---|---|---|

Ek olarak:

- önerilen 1 case study
- 3-5 olası red-flag sorusu
- bu sorulara recruiter-respectful, abartısız cevap yönü

---

## Final değerlendirme mantığı

A-G değerlendirme bittikten sonra, `docs/tr-scoring-framework.md` ve `modes/tr/_shared.md` ile uyumlu şekilde şu çıktıyı EKLE:

### 1. Genel Puan tablosu

```markdown
## Genel Puan

| Kriter | Ağırlık | Puan |
|---|---:|---:|
| Rol Uyumu | 18 | X |
| Aday Hedefleriyle Uyum | 12 | X |
| Kıdem Uyumu | 10 | X |
| Şehir / Çalışma Modeli Uyumu | 10 | X |
| Dil Uyumu | 8 | X |
| Maaş Bilgisi / Piyasa Uyumu | 12 | X |
| İlan Kalitesi | 8 | X |
| Şirket Netliği / İşe Alım Güveni | 8 | X |
| Başvuru Eforu | 6 | X |
| Mülakata Kalma İhtimali | 8 | X |
| **Ağırlıklı Puan** | **100** | **X.XX/5** |
```

### 2. Zorunlu sonuç alanları

Genel Puan bölümünden hemen sonra bunları görünür Türkçe label ve doğal değerlerle ver:

```markdown
**Risk Tavanı:** Yok | Ciddi | Kritik
**Final Puan:** X.XX/5
**Güven Düzeyi:** Yüksek | Orta | Düşük
**Karar Kategorisi:** hemen_basvur | secici_basvur | sinirda_once_dogrula | basvurma
**Sınırda mı?:** Evet | Hayır
```

`Karar Kategorisi` makine dostu kategori değerlerini koruyabilir; diğer değerleri doğal Türkçe yaz.

### 3. Güçlü Yönler

Başlık:

```markdown
## Güçlü Yönler
```

Kurallar:

- 3-5 madde
- her madde kanıt temelli
- en güçlü fit sinyallerini öne çıkar

### 4. Riskler

Başlık:

```markdown
## Riskler
```

Kurallar:

- 3-5 madde
- bilinmeyeni bilinmeyen olarak yaz
- ciddi / kritik risk varsa net yaz

### 5. Karar

Başlık:

```markdown
## Karar
```

Bu bölümde:

- 1 cümlelik karar
- 1 kısa gerekçe
- gerekiyorsa "önce şu 1-3 şeyi doğrula" listesi

Karar dili pratik ve recruiter'a saygılı olmalı:

- zayıf role "denemekten zarar gelmez" deme
- düşük confidence varsa "iyi fırsat" deme
- adayın zamanını ve recruiter'ın zamanını koru

### 6. Kök mode uyumluluk kuralı

`modes/oferta.md` içindeki aşağıdaki davranışlar korunur:

- `interview-prep/story-bank.md` ile story reuse
- `## ATS Anahtar Kelimeleri` bölümü
- başvuru cevapları taslağı gating kuralı
- tracker'a final capped score yazımı

---

## Conservative logic

### Borderline durumlar

Şu durumlardan biri varsa net şekilde işaretle:

- final puan 3.7-4.1 aralığında
- güven düzeyi düşük
- ciddi risk mevcut
- iki veya daha fazla boyut 3/5

Bu durumda karar kategorisi en fazla `sinirda_once_dogrula` olabilir.

### Low-confidence durumlar

Güven düzeyi `Düşük` ise:

- bunu açıkça yaz
- hangi veriler eksik olduğunu yaz
- karar kategorisi `hemen_basvur` olamaz
- başvuru cevapları taslağını otomatik öne çıkarma

### Overclaiming yasağı

- Adayın bilmediği stack'i biliyor gibi yazma
- Maaş adil görünüyor demek için yeterli veri yoksa "belirsiz" de
- Şirket net değilse "güvenilir" deme

---

## Report kaydetme

Rapor dosyası:

`reports/{###}-{company-slug}-{YYYY-MM-DD}.md`

Header kullanıcıya doğal Türkiye Türkçesiyle görünür. Internal canonical değerleri yalnızca tracker, sidecar ve note tag'lerde koru; report'ta yeni yüzey aşağıdaki gibidir:

```markdown
# Değerlendirme: {Şirket} -- {Rol}

**Tarih:** {YYYY-MM-DD}
**Rol Türü:** {tespit edilen rol türü}
**Kısa Özet:** {tek cümlelik özet}
**Çalışma Modeli:** {Uzaktan|Hibrit|Ofisten|Sahada|Belirtilmemiş}
**Ücret:** {maaş bilgisi veya Belirtilmemiş}
**Puan:** {final score}/5
**İlan URL’si:** {ilan URL}
**İlan Gerçekliği:** {Yüksek güven|Önce doğrula|Şüpheli}
**PDF:** {yol veya Üretilmedi}
**Pipeline ID:** {batch/pipeline id veya yok}
**Şehir:** {şehir veya Bilinmiyor}
**İlan Dili:** {Türkçe|İngilizce|Türkçe + İngilizce|...|Belirtilmemiş}
**Çalışma Türü:** {Tam zamanlı|Yarı zamanlı|Sözleşmeli|...|Belirtilmemiş}
**Maaş Bilgisi:** {Açık|Piyasa bandı verilmiş|Belirtilmemiş|Bilinmiyor}
**Kaynak:** {portal veya şirket kariyer sayfası}
**Güven Düzeyi:** {Yüksek|Orta|Düşük}
```

PDF alanı için TR kapısı geçerlidir: `hemen_basvur` veya `secici_basvur` dışında kalan, confidence `low` olan ya da lokasyon/maaş/kritik stack blocker içeren roller için puan `>= 3.0` olsa bile `Üretilmedi` yaz.

Eski `Date`, `Archetype`, `Remote`, `Comp`, `City`, `Work Model`, `Salary Transparency`, `Confidence` label'larını yeni TR raporlarda kullanma. Parser geriye uyumluluk için onları okumaya devam eder.

Rapor iskeleti:

```markdown
## A) Rol Özeti
## B) CV Eşleşmesi
## C) Kıdem ve Strateji
## D) Maaş ve Piyasa
## E) Kişiselleştirme Planı
## F) Mülakat Planı
## G) İlan Gerçekliği
## Genel Puan
## Güçlü Yönler
## Riskler
## Karar
## ATS Anahtar Kelimeleri
```

Başvuru cevapları taslağı sadece şu durumda eklenebilir:

- final score `>= 4.5`
- confidence `low` değil
- major / critical red flag yok

---

## Tracker yazımı

Tracker'a yazarken final puanı kullan.

Yani:

- capped score varsa onu kullan
- sadece weighted score'u yazma

Format mevcut sistemle aynı kalır.
