# Paylasilan Baglam -- career-ops (Turkiye)

<!-- ============================================================
     Bu dosya Turkiye pazari icin scoring, confidence ve
     recommendation mantigini tanimlar.
     Kullaniciya ait veriler buraya degil:
     - config/profile.yml
     - modes/_profile.md
     ============================================================ -->

## Truth Sources

| Dosya | Yol | Ne zaman |
|---|---|---|
| cv.md | `cv.md` | HER ZAMAN |
| article-digest.md | `article-digest.md` | Varsa, HER ZAMAN |
| profile.yml | `config/profile.yml` | HER ZAMAN |
| _profile.md | `modes/_profile.md` | HER ZAMAN, bunu bu dosyadan sonra oku |

**KURAL:** Metrik uydurma. CV ve proof point metrigi sadece `cv.md` ve `article-digest.md` uzerinden okunur.
**KURAL:** `article-digest.md`, proje / etki metrigi konusunda `cv.md`'den daha guvenilir sayilir.
**KURAL:** Profil tercihleri yoksa varsayim yap, ama varsayim yaptigini acikca soyle.

---

## Turkiye Scoring Sistemi

Bu katman [docs/tr-scoring-framework.md](/Users/furkan/Desktop/Proje/career-ops/docs/tr-scoring-framework.md) ile hizalidir.

Skor 10 agirlikli boyuttan olusur ve 1-5 araligindadir:

| Boyut | Agirlik |
|---|---:|
| Role Fit | 18 |
| Alignment With Candidate Goals | 12 |
| Seniority Fit | 10 |
| City / Work Model Fit | 10 |
| Language Fit | 8 |
| Salary Transparency / Market Fairness | 12 |
| Posting Quality | 8 |
| Company Clarity / Hiring Credibility | 8 |
| Application Effort | 6 |
| Interview Likelihood | 8 |

### Skor ilkeleri

- `5` = guclu pozitif sinyal, anlamli bir sorun yok
- `4` = iyi, ama kucuk cekince var
- `3` = karisik ama uygulanabilir
- `2` = zayif fit veya belirgin risk
- `1` = zayif / gercekci degil / ciddi sorun

### Zorunlu output

Her degerlendirme sonunda sunlar MUTLAKA yer alir:

- final score
- strengths
- risks
- recommendation category
- confidence

### Strengths kurali

- En fazla 5 madde
- Her madde bir kanita dayansin
- "iyi sirket gibi gorunuyor" gibi bos ifadeler kullanma
- En guclu 2-3 match sinyalini one cikar

### Risks kurali

- En fazla 5 madde
- Belirsizligi risk gibi gostermeden yaz: "bilinmiyor", "dogrulanmadi", "acik degil"
- Riskleri blocker / major / minor olarak zihinsel olarak ayir
- Uygulanabilir mitigasyon varsa kisa not dus

---

## Confidence Kurallari

Confidence degerleri:

- `high`
- `medium`
- `low`

### `high` confidence

Su kosullarin cogu saglaniyorsa:

- JD ayrintili
- sirket kimligi net
- sehir / calisma modeli net
- maas veya piyasa karsilastirmasi anlamli
- dil beklentisi net
- 10 boyutun buyuk kismi dogrudan kanitla puanlandi

### `medium` confidence

Su durumda kullan:

- 1-2 onemli boyutta eksik veri var
- maas veya ekip yapisi belirsiz
- ilanin kalitesi orta ama yine de karar verilebilir

### `low` confidence

Asagidakilerden biri varsa kullan:

- JD eksik, kopya veya dolayli kaynaktan okunmus
- sirket / isveren kimligi net degil
- sehir / hibrit / remote kosullari net degil
- maas verisi yok ve piyasa verisi de zayif
- birden fazla kaynak birbirini tutmuyor
- 3 veya daha fazla skor boyutu zayif kanitla puanlandi

**KURAL:** `low` confidence varsa bunu acikca yaz. Sanki eminmis gibi recommendation verme.

---

## Borderline Kurallari

Asagidaki durumlardan biri varsa case'i `borderline` olarak isaretle:

- final score `3.7-4.1` araliginda ise
- iki veya daha fazla boyut `3/5` ise
- bir major red flag varsa
- confidence `low` ise

`borderline` oldugunda:

- bunu acikca yaz
- "hemen basvur" deme
- once hangi 1-3 seyin dogrulanmasi gerektigini yaz

---

## Recommendation Category Kurallari

Makine-dostu kategori anahtarlari:

- `hemen_basvur`
- `secici_basvur`
- `sinirda_once_dogrula`
- `basvurma`

### `hemen_basvur`

Yalnizca su durumda:

- final score `>= 4.5`
- critical veya major red flag yok
- confidence `high` veya `medium`

### `secici_basvur`

Yalnizca su durumda:

- final score `4.0-4.49`
- critical red flag yok
- case borderline degil veya borderline ise nedeni kucuk

### `sinirda_once_dogrula`

Su durumlardan herhangi birinde:

- final score `3.5-3.99`
- final score `>= 4.0` olsa bile confidence `low`
- herhangi bir major red flag varsa
- case borderline ise

### `basvurma`

Su durumlardan herhangi birinde:

- final score `< 3.5`
- critical red flag varsa
- role fit veya candidate goals `1/5` ise
- is acikca adayin gercek kisitlariyla celisiyorsa

**KURAL:** recommendation her zaman recruiter-respectful olmali. Zayif vakalari "brand iyi, yine de dene" diye itme.

---

## Red Flag Caps

Red flag'ler weighted score icine gizlenmez. Ayrica belirtilir.

### Critical red flag

Ornek:

- supheli veya dogrulanamayan isveren
- aldatici veya istismara acik maas modeli
- role Turkiye bazli adaylari kabul etmiyor ama ilan bunu belirsiz birakiyor
- acikca adayin deal-breaker'ina carpiyor

Kural:

- final score en fazla `2.4`
- recommendation default: `basvurma`

### Major red flag

Ornek:

- maas tamamen opak ve ek sinyaller below-market
- title / seniority / location birbiriyle celisiyor
- employer veya legal setup belirsiz
- asiri yuksek basvuru eforu ama getiri dusuk

Kural:

- bir major red flag varsa final score en fazla `3.4`
- iki major red flag varsa final score en fazla `2.9`

---

## Global Kurallar

### ASLA

1. Eksik veriyi kesin yargi gibi yazma
2. Aday deneyimini abartma
3. Recruiter'i zaman israfina itecek sekilde zayif role "strong apply" deme
4. Maas / sehir / dil belirsizken eminmis gibi recommendation verme
5. Sadece brand nedeniyle zayif role'i ovme

### HER ZAMAN

1. `cv.md`, `config/profile.yml`, `modes/_profile.md` oku
2. Gerekiyorsa `article-digest.md` oku
3. Ilk degerlendirmede `node cv-sync-check.mjs` calistir
4. Role archetype belirle
5. Puan verirken kanit eksigini not et
6. Final score, strengths, risks, recommendation category ve confidence ver
7. Borderline ve low-confidence vakalari acikca isaretle
8. Dili Turkce tut, ama makine icin kritik report key'lerini sabit birak
