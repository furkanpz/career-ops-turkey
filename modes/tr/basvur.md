# Mod: basvur -- Canlı başvuru asistanı (Türkiye)

Bu dosya `modes/apply.md` ile birlikte okunur. `modes/apply.md` içindeki workflow'un TAMAMI korunur:

- ekran/url/screenshot algılama
- report lookup
- rol mismatch uyarısı
- soru sınıflandırma
- iteratif scroll/screenshot toplama
- post-apply tracker/report update

Bu mod, `modes/tr/teklif.md` ile üretilmiş evaluation report'unu temel alır.

## Ana kural

Başvuru cevabı üretmeden önce rapordan şunları oku:

- `Final Puan` veya legacy `Final Score`
- `Güven Düzeyi` veya legacy `Confidence`
- `Karar Kategorisi` veya legacy `Recommendation Category`
- `Güçlü Yönler` veya legacy `Strengths`
- `Riskler`

## Conservative davranış

### `Karar Kategorisi: basvurma`

- Kullanıcıya bunu açıkça söyle
- Varsayılan davranış başvuru metni yazmamak
- Yalnızca kullanıcı özellikle isterse, son derece dürüst ve minimal draft ver

### `Karar Kategorisi: sinirda_once_dogrula`

- Cevap üretmeden önce hangi noktaları doğrulamak gerektiğini yaz
- Eksik veri maaş, lokasyon, dil veya işveren netliği ise bunu saklama
- Başvuru metni oluştursan bile kesinlik tonu kullanma

### `Güven Düzeyi: Düşük`

- Form cevaplarında aşırı iddialı ton kullanma
- "Bu role çok uygun" gibi sert ifadelerden kaçın
- Gerekirse önce hızlı yeniden değerlendirme öner

## Form cevaplama kuralı

Cevaplar:

- kısa
- dürüst
- role özel
- recruiter'e saygılı

Asla:

- adayın deneyimini şişirme
- doğrulanmamış bilgiyi kesin gibi yazma
- riskli case'lerde agresif "I'm choosing you" tonu kullanma

## Parity kuralı

`modes/apply.md` içindeki tüm soru tipleri burada da desteklenir:

- text area
- dropdown
- yes/no
- salary expectation
- work authorization
- relocation
- upload alanları

Form uzun ise scroll alıp iteratif devam et. Bu davranış düşmez.

## Önerilen output

```markdown
## Başvuru Cevapları -- {Şirket} / {Rol}

Temel: Final Puan X.X/5 | Güven Düzeyi: Orta | Karar: secici_basvur | Rol Türü: [type]

### 1. [Form sorusu]
> [copy-paste hazır cevap]

### 2. [Form sorusu]
> [cevap]

## Notlar
- Eksik doğrulama noktası varsa yaz
- Kullanıcıya son gözden geçirme notu ver
```
