# Mod: scan — Turkiye runtime override

Bu override `modes/scan.md` ile birlikte okunur. Temel kural degismez:

- `/career-ops scan` = `node scan.mjs`
- `npm run scan` = `node scan.mjs`

## Turkiye-specific summary rules

- Ciktida birincil kaynaklari ayri belirt:
  - LinkedIn Jobs
  - Kariyer.net
  - Indeed Turkiye
  - Eleman.net
- Ikincil kaynaklari ayri belirt:
  - Secretcv
  - Yenibiris
  - ISKUR
- `skipped_blocked_source` gorulurse bunu "kaynak erisim duvari / login / 403" diye acikla. "ilan kapali" diye yorumlama.
- `portals.yml` eski TR template kullaniyorsa bunu net yaz:
  - eksik parser key'leri listele
  - mevcut `portals.yml` dosyasini ezmeden, `templates/portals.tr.example.yml` icindeki ilgili starter girislerini kendi hedef rollerine gore merge etmesi gerektigini soyle

## Safety

- LinkedIn discovery-only kaynaktir. Login gerektiren scrape veya bypass deneme.
- Sirket kariyer sayfasi ve job board sonucu cakisirsa scanner'in sectigi canonical URL'yi koru; agent olarak ikinci kez override etme.
