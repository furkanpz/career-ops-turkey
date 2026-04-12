# Turkey Normalization Spec

## Purpose

This document defines how common raw values from Turkish job listings should map into the canonical Turkey job data model in `docs/tr-data-model.md`.

This is a mapping spec only.

- No parser implementation in this step.
- No regex library contract in this step.
- Normalization should be deterministic and conservative.

## General Rules

1. Preserve raw source text in `jd_raw` and `location_text`.
2. Normalize comparisons case-insensitively and diacritic-insensitively, but store canonical output with consistent display casing.
3. Prefer explicit evidence from the listing over inference.
4. If a value is ambiguous, map to `unknown` instead of guessing.
5. If multiple raw values conflict, prefer the most explicit and most recently updated source text.
6. When title and body disagree, prefer body text for `employment_type` and `work_model`; prefer title for `seniority` only when the body is silent.

## Canonicalization Basics

### Text cleanup

Apply these cleanup rules before enum mapping:

- trim surrounding whitespace
- collapse repeated whitespace
- normalize separators like `/`, `|`, `-`, `•`, `,`
- strip decorative boilerplate such as `hemen basvur`, `yeni`, `acil`, `ilan no`
- keep Turkish-specific text in raw storage; do not ASCII-fold stored values

### URL normalization

For `apply_url`:

- prefer the final application endpoint over list/search URLs
- remove obvious tracking query params where safe
- preserve source path identifiers

### Date normalization

For `posted_at`:

- store as UTC `timestamptz`
- map relative phrases only if capture time is known
- otherwise keep `posted_at = null`

Examples:

- `Bugun`, `Bugün`, `Today` -> evaluation relative to fetch timestamp
- `2 gun once`, `2 gün önce`, `2 days ago` -> evaluation relative to fetch timestamp
- `30+ gun`, `30+ gün` -> too fuzzy for exact timestamp unless source exposes exact date

## Source Mapping

Although `source_type` is not one of the required enum families, it should still normalize consistently.

| Raw source | Canonical `source` | Canonical `source_type` |
|---|---|---|
| `LinkedIn`, `Linkedin Jobs` | `LinkedIn` | `job_board` |
| `Kariyer.net`, `kariyer net` | `Kariyer.net` | `job_board` |
| `Yenibiris`, `YeniBirIs` | `Yenibiris` | `job_board` |
| `Secretcv`, `Secret CV` | `Secretcv` | `job_board` |
| `Eleman.net` | `Eleman.net` | `job_board` |
| `Indeed` | `Indeed` | `aggregator` |
| `ISKUR`, `İŞKUR`, `Iskur` | `ISKUR` | `job_board` |
| `Glassdoor` | `Glassdoor` | `aggregator` |
| `Youthall` | `Youthall` | `job_board` |
| `Web site`, `Career page`, `Kariyer sayfasi` | `Company Careers` | `company_careers` |
| `Danismanlik firmasi`, `Recruitment agency`, `Recruiter` | preserve brand if known | `staffing_agency` |
| `Referans`, `Referral`, `Tavsiye` | `Referral` | `referral` |

Rule:

- If the listing originates from a company-owned careers domain, prefer `source_type = company_careers` even if it was discovered elsewhere.

## City Mapping

`city` should normalize to the canonical Turkish city name. `location_text` preserves the raw display string.

### Primary rules

- Map district-first strings to the parent city.
- Map `Merkez`, `Osb`, `Organize Sanayi`, campus/office names, and airport names using the nearest real city if explicit.
- If the listing is country-wide remote and no city exists, leave `city = null` and rely on `work_model`.

### Common mappings

