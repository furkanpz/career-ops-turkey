# Mod: basvur -- Canli basvuru asistani (Turkiye)

Bu dosya `modes/apply.md` ile birlikte okunur. `modes/apply.md` icindeki workflow'un TAMAMI korunur:

- ekran/url/screenshot algilama
- report lookup
- rol mismatch uyarisi
- soru siniflandirma
- iteratif scroll/screenshot toplama
- post-apply tracker/report update

Bu mod, `modes/tr/teklif.md` ile uretilmis evaluation report'unu temel alir.

## Ana kural

Basvuru cevabi uretmeden once rapordan sunlari oku:

- `Final Score`
- `Confidence`
- `Recommendation Category`
- `Strengths`
- `Risks`

## Conservative davranis

### `Recommendation Category: basvurma`

- Kullaniciya bunu acikca soyle
- Varsayilan davranis basvuru metni yazmamak
- Yalnizca kullanici ozellikle isterse, son derece durust ve minimal draft ver

### `Recommendation Category: sinirda_once_dogrula`

- Cevap uretmeden once hangi noktalari dogrulamak gerektigini yaz
- Eksik veri maas, lokasyon, dil veya isveren netligi ise bunu saklama
- Basvuru metni olustursan bile kesinlik tonu kullanma

### `Confidence: low`

- Form cevaplarinda asiri iddiali ton kullanma
- "Bu role cok uygun" gibi sert ifadelerden kacin
- Gerekirse once hizli yeniden degerlendirme oner

## Form cevaplama kurali

Cevaplar:

- kisa
- durust
- role ozel
- recruiter'e saygili

Asla:

- adayin deneyimini sisirme
- dogrulanmamis bilgiyi kesin gibi yazma
- riskli case'lerde agresif "I'm choosing you" tonu kullanma

## Parity kurali

`modes/apply.md` icindeki tum soru tipleri burada da desteklenir:

- text area
- dropdown
- yes/no
- salary expectation
- work authorization
- relocation
- upload alanlari

Form uzun ise scroll alip iteratif devam et. Bu davranis dusmez.

## Onerilen output

```markdown
## Basvuru Cevaplari -- {Sirket} / {Rol}

Temel: Final Score X.X/5 | Confidence: medium | Recommendation: secici_basvur | Archetype: [type]

### 1. [Form sorusu]
> [copy-paste hazir cevap]

### 2. [Form sorusu]
> [cevap]

## Notlar
- Eksik dogrulama noktasi varsa yaz
- Kullaniciya son gozden gecirme notu ver
```
