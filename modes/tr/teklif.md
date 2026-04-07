# Mod: teklif -- Turkiye icin tam A-F degerlendirme

Kullanici bir ilan metni veya URL verdiginde, HER ZAMAN A-F bloklarini uret. Ardindan Turkiye scoring framework ile final sonucu ver.

## Adim 0 -- Archetype tespiti

Ilani uygun archetype'a ata. Gerekirse en yakin 2 archetype'i belirt.

Bu secim sunlari etkiler:

- Blok B'de hangi proof point'lerin one cikacagi
- Blok E'de CV'nin nasil yeniden cercevelenecegi
- Blok F'de hangi STAR hikayelerinin secilecegi

## Blok A -- Rol ozeti

Tablo mutlaka su satirlari icerir:

- `**Arquetipo:** | ...`
- `**Domain:** | ...`
- `**Function:** | ...`
- `**Seniority:** | ...`
- `**Remote:** | ...`
- `**Team size:** | ...` veya `Bilinmiyor`
- `**TL;DR:** | ...`

`TL;DR` tek cumlede rolun gercek ozunu anlatmali. Bos slogan istemiyorum.

## Blok B -- CV eslesmesi

`cv.md` oku. Ilandaki her ana gereksinimi CV'deki somut kanitla eslestir.

Gerekli alt bolumler:

1. Gereksinim -> CV kaniti tablosu
2. Gaps
3. Her gap icin kisa mitigation

Her gap icin su sorulari cevapla:

1. Hard blocker mi, nice-to-have mi?
2. Aday adjacent deneyim gosterebilir mi?
3. Portfolyo veya case study ile acik kapanir mi?
4. Basvuru metninde nasil daha durust ama guclu cercevelenir?

## Blok C -- Seniority ve strateji

Sunlari acikca yaz:

1. Ilan seviyesi
2. Adayin bu archetype'teki dogal seviyesi
3. Eger hafif mismatch varsa nasil pozisyonlanmali
4. Eger downlevel riski varsa bunun pratik sonucu ne olur

## Blok D -- Maas ve piyasa

WebSearch ile arastir:

- guncel maas verisi
- sirketin comp itibari
- role talebi / doygunluk sinyali

Turkiye icin ozellikle bak:

- gross vs net acik mi?
- aylik vs yillik acik mi?
- TRY / EUR / USD acik mi?
- payroll mu contractor / EOR mu?
- maas bilgisi yoksa, buna ragmen adil bir piyasa tahmini kurulabiliyor mu?

Emin degilsen bunu soyle. Uydurma yapma.

## Blok E -- CV kisisellestirme plani

Tablo:

| # | Bolum | Mevcut durum | Onerilen degisiklik | Neden |
|---|---|---|---|---|

Top 5 CV degisikligi ve gerekiyorsa Top 5 LinkedIn degisikligi ver.

## Blok F -- Mulakat plani

6-10 STAR+R hikayesi ver:

| # | JD gereksinimi | STAR+R hikayesi | S | T | A | R | Reflection |
|---|---|---|---|---|---|---|---|

Ek olarak:

- onerilen 1 case study
- 3-5 olasi red-flag sorusu
- bu sorulara recruiter-respectful, abartisiz cevap yonu

---

## Final degerlendirme mantigi

A-F bittikten sonra, [docs/tr-scoring-framework.md](/Users/furkan/Desktop/Proje/career-ops/docs/tr-scoring-framework.md) ve `modes/tr/_shared.md` ile uyumlu sekilde su ciktiyi EKLE:

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

### 2. Zorunlu sonuc alanlari

Global Score bolumunden hemen sonra bunlari ver:

```markdown
**Red Flag Cap:** none | major | critical
**Final Score:** X.XX/5
**Confidence:** high | medium | low
**Recommendation Category:** hemen_basvur | secici_basvur | sinirda_once_dogrula | basvurma
**Borderline:** yes | no
```

### 3. Strengths

Baslik:

```markdown
## Strengths
```

Kurallar:

- 3-5 madde
- her madde kanit temelli
- en guclu fit sinyallerini one cikar

### 4. Risks

Baslik:

```markdown
## Risks
```

Kurallar:

- 3-5 madde
- bilinmeyeni bilinmeyen olarak yaz
- major / critical risk varsa net yaz

### 5. Recommendation

Baslik:

```markdown
## Recommendation
```

Bu bolumde:

- 1 cumlelik karar
- 1 kisa gerekce
- gerekiyorsa "once su 1-3 seyi dogrula" listesi

Recommendation dili pratik ve recruiter-respectful olmali:

- zayif role "denemekten zarar gelmez" deme
- dusuk confidence varsa "iyi firsat" deme
- adayin zamanini ve recruiter'in zamanini koru

---

## Conservative logic

### Borderline durumlar

Su durumlardan biri varsa net sekilde isaretle:

- final score 3.7-4.1 araliginda
- confidence low
- major red flag mevcut
- iki veya daha fazla boyut 3/5

Bu durumda recommendation category en fazla `sinirda_once_dogrula` olabilir.

### Low-confidence durumlar

Confidence `low` ise:

- bunu acikca yaz
- hangi veriler eksik oldugunu yaz
- recommendation category `hemen_basvur` olamaz
- draft application answers'i otomatik one cikarma

### Overclaiming yasagi

- Adayin bilmedigi stack'i biliyor gibi yazma
- Maas adil gorunuyor demek icin yeterli veri yoksa "belirsiz" de
- Sirket net degilse "guvenilir" deme

---

## Report kaydetme

Rapor dosyasi:

`reports/{###}-{company-slug}-{YYYY-MM-DD}.md`

Header icin parser-riskini azaltmak uzere su anahtarlar korunur:

```markdown
# Degerlendirme: {Sirket} -- {Rol}

**Date:** {YYYY-MM-DD}
**Arquetipo:** {tespit edilen archetype}
**Score:** {final score}/5
**URL:** {ilan URL}
**PDF:** {yol veya pending}
```

Rapor iskeleti:

```markdown
## A) Rol Ozeti
## B) CV Eslesmesi
## C) Seniority ve Strateji
## D) Maas ve Piyasa
## E) Kisisellestirme Plani
## F) Mulakat Plani
## Global Score
## Strengths
## Risks
## Recommendation
```

`Section G` benzeri application draft bolumu sadece su durumda eklenebilir:

- final score `>= 4.5`
- confidence `low` degil
- major / critical red flag yok

---

## Tracker yazimi

Tracker'a yazarken `Final Score` kullan.

Yani:

- capped score varsa onu kullan
- sadece weighted score'u yazma

Format mevcut sistemle ayni kalir.