| Raw value examples | Canonical `city` |
|---|---|
| `Istanbul`, `Istanbul / Turkiye`, `Levent / Istanbul`, `Maslak, Sariyer / Istanbul`, `Umraniye` with Istanbul context | `Istanbul` |
| `Ankara`, `Cankaya / Ankara`, `Bilkent`, `Sincan OSB / Ankara` | `Ankara` |
| `Izmir`, `Konak / Izmir`, `Bornova / Izmir` | `Izmir` |
| `Kocaeli`, `Gebze`, `Izmit` | `Kocaeli` |
| `Bursa`, `Nilufer / Bursa` | `Bursa` |
| `Eskisehir`, `Tepebasi / Eskisehir` | `Eskisehir` |
| `Adana`, `Seyhan / Adana` | `Adana` |
| `Antalya`, `Muratpasa / Antalya` | `Antalya` |
| `Gaziantep`, `Sehitkamil / Gaziantep` | `Gaziantep` |
| `Mersin`, `Icel`, `Mezitli / Mersin` | `Mersin` |
| `Konya`, `Selcuklu / Konya` | `Konya` |
| `Sakarya`, `Adapazari / Sakarya` | `Sakarya` |
| `Mugla`, `Bodrum`, `Fethiye`, `Dalaman` with Mugla context | `Mugla` |

Notes:

- `Turkey`, `Turkiye Geneli`, `Remote - Turkey` are not cities.
- `TR`, `Türkiye`, `Turkey` should not be copied into `city`.

## `work_model` Mapping

Canonical values:

- `remote`
- `hybrid`
- `onsite`
- `field`
- `unknown`

| Raw value examples | Canonical `work_model` |
|---|---|
| `Uzaktan`, `Remote`, `Tam uzaktan`, `Fully remote`, `Home office`, `Evden calisma`, `Work from home` | `remote` |
| `Hibrit`, `Hybrid`, `Haftada 2 gun ofis`, `3 gun ofis 2 gun ev`, `Ofis + uzaktan`, `Esnek hibrit` | `hybrid` |
| `Ofisten`, `On-site`, `Ofis`, `Is yerinde`, `Sirket lokasyonunda`, `Yerinde calisma` | `onsite` |
| `Sahada`, `Field`, `Seyahatli`, `Bolgede aktif ziyaret`, `Mobil saha` | `field` |
| `Remote/hybrid`, `Esnek`, `Duruma gore`, `Lokasyon fark etmez` with no explicit pattern | `unknown` |

Rules:

1. If the listing explicitly requires office days, use `hybrid`.
2. If the listing explicitly says customer/site visits are core to the role, use `field` even if home office exists.
3. Do not infer `remote` just because multiple cities are listed.

## `seniority` Mapping

Canonical values:

- `intern`
- `new_grad`
- `junior`
- `mid`
- `senior`
- `staff`
- `principal`
- `lead`
- `manager`
- `director`
- `head`
- `vp`
- `c_level`
- `unknown`

| Raw value examples | Canonical `seniority` |
|---|---|
| `Stajyer`, `Intern`, `Yaz stajyeri`, `Uzun donem stajyer`, `Zorunlu staj` | `intern` |
| `Yeni mezun`, `New grad`, `MT`, `Management Trainee`, `Graduate program` | `new_grad` |
| `Junior`, `Jr`, `Giris seviyesi`, `Entry level`, `Uzman yardimcisi` | `junior` |
| `Uzman`, `Specialist`, `Associate`, `Engineer`, `Developer` with no senior marker | `mid` |
| `Senior`, `Sr`, `Kidemli`, `Kidemli uzman`, `Kidemli muhendis` | `senior` |
| `Staff Engineer`, `Expert Engineer` with org-wide IC scope | `staff` |
| `Principal`, `Basuzman`, `Principal Engineer`, `Chief Architect` without people management | `principal` |
| `Tech Lead`, `Lead`, `Takim lideri`, `Ekip lideri` | `lead` |
| `Manager`, `Mudurluk`, `Supervisor`, `Yonetici`, `Team Manager` | `manager` |
| `Director`, `Direktor` | `director` |
| `Head`, `Bolum baskani`, `Head of ...` | `head` |
| `VP`, `Vice President`, `GMY` when used as VP-equivalent | `vp` |
| `CTO`, `CIO`, `CEO`, `COO`, `CHRO`, `CFO` | `c_level` |

