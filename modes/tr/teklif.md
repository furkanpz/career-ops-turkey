# Mod: teklif -- Türkiye için tam A-G değerlendirme

Bu dosya `modes/oferta.md` ile birlikte okunur. `modes/oferta.md` içindeki A-G özellik yüzeyinin TAMAMI korunur: story bank entegrasyonu, Section G gating, ATS keyword extraction, report kaydı ve tracker writeback davranışı düşmez.

Kullanıcı bir ilan metni veya URL verdiğinde, HER ZAMAN A-G değerlendirme yüzeyini üret. Ardından Türkiye scoring framework ile final sonucu ver.

## Adım 0 -- Archetype tespiti

İlanı uygun archetype'a ata. Gerekirse en yakın 2 archetype'i belirt.

Bu seçim şunları etkiler:

- Blok B'de hangi proof point'lerin öne çıkacağı
- Blok E'de CV'nin nasıl yeniden çerçeveleneceği
- Blok F'de hangi STAR hikâyelerinin seçileceği
- Blok G'de draft application answers'ın güvenli şekilde açılıp açılmayacağı

## Blok A -- Rol özeti

Tablo mutlaka şu satırları içerir:

- `**Archetype** | ...`
- `**Domain** | ...`
- `**Function** | ...`
- `**Seniority** | ...`
- `**Remote** | ...`
- `**Team size** | ...` veya `Bilinmiyor`
- `**TL;DR** | ...`

`TL;DR` tek cümlede rolün gerçek özünü anlatmalı. Boş slogan istemiyorum.

## Blok B -- CV eşleşmesi

`cv.md` oku. İlandaki her ana gereksinimi CV'deki somut kanıtla eşleştir.

`modes/oferta.md` içindeki story-bank ve keyword extraction davranışı korunur. `interview-prep/story-bank.md` varsa tekrar kullan, yoksa uygun hikâyeleri ekle.

Gerekli alt bölümler:

1. Gereksinim -> CV kanıtı tablosu
2. Gaps
3. Her gap için kısa mitigation

Her gap için şu soruları cevapla:

1. Hard blocker mi, nice-to-have mi?
2. Aday adjacent deneyim gösterebilir mi?
3. Portfolyo veya case study ile açık kapanır mı?
4. Başvuru metninde nasıl daha dürüst ama güçlü çerçevelenir?

## Blok C -- Seniority ve strateji

Şunları açıkça yaz:

1. İlan seviyesi
2. Adayın bu archetype'teki doğal seviyesi
3. Eğer hafif mismatch varsa nasıl pozisyonlanmalı
4. Eğer downlevel riski varsa bunun pratik sonucu ne olur

## Blok D -- Maaş ve piyasa

WebSearch ile araştır:

- güncel maaş verisi
- şirketin comp itibari
- role talebi / doygunluk sinyali

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

### 1. Global Score tablosu

```markdown
## Global Score

| Dimension | Weight | Score |
|---|---:|---:|
| Role Fit | 18 | X |
| Alignment With Candidate Goals | 12 | X |
| Seniority Fit | 10 | X |
| City / Work Model Fit | 10 | X |
| Language Fit | 8 | X |
| Salary Transparency / Market Fairness | 12 | X |
| Posting Quality | 8 | X |
| Company Clarity / Hiring Credibility | 8 | X |
| Application Effort | 6 | X |
| Interview Likelihood | 8 | X |
| **Weighted Score** | **100** | **X.XX/5** |
```

### 2. Zorunlu sonuç alanları

Global Score bölümünden hemen sonra bunları ver:

```markdown
**Red Flag Cap:** none | major | critical
**Final Score:** X.XX/5
**Confidence:** high | medium | low
**Recommendation Category:** hemen_basvur | secici_basvur | sinirda_once_dogrula | basvurma
**Borderline:** yes | no
```

### 3. Strengths

Başlık:

```markdown
## Strengths
```

Kurallar:

- 3-5 madde
- her madde kanıt temelli
- en güçlü fit sinyallerini öne çıkar

### 4. Risks

Başlık:

```markdown
## Risks
```

Kurallar:

- 3-5 madde
- bilinmeyeni bilinmeyen olarak yaz
- major / critical risk varsa net yaz

### 5. Recommendation

Başlık:

```markdown
## Recommendation
```

Bu bölümde:

- 1 cümlelik karar
- 1 kısa gerekçe
- gerekiyorsa "önce şu 1-3 şeyi doğrula" listesi

Recommendation dili pratik ve recruiter-respectful olmalı:

- zayıf role "denemekten zarar gelmez" deme
- düşük confidence varsa "iyi fırsat" deme
- adayın zamanını ve recruiter'ın zamanını koru

### 6. Kök mode parity kuralı

`modes/oferta.md` içindeki aşağıdaki davranışlar korunur:

- `interview-prep/story-bank.md` ile story reuse
- `## Keywords extracted` bölümü
- `## G) Draft Application Answers` gating kuralı
- tracker'a final capped score yazımı

---

## Conservative logic

### Borderline durumlar

Şu durumlardan biri varsa net şekilde işaretle:

- final score 3.7-4.1 aralığında
- confidence low
- major red flag mevcut
- iki veya daha fazla boyut 3/5

Bu durumda recommendation category en fazla `sinirda_once_dogrula` olabilir.

### Low-confidence durumlar

Confidence `low` ise:

- bunu açıkça yaz
- hangi veriler eksik olduğunu yaz
- recommendation category `hemen_basvur` olamaz
- draft application answers'ı otomatik öne çıkarma

### Overclaiming yasağı

- Adayın bilmediği stack'i biliyor gibi yazma
- Maaş adil görünüyor demek için yeterli veri yoksa "belirsiz" de
- Şirket net değilse "güvenilir" deme

---

## Report kaydetme

Rapor dosyası:

`reports/{###}-{company-slug}-{YYYY-MM-DD}.md`

Header için parser-riskini azaltmak üzere şu anahtarlar korunur:

```markdown
# Değerlendirme: {Şirket} -- {Rol}

**Date:** {YYYY-MM-DD}
**Archetype** | {tespit edilen archetype}
**Score:** {final score}/5
**URL:** {ilan URL}
**PDF:** {yol veya pending}
**City:** {city veya unknown}
**Work Model:** {remote|hybrid|on_site|field|unspecified}
**Language:** {tr|en|tr_en|de|fr|ar|ru|multilingual|unspecified}
**Employment Type:** {full_time|part_time|contract|internship|temporary|freelance|consulting|apprenticeship|unspecified}
**Salary Transparency:** {transparent|market_range|opaque|unknown}
**Source:** {portal veya company careers}
**Confidence:** {high|medium|low}
```

Rapor iskeleti:

```markdown
## A) Rol Özeti
## B) CV Eşleşmesi
## C) Seniority ve Strateji
## D) Maaş ve Piyasa
## E) Kişiselleştirme Planı
## F) Mülakat Planı
## Global Score
## Strengths
## Risks
## Recommendation
```

`Section G` benzeri application draft bölümü sadece şu durumda eklenebilir:

- final score `>= 4.5`
- confidence `low` değil
- major / critical red flag yok

---

## Tracker yazımı

Tracker'a yazarken `Final Score` kullan.

Yani:

- capped score varsa onu kullan
- sadece weighted score'u yazma

Format mevcut sistemle aynı kalır.
