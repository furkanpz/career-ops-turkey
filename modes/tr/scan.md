# Mod: scan — Türkiye runtime uyarlaması

Bu uyarlama `modes/scan.md` ile birlikte okunur. Temel kural değişmez:

- `/career-ops scan` = `node scan.mjs`
- `npm run scan` = `node scan.mjs`

## Türkiye-specific summary rules

- Çıktıda birincil kaynakları ayrı belirt:
  - LinkedIn Jobs
  - Kariyer.net
  - Indeed Türkiye
  - Eleman.net
- İkincil kaynakları ayrı belirt:
  - Secretcv
  - Yenibiris
  - ISKUR
  - Techcareer.net
  - Youthall
- `skipped_blocked_source` görülürse bunu "kaynak erişim duvarı / login / 403" diye açıkla. "ilan kapalı" diye yorumlama.
- `portals.yml` eski TR template kullanıyorsa bunu net yaz:
  - eksik parser key'leri listele
  - mevcut `portals.yml` dosyasını ezmeden, `templates/portals.tr.example.yml` içindeki ilgili starter girişlerini kendi hedef rollerine göre merge etmesi gerektiğini söyle

## Safety

- LinkedIn discovery-only kaynaktır. Login gerektiren scrape veya bypass deneme.
- Şirket kariyer sayfası ve job board sonucu çakışırsa scanner'ın seçtiği canonical URL'yi koru; agent olarak ikinci kez override etme.