Rules:

1. `Uzman` alone defaults to `mid`, not `senior`.
2. `Uzman Yardimcisi` defaults to `junior`.
3. `Lead` outranks `senior` for normalization when both appear.
4. Management titles beat IC titles when both are present, for example `Engineering Manager / Tech Lead` -> `manager`.
5. If the title is neutral but experience requirement is explicit:
   - `0-1 yil` -> `junior`
   - `1-3 yil` -> `junior`
   - `3-5 yil` -> `mid`
   - `5-8 yil` -> `senior`
   - `8+ yil` with broad ownership -> `staff` or `lead`; otherwise `senior`

## `language` Mapping

Canonical values:

- `tr`
- `en`
- `tr_en`
- `de`
- `fr`
- `ar`
- `ru`
- `multilingual`
- `unknown`

| Raw value examples | Canonical `language` |
|---|---|
| `Turkce`, `Turkish`, `Ana dil Turkce`, `Ileri Turkce` | `tr` |
| `Ingilizce`, `English`, `Advanced English`, `Fluent English`, `Business English` | `en` |
| `Turkce ve Ingilizce`, `Bilingual Turkish-English`, `Iyi derecede Ingilizce ve Turkce` | `tr_en` |
| `Almanca`, `German`, `Deutsch` | `de` |
| `Fransizca`, `French` | `fr` |
| `Arapca`, `Arabic` | `ar` |
| `Rusca`, `Russian` | `ru` |
| `Cok dilli`, `Multilingual`, `Birden fazla yabanci dil` | `multilingual` |
| No reliable language signal | `unknown` |

Rules:

1. `language` means the primary working/application language expectation of the role, not the language of the website UI.
2. If both Turkish and English are explicitly required, use `tr_en`.
3. If English-only wording exists on a global company listing but Turkish is not mentioned, use `en`.
4. If multiple non-Turkish languages are listed and none is primary, use `multilingual`.

## `employment_type` Mapping

Canonical values:

- `full_time`
- `part_time`
- `contract`
- `internship`
- `temporary`
- `freelance`
- `consulting`
- `apprenticeship`
- `unknown`

| Raw value examples | Canonical `employment_type` |
|---|---|
| `Tam zamanli`, `Full-time`, `Kadrolu`, `Surekli`, `Permanent` | `full_time` |
| `Yari zamanli`, `Part-time` | `part_time` |
| `Sozlesmeli`, `Kontratli`, `Contract`, `Belli sureli sozlesme`, `Project-based contract` | `contract` |
| `Staj`, `Internship`, `Long term internship`, `Yaz donemi staj` | `internship` |
| `Gecici`, `Donemsel`, `Sezonluk`, `Temporary` | `temporary` |
| `Freelance`, `Serbest`, `Bagimsiz calisma` | `freelance` |
| `Danisman`, `Consultant`, `Consulting basis` | `consulting` |
| `Ciraklik`, `Apprenticeship`, `Aday programi` where it is not a white-collar internship | `apprenticeship` |
| Missing or ambiguous | `unknown` |

Rules:

1. `Vardiyali`, `Hafta sonu`, `Esnek saat` are not employment types.
2. `Hibrit`, `Uzaktan`, `Ofis` are not employment types; they belong to `work_model`.
3. If the listing says `tam zamanli sozlesmeli`, prefer `contract` because contract form is more specific than weekly hours.

## `pipeline_status` Mapping

Canonical values:

- `discovered`
- `queued`
- `evaluation_in_progress`
- `evaluated`
- `applied`
- `response_received`
- `interview`
- `offer`
- `rejected`
- `discarded`
- `skip`
- `closed`
- `duplicate`
- `error`

### Compatibility with current repo

Current tracker-safe statuses in the repo:

