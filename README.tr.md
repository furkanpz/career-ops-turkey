# Career-Ops Turkey

[Türkçe](README.md) | [English](README.en.md) | [Español](README.es.md) | [Português (Brasil)](README.pt-BR.md) | [한국어](README.ko-KR.md) | [日本語](README.ja.md) | [Русский](README.ru.md) | [繁體中文](README.zh-TW.md)

<p align="center">
  <img src="docs/hero-banner.jpg" alt="Career-Ops — Çok Ajanlı İş Arama Sistemi" width="800">
</p>

<p align="center">
  <em>Türkiye ve EMEA odaklı iş arama pipeline'ı.</em><br>
  Şirketler adayları elemek için yapay zekâ kullanıyor. <strong>Career-Ops adaylara şirketleri <em>seçebilmeleri</em> için yapay zekâ verir.</strong><br>
  <em>Bu fork, Türkiye pazarı için sürdürülür.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white" alt="Claude Code">
  <img src="https://img.shields.io/badge/OpenCode-111827?style=flat&logo=terminal&logoColor=white" alt="OpenCode">
  <img src="https://img.shields.io/badge/Codex-10A37F?style=flat&logo=openai&logoColor=white" alt="Codex">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white" alt="Playwright">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT">
  <br>
  <img src="https://img.shields.io/badge/EN-blue?style=flat" alt="EN">
  <img src="https://img.shields.io/badge/ES-red?style=flat" alt="ES">
  <img src="https://img.shields.io/badge/DE-grey?style=flat" alt="DE">
  <img src="https://img.shields.io/badge/FR-blue?style=flat" alt="FR">
  <img src="https://img.shields.io/badge/PT--BR-green?style=flat" alt="PT-BR">
  <img src="https://img.shields.io/badge/TR-red?style=flat" alt="TR">
  <img src="https://img.shields.io/badge/KO-white?style=flat" alt="KO">
  <img src="https://img.shields.io/badge/JA-red?style=flat" alt="JA">
  <img src="https://img.shields.io/badge/ZH--TW-blue?style=flat" alt="ZH-TW">
</p>

---

<p align="center">
  <img src="docs/demo.gif" alt="Career-Ops Demo" width="800">
</p>

<p align="center"><strong>Türkiye/EMEA odaklı iş arama pipeline'ı · MIT lisanslı Career-Ops fork'u · Furkan Uyar tarafından sürdürülür</strong></p>


> **Durum uyarısı:** Türkiye fork'u henüz tamamlanmış kabul edilmemelidir. Dil/locale katmanı, Türkiye iş panoları, fork kimliği ve update davranışı üzerinde çalışmalar ilerlese de manuel kontroller bitmedi. Production kullanımından önce `npm run doctor`, örnek tarama/değerlendirme akışları ve başvuru çıktıları kendi ortamınızda ayrıca doğrulanmalıdır.

## Bu Nedir

Career-Ops, herhangi bir yapay zekâ kodlama CLI'ını tam teşekküllü bir iş arama komuta merkezine dönüştürür. Başvuruları bir tabloda manuel takip etmek yerine, size şunları sunan bir yapay zekâ iş akışı elde edersiniz:

- **İlanları değerlendirir**: 10 ağırlıklı boyut ve ilan güvenilirliği kontrolünden oluşan yapılandırılmış A-G puanlama sistemi
- **Kişiselleştirilmiş PDF üretir**: Her iş tanımına göre uyarlanan ATS uyumlu CV'ler
- **Portalları tarar**: Takip edilen şirket kariyer sayfaları + LinkedIn Jobs, Kariyer.net, Indeed Türkiye, Eleman.net, Secretcv, Yenibiris, ISKUR
- **Toplu işler**: 10+ ilanı paralel alt ajanlarla değerlendirir
- **Her şeyi takip eder**: Bütünlük kontrolleriyle tek bir doğruluk kaynağında toplar

> **Önemli: Bu bir toplu başvuru aracı değildir.** Career-Ops bir filtredir; yüzlerce ilan içinden gerçekten zamanınıza değecek az sayıdaki fırsatı bulmanıza yardım eder. Sistem, 4.0/5 altındaki ilanlara başvurmayı açık biçimde önermemek üzere tasarlanmıştır. Sizin zamanınız da değerli, işe alım tarafının zamanı da. Göndermeden önce her zaman son kontrolü siz yapın.

