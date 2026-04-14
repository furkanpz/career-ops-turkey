# Paylaşılan Bağlam -- career-ops (Türkiye)

<!-- ============================================================
     Bu dosya Türkiye pazarı için scoring, confidence ve
     recommendation mantığını tanımlar.
     Kullanıcıya ait veriler buraya değil:
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

**KURAL:** Metrik uydurma. CV ve proof point metriği yalnızca `cv.md` ve `article-digest.md` üzerinden okunur.
**KURAL:** `article-digest.md`, proje / etki metriği konusunda `cv.md`'den daha güvenilir sayılır.
**KURAL:** Profil tercihleri yoksa varsayım yap, ama varsayım yaptığını açıkça söyle.

## Profil odaklı alanlar

`config/profile.yml` içinde şu alanlar varsa aktif olarak kullan:

- `compensation.salary_preferences`
  Maaş analizi ve piyasa adaleti yorumunda legacy `target_range` yerine önce bunu referans al.
- `language.cv_preferences`
  PDF/CV dili seçiminde önce bu alan kullanılır.
- `location_preferences`
  City / work model fit skorunda ve recommendation'da bunu referans al.
- `constraints`
  `must_haves` ve `deal_breakers` recommendation logic'e doğrudan girer.
- `automation.application`
  PDF, draft answers ve apply helper davranışında gating sinyali olarak kullanılır.

## Makine kontratı

- Tracker status label'ları her zaman canonical English kalır.
- Report machine-key'leri her zaman canonical English kalır:
  `Archetype`, `TL;DR`, `Remote`, `Comp`, `Date`, `Score`, `URL`, `PDF`, `Batch ID`
- Türkçe gövde ve Türkçe operatör metni serbesttir.

---

## Türkiye Scoring Sistemi

Bu katman `docs/tr-scoring-framework.md` ile hizalıdır.

Skor 10 ağırlıklı boyuttan oluşur ve 1-5 aralığındadır:

| Boyut | Ağırlık |
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

- `5` = güçlü pozitif sinyal, anlamlı bir sorun yok
- `4` = iyi, ama küçük çekince var
- `3` = karışık ama uygulanabilir
- `2` = zayıf fit veya belirgin risk
- `1` = zayıf / gerçekçi değil / ciddi sorun

### Zorunlu output

Her değerlendirme sonunda şunlar MUTLAKA yer alır:

- final score
- strengths
- risks
- recommendation category
- confidence

### Strengths kuralı

- En fazla 5 madde
- Her madde bir kanıta dayansın
- "iyi şirket gibi görünüyor" gibi boş ifadeler kullanma
- En güçlü 2-3 match sinyalini öne çıkar

### Risks kuralı

- En fazla 5 madde
- Belirsizliği risk gibi göstermeden yaz: "bilinmiyor", "doğrulanmadı", "açık değil"
- Riskleri blocker / major / minor olarak zihinsel olarak ayır
- Uygulanabilir mitigasyon varsa kısa not düş

---

## Confidence Kurallari

Confidence değerleri:

- `high`
- `medium`
- `low`

### `high` confidence

Şu koşulların çoğu sağlanıyorsa:

- JD ayrıntılı
- şirket kimliği net
- şehir / çalışma modeli net
- maaş veya piyasa karşılaştırması anlamlı
- dil beklentisi net
- 10 boyutun büyük kısmı doğrudan kanıtla puanlandı

### `medium` confidence

Şu durumda kullan:

- 1-2 önemli boyutta eksik veri var
- maaş veya ekip yapısı belirsiz
- ilanın kalitesi orta ama yine de karar verilebilir

### `low` confidence

Aşağıdakilerden biri varsa kullan:

- JD eksik, kopya veya dolaylı kaynaktan okunmuş
- şirket / işveren kimliği net değil
- şehir / hibrit / remote koşulları net değil
- maaş verisi yok ve piyasa verisi de zayıf
- birden fazla kaynak birbirini tutmuyor
- 3 veya daha fazla skor boyutu zayıf kanıtla puanlandı

**KURAL:** `low` confidence varsa bunu açıkça yaz. Sanki eminmiş gibi recommendation verme.

---

## Borderline Kurallari

Aşağıdaki durumlardan biri varsa case'i `borderline` olarak işaretle:

- final score `3.7-4.1` aralığında ise
- iki veya daha fazla boyut `3/5` ise
- bir major red flag varsa
- confidence `low` ise

`borderline` olduğunda:

- bunu açıkça yaz
- "hemen başvur" deme
- önce hangi 1-3 şeyin doğrulanması gerektiğini yaz

---

## Recommendation Category Kurallari

Makine-dostu kategori anahtarları:

- `hemen_basvur`
- `secici_basvur`
- `sinirda_once_dogrula`
- `basvurma`

### `hemen_basvur`

Yalnızca şu durumda:

- final score `>= 4.5`
- critical veya major red flag yok
- confidence `high` veya `medium`

### `secici_basvur`

Yalnızca şu durumda:

- final score `4.0-4.49`
- critical red flag yok
- case borderline değil veya borderline ise nedeni küçük

### `sinirda_once_dogrula`

Şu durumlardan herhangi birinde:

- final score `3.5-3.99`
- final score `>= 4.0` olsa bile confidence `low`
- herhangi bir major red flag varsa
- case borderline ise

### `basvurma`

Şu durumlardan herhangi birinde:

- final score `< 3.5`
- critical red flag varsa
- role fit veya candidate goals `1/5` ise
- iş açıkça adayın gerçek kısıtlarıyla çelişiyorsa

**KURAL:** recommendation her zaman recruiter-respectful olmalı. Zayıf vakaları "brand iyi, yine de dene" diye itme.

---

## Red Flag Caps

Red flag'ler weighted score içine gizlenmez. Ayrıca belirtilir.

### Critical red flag

Örnek:

- şüpheli veya doğrulanamayan işveren
- aldatıcı veya istismara açık maaş modeli
- rol Türkiye bazlı adayları kabul etmiyor ama ilan bunu belirsiz bırakıyor
- açıkça adayın deal-breaker'ına çarpıyor

Kural:

- final score en fazla `2.4`
- recommendation default: `basvurma`

### Major red flag

Örnek:

- maaş tamamen opak ve ek sinyaller below-market
- title / seniority / location birbiriyle çelişiyor
- employer veya legal setup belirsiz
- aşırı yüksek başvuru eforu ama getiri düşük

Kural:

- bir major red flag varsa final score en fazla `3.4`
- iki major red flag varsa final score en fazla `2.9`

---

## Global Kurallar

### ASLA

1. Eksik veriyi kesin yargı gibi yazma
2. Aday deneyimini abartma
3. Recruiter'ı zaman israfına itecek şekilde zayıf role "strong apply" deme
4. Maaş / şehir / dil belirsizken eminmiş gibi recommendation verme
5. Sadece brand nedeniyle zayıf role'i övme

### HER ZAMAN

1. `cv.md`, `config/profile.yml`, `modes/_profile.md` oku
2. Gerekiyorsa `article-digest.md` oku
3. İlk değerlendirmede `node cv-sync-check.mjs` çalıştır
4. Role archetype belirle
5. Puan verirken kanıt eksiğini not et
6. Final score, strengths, risks, recommendation category ve confidence ver
7. Borderline ve low-confidence vakaları açıkça işaretle
8. Dili Türkçe tut, ama makine için kritik report key'lerini English ve sabit bırak
