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

## PDF üretim kapısı

PDF üretimi sadece puan eşiğine göre yapılmaz. TR akışında PDF varsayılan olarak yalnızca şu durumda üretilir:

- final puan `>= 3.0`
- karar kategorisi `hemen_basvur` veya `secici_basvur`
- güven düzeyi `low` değil
- şehir / maaş / legal setup / kritik stack blocker yok

Şu durumda PDF üretme; report header'da `**PDF:** Üretilmedi` yaz ve tracker PDF kolonunu `❌` bırak:

- karar kategorisi `basvurma`
- karar kategorisi `sinirda_once_dogrula`
- güven düzeyi `low`
- role uygulanabilir görünse bile lokasyon, maaş, zorunlu onsite veya kritik stack uyumsuzluğu başvuru kararını bloke ediyorsa

Score `>= 3.0` ama karar `basvurma` ise bunu raporda açıkça "puan var ama başvuru önermiyorum" diye gerekçelendir.

## Makine kontratı

- Tracker status label'ları her zaman canonical English kalır.
- `data/tr-listings.jsonl`, pipeline note tag'leri ve tracker status'ları internal canonical değerleri kullanır:
  `remote`, `hybrid`, `on_site`, `field`, `unspecified`, `full_time`, `transparent`, `opaque`, `high`, `medium`, `low`.
- Report'un kullanıcıya görünen yüzeyi doğal Türkiye Türkçesi olur. Yeni raporlarda canonical English key göstermeyin.
- Dashboard/parser geriye uyumlu şekilde hem eski English key'leri hem de yeni Türkçe key'leri okur.

### Doğal Türkçe report sözlüğü

Yeni TR raporlarda şu görünür label'ları kullan:

| İç anlam | Görünür label |
|---|---|
| Archetype | Rol Türü |
| TL;DR | Kısa Özet |
| Remote / Work Model | Çalışma Modeli |
| Comp | Ücret |
| Legitimacy | İlan Gerçekliği |
| Assessment | Sonuç |
| City | Şehir |
| Language | İlan Dili |
| Employment Type | Çalışma Türü |
| Salary Transparency | Maaş Bilgisi |
| Confidence | Güven Düzeyi |
| Global Score | Genel Puan |
| Dimension | Kriter |
| Weight | Ağırlık |
| Final Score | Final Puan |
| Red Flag Cap | Risk Tavanı |
| Recommendation Category | Karar Kategorisi |
| Borderline | Sınırda mı? |
| Strengths | Güçlü Yönler |
| Risks | Riskler |
| Recommendation | Karar |
| Keywords extracted | ATS Anahtar Kelimeleri |

Görünür değerleri de doğal Türkçe yaz:

| Internal value | Görünür Türkçe |
|---|---|
| remote | Uzaktan |
| hybrid | Hibrit |
| on_site | Ofisten |
| field | Sahada |
| unspecified | Belirtilmemiş |
| full_time | Tam zamanlı |
| part_time | Yarı zamanlı |
| contract | Sözleşmeli |
| freelance | Freelance |
| transparent | Açık |
| market_range | Piyasa bandı verilmiş |
| opaque | Belirtilmemiş |
| unknown | Bilinmiyor |
| high / medium / low | Yüksek / Orta / Düşük |
| none / major / critical | Yok / Ciddi / Kritik |
| Positive / Neutral / Concerning | Olumlu / Nötr / Riskli |
| High Confidence / Proceed with Caution / Suspicious | Yüksek güven / Önce doğrula / Şüpheli |

### Türkiye metadata kontratı

Bir ilan değerlendirmesi, batch işi veya auto-pipeline report'u şu metadata bloğunu header'a yakın ekler:

```markdown
**Şehir:** {istanbul|ankara|izmir|remote|Bilinmiyor}
**Çalışma Modeli:** {Uzaktan|Hibrit|Ofisten|Sahada|Belirtilmemiş}
**İlan Dili:** {Türkçe|İngilizce|Türkçe + İngilizce|Almanca|Fransızca|Arapça|Rusça|Çok dilli|Belirtilmemiş}
**Çalışma Türü:** {Tam zamanlı|Yarı zamanlı|Sözleşmeli|Staj|Geçici|Freelance|Danışmanlık|Çıraklık|Belirtilmemiş}
**Maaş Bilgisi:** {Açık|Piyasa bandı verilmiş|Belirtilmemiş|Bilinmiyor}
**Kaynak:** {portal veya şirket kariyer sayfası}
**Güven Düzeyi:** {Yüksek|Orta|Düşük}
```

Bu alanlar dashboard ve scanner sidecar ile aynı anlamdadır. Emin değilsen alan tipine göre güvenli değer kullan: şehir ve maaş için `Bilinmiyor`, çalışma modeli / ilan dili / çalışma türü için `Belirtilmemiş`; kesin veri gibi davranma.

---

## Türkiye Scoring Sistemi

Bu katman `docs/tr-scoring-framework.md` ile hizalıdır.

Skor 10 ağırlıklı boyuttan oluşur ve 1-5 aralığındadır:

| Boyut | Ağırlık |
|---|---:|
| Rol Uyumu | 18 |
| Aday Hedefleriyle Uyum | 12 |
| Kıdem Uyumu | 10 |
| Şehir / Çalışma Modeli Uyumu | 10 |
| Dil Uyumu | 8 |
| Maaş Bilgisi / Piyasa Uyumu | 12 |
| İlan Kalitesi | 8 |
| Şirket Netliği / İşe Alım Güveni | 8 |
| Başvuru Eforu | 6 |
| Mülakata Kalma İhtimali | 8 |

### Skor ilkeleri

- `5` = güçlü pozitif sinyal, anlamlı bir sorun yok
- `4` = iyi, ama küçük çekince var
- `3` = karışık ama uygulanabilir
- `2` = zayıf fit veya belirgin risk
- `1` = zayıf / gerçekçi değil / ciddi sorun

### Zorunlu output

Her değerlendirme sonunda şunlar MUTLAKA yer alır:

- final score
- güçlü yönler
- riskler
- karar kategorisi
- güven düzeyi

### Güçlü Yönler kuralı

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

## Güven Düzeyi Kuralları

İç güven değerleri:

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

## Sınırda Vaka Kuralları

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

## Karar Kategorisi Kuralları

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

## Risk Tavanları

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
6. Final puan, güçlü yönler, riskler, karar kategorisi ve güven düzeyi ver
7. Sınırda ve düşük güvenli vakaları açıkça işaretle
8. Report görünür yüzeyini doğal Türkçe tut; internal tracker/tag/sidecar değerlerini canonical bırak