- `evaluated`
- `applied`
- `response_received`
- `interview`
- `offer`
- `rejected`
- `discarded`
- `skip`

Only these should sync into `data/applications.md`.

### Common mappings

| Raw value examples | Canonical `pipeline_status` |
|---|---|
| `Yeni bulundu`, `Discovered`, `Tarandi`, `Scan sonucu` | `discovered` |
| `Kuyrukta`, `Bekliyor`, `Pending`, `In pipeline`, `Inbox` | `queued` |
| `Degerlendiriliyor`, `Analiz ediliyor`, `Processing` | `evaluation_in_progress` |
| `Degerlendirildi`, `Raporlandi`, `Evaluated` | `evaluated` |
| `Basvuruldu`, `Application sent`, `Applied` | `applied` |
| `Geri donus alindi`, `Recruiter reached out`, `Responded`, `Response received` | `response_received` |
| `Mulakat`, `Telefon gorusmesi`, `IK gorusmesi`, `Teknik mulakat`, `Case interview` | `interview` |
| `Teklif`, `Offer`, `Verbal offer` | `offer` |
| `Red`, `Olumsuz`, `Rejected`, `Ret` | `rejected` |
| `Vazgecildi`, `Ilan kapandi`, `Pozisyon doldu`, `Aday geri cekildi` | `discarded` |
| `Uygun degil`, `No apply`, `Pas`, `Takip etme`, `Monitor only` | `skip` |
| `Kapali`, `Closed` where no final applicant outcome exists | `closed` |
| `Duplicate`, `Merrer`, `Ayni ilan` | `duplicate` |
| `Hata`, `Parse error`, `Broken URL`, `Login required` | `error` |

Rules:

1. `Interview` includes recruiter screen, HR screen, technical interview, hiring manager, panel, and case stages in the current simplified pipeline.
2. `Discarded` is candidate-side or listing-side abandonment.
3. `Rejected` is employer-side rejection.
4. `Closed` should not be projected into `applications.md` unless the team later adds it to `tracker-status-registry.json`.

## Compensation Text Handling

`compensation_text` is intentionally raw-ish for now.

Keep phrases such as:

- `Maas + prim`
- `Yan haklar dahil`
- `Ticket + ozel saglik sigortasi`
- `Brut 70.000 - 90.000 TL`
- `USD bazli maas`

Do not normalize yet into numeric fields in this phase.

## Confidence Score Guidelines

Use `confidence_score` as normalization confidence:

| Situation | Suggested range |
|---|---|
| Explicit enum words in title/body, exact city, exact apply URL | `0.90-1.00` |
| Mostly explicit, minor cleanup/inference needed | `0.75-0.89` |
| Mixed evidence, one ambiguous field | `0.50-0.74` |
| Several inferred fields, weak structure | `0.25-0.49` |
| Severe ambiguity or extraction damage | `0.00-0.24` |

This is not a model score for fit or quality. It only measures confidence in normalized metadata.

## Ambiguity Policy

When raw values are ambiguous:

- prefer `unknown`
- keep the raw phrase in source text
- lower `confidence_score`

Examples:

- `Esnek calisma modeli` with no office rule -> `work_model = unknown`
- `Associate` with no other context -> `seniority = mid`
- `Good command of foreign language preferred` -> `language = unknown`

## Example Mapping

Raw listing snippet:

```text
Kidemli Backend Muhendisi
Lokasyon: Maslak / Istanbul - Hibrit
Calisma sekli: Tam zamanli
Dil: Iyi derecede Ingilizce ve Turkce
```

Normalized result:

```json
{
  "title": "Kidemli Backend Muhendisi",
  "city": "Istanbul",
  "location_text": "Maslak / Istanbul - Hibrit",
  "work_model": "hybrid",
  "seniority": "senior",
  "language": "tr_en",
  "employment_type": "full_time",
  "confidence_score": 0.97
}
```
