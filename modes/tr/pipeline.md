# Mod: pipeline -- TR URL inbox isleme

`data/pipeline.md` icindeki birikmis ilan URL'lerini isler.

## Workflow

1. `data/pipeline.md` oku
2. `Pendientes` altindaki `- [ ]` kayitlari bul
3. Her URL icin:
   - JD cikar
   - `modes/tr/teklif.md` mantigi ile A-F degerlendirmesi yap
   - final score, confidence ve recommendation category uret
   - gerekiyorsa PDF
   - tracker girisi yaz
4. `Procesadas` alanina ozet satiri tasi

## Ozet tablo

Islem sonunda su tabloyu goster:

```markdown
| # | Sirket | Rol | Final Score | Confidence | Recommendation | PDF |
|---|---|---|---|---|---|---|
```

## Conservative kural

Su durumda otomatik pozitif ton kullanma:

- recommendation `sinirda_once_dogrula`
- recommendation `basvurma`
- confidence `low`

Bu vakalarda ozet satirinda bunu acikca belirt:

- `dogrula`
- `sinirda`
- `dusuk guven`

## Sync

Pipeline baslamadan once:

```bash
node cv-sync-check.mjs
```

Uyari varsa kullaniciya bildir.