Career-Ops ajaniktir: Claude Code, Playwright ile kariyer sayfalarında gezinir, CV'niz ile iş tanımını anahtar kelime eşleştirmesiyle değil akıl yürüterek karşılaştırır ve özgeçmişinizi her ilana göre yeniden şekillendirir.

> **İlk değerlendirmelerin kusursuz olmasını beklemeyin.** Sistem sizi başta yeterince tanımaz. Ona CV'nizi, kariyer anlatınızı, kanıt noktalarınızı, tercihlerinizi, güçlü olduğunuz alanları ve kaçınmak istediklerinizi verin. Ne kadar iyi beslerseniz, o kadar isabetli filtreler. Bunu yeni işe alınmış bir recruiter'ı eğitmek gibi düşünün: ilk hafta sizi öğrenir, sonrasında ciddi değer üretir.

Bu fork, Santiago Fernández de Valderrama tarafından geliştirilen MIT lisanslı [Career-Ops](https://github.com/santifer/career-ops) projesi üzerine kuruludur. Türkiye/EMEA iş panoları, Türkçe modlar, fork kimliği ve güncelleme davranışı Furkan Uyar tarafından sürdürülür.

## Özellikler

| Özellik | Açıklama |
|---------|----------|
| **Auto-Pipeline** | Bir URL yapıştırın; tam değerlendirme + PDF + takip kaydı alın |
| **7 Bloklu Değerlendirme** | Rol özeti, CV uyumu, seviye stratejisi, ücret araştırması, kişiselleştirme, mülakat hazırlığı (STAR+R), ilan güvenilirliği |
| **Mülakat Hikâye Bankası** | Değerlendirmeler boyunca STAR+Reflection hikâyeleri biriktirir; davranışsal soruların çoğunu karşılayacak 5-10 ana hikâye oluşturur |
| **Müzakere Senaryoları** | Maaş pazarlığı çerçeveleri, coğrafi indirim itirazları, rakip teklif kaldıraçları |
| **ATS PDF Üretimi** | Space Grotesk + DM Sans tasarımıyla anahtar kelime uyumlu CV'ler |
| **Portal Tarayıcı** | Takip edilen şirketler, Türkiye odaklı iş panoları ve EMEA ATS keşfi için Playwright canlılık kontrolüyle çalışan tek `scan.mjs` runtime'ı |
| **Toplu İşleme** | `claude -p` worker'ları ile paralel toplu değerlendirme |
| **Dashboard TUI** | İlerleme analitiği, açık/koyu Catppuccin temaları, vim hareketleri, manuel refresh ve gelişmiş markdown/tablo görünümü sunan terminal arayüzü |
| **İnsan Onayı** | Yapay zekâ değerlendirir ve önerir; kararı ve aksiyonu siz verirsiniz. Sistem asla sizin yerinize başvuru göndermez |
| **İş Akışı Bütünlüğü** | Otomatik birleştirme, tekrar kayıt azaltma, durum normalizasyonu ve sağlık kontrolleri |

## Hızlı Başlangıç

```bash
# 1. Repoyu klonlayın ve bağımlılıkları kurun
git clone https://github.com/furkanpz/career-ops-turkey.git
cd career-ops-turkey && npm install
npx playwright install chromium   # PDF üretimi ve tarayıcı canlılık kontrolleri için gerekli

# 2. Kurulumu doğrulayın
npm run doctor                     # Tüm ön koşulları doğrular

# 3. Yapılandırın
cp config/profile.tr.example.yml config/profile.yml
cp templates/portals.tr.example.yml portals.yml
# Global başlangıç şablonları da hazırdır:
# cp config/profile.example.yml config/profile.yml
# cp templates/portals.example.yml portals.yml

# 4. CV'nizi ekleyin
# Proje kökünde Markdown formatında bir cv.md oluşturun

# 5. Claude ile kişiselleştirin
claude   # Bu dizinde Claude Code'u açın

# Sonrasında Claude'a sistemi size göre uyarlamasını isteyin:
# "Arketipleri backend engineering rollerine göre güncelle"
# "Modları İngilizceye çevir"
# "portals.yml dosyasına şu 5 şirketi ekle"
# "Yapıştırdığım CV ile profilimi güncelle"

# 6. Kullanmaya başlayın
# Bir iş ilanı URL'si yapıştırın veya /career-ops çalıştırın
```

> **Sistem, doğrudan Claude tarafından özelleştirilecek şekilde tasarlanmıştır.** Türkiye fork'u dil/pazar davranışını, pazar sezgilerini ve iş panosu kapsamını değiştirir. Sizin hedef rolleriniz, anahtar kelimeleriniz, şirket listeniz ve kişisel anlatınız ise hâlâ `config/profile.yml`, `modes/_profile.md`, `article-digest.md` veya `portals.yml` içinde tutulmalıdır.

Tam kurulum rehberi için [docs/SETUP.md](docs/SETUP.md) dosyasına bakın.

Bu forkta Türkiye odaklı kullanım birinci sınıf vatandaş olarak ele alınır: `config/profile.yml` içinde `language.modes_dir: modes/tr` ayarlayın veya Claude'a Türkiye pazarı akışları için `modes/tr/` kullanmasını söyleyin. Bu, sabit bir rol paketi değil; Türkiye pazarı ve dil uyarlamasıdır. Canonical komutlar değişmez ve belgelenmiş Türkçe alias'lar desteklenir: `teklif` → değerlendirme, `basvur` → canlı başvuru yardımı.

Bu forkun uyumluluk kapsamı upstream `v1.4` ürün yüzeyini, ek dil/locale paketlerini ve repo/community varlıklarını takip eder; aynı zamanda Türkiye locale katmanını, fork kimliğini ve fork-safe update channel davranışını korur.

Türkçe workflow'larda bile parser-safe rapor anahtarları canonical ve İngilizce kalır:
`Archetype`, `TL;DR`, `Remote`, `Comp`, `Date`, `Score`, `URL`, `PDF`, `Batch ID`.

## Kullanım

Career-Ops, birden fazla mod barındıran tek bir slash command yüzeyidir:

```
/career-ops                → Tüm kullanılabilir komutları göster
/career-ops {bir JD yapıştır} → Tam auto-pipeline (değerlendirme + PDF + tracker)
/career-ops scan           → Portallarda yeni ilanları tara
/career-ops pdf            → ATS uyumlu CV üret
/career-ops batch          → Birden fazla ilanı toplu değerlendir
/career-ops tracker        → Başvuru durumunu görüntüle
/career-ops apply          → Başvuru formlarını yapay zekâ ile doldur
/career-ops pipeline       → Bekleyen URL'leri işle
/career-ops contacto       → LinkedIn outreach mesajı hazırla
/career-ops deep           → Şirket hakkında derin araştırma yap
/career-ops interview-prep → Şirkete özel mülakat araştırması yap
/career-ops training       → Kurs/sertifika değerlendir
/career-ops project        → Portföy projesi fikri değerlendir
/career-ops patterns       → Red kalıplarını analiz et
/career-ops followup       → Follow-up temposunu ve taslak mesajları yönet
/career-ops teklif         → Tekil değerlendirme için Türkçe alias
/career-ops basvur         → Canlı başvuru yardımı için Türkçe alias
```

İsterseniz doğrudan iş ilanı URL'sini veya açıklamasını yapıştırın; Career-Ops bunu algılar ve tam pipeline'ı başlatır.

Tarayıcı runtime'ında CLI ve slash-command yolları artık aynı davranır:

```bash
npm run scan
```

## Nasıl Çalışır

```
Bir iş ilanı URL'si veya açıklaması yapıştırırsınız
                │
                ▼
┌──────────────────┐
│  Arketip         │  Kullanıcı için en uygun rol ailesini sınıflandırır
│  Tespiti         │
└────────┬─────────┘
         │
┌────────▼─────────┐
│  A-G             │  Uyum, boşluklar, ücret araştırması, STAR hikâyeleri, güvenilirlik
│  Değerlendirme   │
│  (cv.md okunur)  │
└────────┬─────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
 Report  PDF  Tracker
  .md   .pdf   .tsv
```

## Ön Tanımlı Portallar

Bu fork, Türkiye / EMEA keşfi için varsayılan olarak `templates/portals.tr.example.yml` kullanır. Global şablon hâlâ mevcuttur; ancak bu repo için desteklenen varsayılan başlangıç noktası TR şablonudur.

TR başlangıç şablonu bilinçli olarak teknoloji odaklı ve geneldir. Sabit bir aday profili olarak değil, sizin hedef rol ailelerinize göre özelleştirilecek bir başlangıç katmanı olarak düşünülmelidir.

Tarayıcı artık hem `/career-ops scan` hem de `npm run scan` için tek runtime (`scan.mjs`) kullanır. Bu runtime şunları birleştirir:

- ATS API'leri veya doğrudan kariyer sayfaları üzerinden takip edilen şirket taramaları
- Türkiye ve EMEA iş panoları için search-query tabanlı keşif
- Sonuçlar pipeline'a girmeden önce Playwright ile canlılık doğrulaması

Şablondaki birincil Türkiye board kapsamı:

- LinkedIn Jobs
- Kariyer.net
- Indeed Türkiye
- Eleman.net

Şablondaki ikincil Türkiye board kapsamı:

- Secretcv
- Yenibiris
- ISKUR

TR başlangıç şablonu ayrıca Trendyol, Getir, Dream Games, Insider, Papara, iyzico, Logo Yazılım, Etiya, Yemeksepeti ve Çiçeksepeti gibi Türkiye çıkışlı işverenlerin ve açık kariyer yüzeylerinin takip edilen şirket katmanını içerir. Buna ek olarak bir Bilişim Vadisi kariyer keşif sorgusu ve bir letgo fallback sorgusu da bulunur.

Bu forkta LinkedIn yalnızca keşif kaynağıdır. Giriş gerektiren veya kimlik doğrulamalı scraping bu kapsamın bilinçli olarak dışındadır.

Upstream davranış burada da geçerlidir: scanner kapsamı ve locale sezgileri sistem katmanında yaşar; ancak gerçek hedef rolleriniz, anahtar kelimeleriniz ve takip edilen şirket listeniz kullanıcı katmanındaki `portals.yml` dosyasında tutulmalıdır.

Güncellemeler `portals.yml` dosyanızı otomatik merge etmez. Dosyanız güncel TR şablonundan eskiyse `doctor` ve `scan`, hangi parser anahtarlarının eksik olduğunu söyleyerek sizi uyarır.

## Dashboard TUI

Yerleşik terminal dashboard'u pipeline'ınızı görsel olarak gezmenizi sağlar:

```bash
cd dashboard
go build -o career-dashboard .
./career-dashboard --path ..
```

Öne çıkanlar: 6 filtre sekmesi, 4 sıralama modu, grouped/flat görünüm, lazy-loaded preview'lar, inline durum değişiklikleri, ilerleme analitiği, vim hareketleri (`hjkl`, `g`, `G`), manuel refresh (`r`) ve otomatik Catppuccin açık/koyu tema seçimi.

## Proje Yapısı

```text
career-ops-turkey/
├── CLAUDE.md                    # Ajan talimatları
├── followup-cadence.mjs         # Follow-up temposu analizi
├── cv.md                        # CV'niz (siz oluşturursunuz)
├── article-digest.md            # Kanıt noktalarınız (opsiyonel)
├── config/
│   ├── profile.example.yml      # Varsayılan/global profil şablonu
│   └── profile.tr.example.yml   # Türkiye odaklı profil şablonu
├── modes/                       # Kök canonical mod seti
│   ├── _shared.md               # Paylaşılan sistem bağlamı (kullanıcı özelleştirmesi için değil)
│   ├── oferta.md                # Tekil değerlendirme
│   ├── pdf.md                   # PDF üretimi
│   ├── scan.md                  # Portal tarayıcı
│   ├── batch.md                 # Batch işleme
│   ├── tr/                      # Türkiye / EMEA override katmanı
│   └── ...
├── tracker-status-registry.json # Canonical makine durumu kaydı
├── templates/
│   ├── cv-template.html         # Eski/İspanyolca uyumlu CV şablonu
│   ├── cv-template.en.html      # İngilizce ATS şablonu
│   ├── cv-template.tr.html      # Türkçe ATS şablonu
│   ├── portals.example.yml      # Varsayılan/global tarayıcı yapılandırması
│   ├── portals.tr.example.yml   # Türkiye / EMEA tarayıcı yapılandırması
│   └── states.yml               # İnsan tarafından okunabilir durum aynası
├── batch/
│   ├── batch-prompt.md          # Kendine yeterli worker prompt'u
│   └── batch-runner.sh          # Orkestrasyon betiği
├── dashboard/                   # Go TUI pipeline görüntüleyici
├── data/                        # Takip verileriniz (gitignored)
├── reports/                     # Değerlendirme raporları (gitignored)
├── output/                      # Üretilen PDF'ler (gitignored)
├── fonts/                       # Space Grotesk + DM Sans
├── docs/                        # Kurulum, özelleştirme, mimari
└── examples/                    # Örnek CV, rapor, proof point'ler
```

## Teknoloji Yığını

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **Ajan**: Özel skill ve modlarla Claude Code
- **PDF**: Playwright/Puppeteer + HTML şablon
- **Tarayıcı**: Playwright + Greenhouse API + WebSearch keşfi
- **Dashboard**: Go + Bubble Tea + Lipgloss (otomatik Catppuccin açık/koyu temaları)
- **Veri**: Markdown tablolar + YAML yapılandırması + TSV batch dosyaları

## Krediler

Career-Ops Turkey, Santiago Fernández de Valderrama'nın MIT lisanslı [Career-Ops](https://github.com/santifer/career-ops) projesinden fork edilmiştir. Orijinal copyright bildirimi [LICENSE](LICENSE) içinde korunur; bu Türkiye fork'u Furkan Uyar tarafından sürdürülür.

## Yıldız Geçmişi

<a href="https://www.star-history.com/?repos=furkanpz%2Fcareer-ops-turkey&type=timeline&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=furkanpz/career-ops-turkey&type=timeline&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=furkanpz/career-ops-turkey&type=timeline&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=furkanpz/career-ops-turkey&type=timeline&legend=top-left" />
 </picture>
</a>

## Sorumluluk Reddi

**career-ops, yerelde çalışan açık kaynak bir araçtır; barındırılan bir servis değildir.** Bu yazılımı kullanarak şunları kabul etmiş olursunuz:

1. **Verinizin kontrolü sizdedir.** CV'niz, iletişim bilgileriniz ve kişisel verileriniz kendi makinenizde kalır; yalnızca seçtiğiniz yapay zekâ sağlayıcısına (Anthropic, OpenAI vb.) doğrudan gönderilir. Bu verileri toplamıyoruz, saklamıyoruz ve erişmiyoruz.
2. **Yapay zekânın kontrolü sizdedir.** Varsayılan prompt'lar yapay zekâya başvuruları otomatik göndermemesini söyler; ancak modeller öngörülemez davranabilir. Prompt'ları değiştirir veya farklı modeller kullanırsanız sorumluluk size aittir. **Göndermeden önce yapay zekâ tarafından üretilen içeriği mutlaka doğrulayın.**
3. **Üçüncü taraf şartlarına siz uyarsınız.** Bu aracı etkileşime girdiğiniz kariyer portallarının Hizmet Şartları'na uygun biçimde kullanmalısınız (Greenhouse, Lever, Workday, LinkedIn vb.). Bu aracı işverenlere spam göndermek veya ATS sistemlerini zorlamak için kullanmayın.
4. **Herhangi bir garanti verilmez.** Değerlendirmeler tavsiyedir; mutlak doğrular değildir. Yapay zekâ modelleri yetenek veya deneyim uydurabilir. Yazarlar iş sonuçlarından, reddedilen başvurulardan, hesap kısıtlamalarından veya başka herhangi bir sonuçtan sorumlu değildir.

Detaylar için [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) dosyasına bakın. Bu yazılım, [MIT License](LICENSE) kapsamında "olduğu gibi" ve hiçbir garanti olmaksızın sunulur.

## Katkıda Bulunanlar

<a href="https://github.com/furkanpz/career-ops-turkey/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=furkanpz/career-ops-turkey" />
</a>

Career-Ops ile işe girdiyseniz [hikayenizi paylaşın](https://github.com/furkanpz/career-ops-turkey/issues/new?template=i-got-hired.yml).

## Lisans

MIT. Orijinal upstream copyright bildirimi korunur; Türkiye fork değişiklikleri için Furkan Uyar copyright satırı eklenmiştir.

## Destek

- Hatalar ve özellik istekleri: [GitHub Issues](https://github.com/furkanpz/career-ops-turkey/issues)
- Kullanım soruları: [GitHub Discussions](https://github.com/furkanpz/career-ops-turkey/discussions)
- Güvenlik bildirimleri: [GitHub Security Advisories](https://github.com/furkanpz/career-ops-turkey/security/advisories/new)
