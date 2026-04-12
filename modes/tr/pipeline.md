# Mod: pipeline -- TR URL inbox isleme

Bu dosya `modes/pipeline.md` ile birlikte okunur. `modes/pipeline.md` icindeki TAM behavior korunur:

- sequential report numbering
- Playwright -> WebFetch -> WebSearch fallback zinciri
- `local:jds/*` destegi
- erisilemeyen URL'leri `- [!]` olarak isaretleme
- 3+ URL icin paralel agent kullanimi
- pending -> processed tasima

`data/pipeline.md` icindeki birikmis ilan URL'lerini isler.

## Workflow

1. `data/pipeline.md` oku
2. `Pendientes` altindaki `- [ ]` kayitlari bul
3. Her URL icin:
   - rapor numarasini sirali hesapla
   - JD cikar
   - `modes/tr/teklif.md` mantigi ile A-F degerlendirmesi yap
   - final score, confidence ve recommendation category uret
   - root pipeline kuralina gore PDF gerekiyorsa uret
   - tracker girisi yaz
   - erisim hatasi varsa `- [!]` olarak not dus
4. Var olan basliklari bozma:
   - legacy `Pendientes` / `Procesadas`
   - veya English `Pending` / `Processed`
   Hangi stil dosyada varsa onu koru

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
