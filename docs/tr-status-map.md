# Turkey Status Map

## Purpose

This document defines a Turkey-friendly status vocabulary for `career-ops` while preserving internal normalization safety, dedup behavior, and historical tracker integrity.

This is a design and implementation-planning document only.

- No runtime code changes in this step.
- No silent reinterpretation of historical statuses.
- Data integrity takes priority over nicer labels.

## Current Inspection Findings

The current status layer is not fully centralized. Different parts of the repo assume different vocabularies:

### `templates/states.yml`

Current canonical state ids:

- `evaluated`
- `applied`
- `responded`
- `interview`
- `offer`
- `rejected`
- `discarded`
- `skip`

Current labels are English, with limited Spanish aliases.

### `normalize-statuses.mjs`

Current behavior:

- hardcodes Spanish canonical outputs such as `Evaluada`, `Aplicado`, `Entrevista`
- strips dates and markdown from status cells
- maps several ad hoc inputs into existing tracker states
- moves `duplicado` / `repost` hints into notes

Risk:

- the mapping table is embedded in code, not driven from `states.yml`
- unknown inputs are only reported, not modeled explicitly

### `merge-tracker.mjs`

Current behavior:

- validates statuses with a hardcoded vocabulary
- defaults unknown statuses to `Evaluada`
- treats duplicate/repost-like statuses as `Descartado`

Risk:

- defaulting unknown values to `Evaluada` is not data-safe for Turkish workflows
- this can silently rewrite meaning and affect dedup/ranking

### `verify-pipeline.mjs`

Current behavior:

- validates statuses using a hardcoded Spanish list
- does not actually load canonical labels/aliases from `states.yml`

Risk:

- the script can drift from the declared source of truth

### `dedup-tracker.mjs`

Current behavior:

- relies on a hardcoded advancement order:
  - `no aplicar`
  - `descartado`
  - `rechazado`
  - `evaluada`
  - `aplicado`
  - `respondido`
  - `entrevista`
  - `oferta`

Risk:

- status progression semantics are encoded in code, not in the registry
- adding Turkish aliases without a central registry would be brittle

### `modes/tracker.md`

Current issue:

- documents a `Contacto` state that is not part of `templates/states.yml` and is not supported consistently by the scripts

This is a data-integrity problem already present today and should not be expanded in a Turkey implementation.

## Design Principle

Use a two-layer model:

1. Stable internal canonical states for tracker safety
2. Turkish-friendly display and intake vocabulary mapped onto those states

Rule:

- `applications.md` must continue to store only tracker-safe canonical states
- richer Turkish workflow states may exist in the pipeline/listing layer, but must not be forced into `applications.md` if their meaning does not match an existing canonical tracker state

## Internal Canonical Tracker States

These should remain the only status meanings allowed in `applications.md` unless the repo explicitly evolves the tracker contract:

| Canonical id | Current meaning | Recommended tracker label |
|---|---|---|
| `evaluated` | Offer evaluated, pending decision | `Evaluated` |
| `applied` | Application submitted | `Applied` |
| `responded` | Company responded, not yet interview | `Responded` |
| `interview` | Active interview process | `Interview` |
| `offer` | Offer received | `Offer` |
| `rejected` | Rejected by company | `Rejected` |
| `discarded` | Candidate discarded or posting closed | `Discarded` |
| `skip` | Not a fit, do not apply | `SKIP` |

Recommendation:

- Keep internal ids stable and language-neutral.
- Turkish wording should be added as aliases and localized display labels, not as new tracker meanings by default.

Storage note:

- Do not bulk-rewrite historical tracker rows from the current label family to a new one in the same change.
- First centralize normalization around canonical ids.
- Only after that should the team decide whether stored tracker labels remain legacy-compatible or move to a new single rendered label set.

## Turkey-Friendly Display / Intake Vocabulary

Recommended Turkish labels and alias families:

| Canonical id | Recommended Turkish display label | Suggested Turkish aliases |
|---|---|---|
| `evaluated` | `Degerlendirildi` | `degerlendirildi`, `incelendi`, `degerlendirme tamam`, `degerlendirme bitti` |
| `applied` | `Basvuruldu` | `basvuruldu`, `basvuru yapildi`, `gonderildi`, `iletildi` |
| `responded` | `Geri Donus Alindi` | `geri donus alindi`, `donus geldi`, `iletisim kuruldu`, `recruiter dondu` |
| `interview` | `Mulakat` | `mulakat`, `gorusme`, `on gorusme`, `ik mulakati`, `teknik mulakat`, `teknik interview`, `case study`, `vaka calismasi`, `test gonderildi` |
| `offer` | `Teklif` | `teklif`, `offer`, `verbal offer`, `yazili teklif` |
| `rejected` | `Reddedildi` | `reddedildi`, `olumsuz`, `ret`, `elendi` |
| `discarded` | `Vazgecildi` | `vazgecildi`, `ilan kapandi`, `kapandi`, `iptal`, `cancelled`, `sonlandi` |
| `skip` | `Uygun Degil` | `uygun degil`, `fit degil`, `bana uygun degil`, `pas`, `no apply`, `basvurulmayacak` |

Important:

- Turkish labels above are for display or intake.
- They should not introduce new tracker semantics by themselves.

## Requested Turkey Workflow Statuses

The user requested mappings for:

- new
- reviewing
- not a fit
- CV ready
- ready to apply
- applied
- screening
- technical interview
- HR interview
- case study/test
- offer
- rejected
- no response

These should not all be forced into one tracker column. Some are true tracker states; some are pipeline or readiness states.

## Recommended Mapping Table

| Raw workflow status | Recommended Turkish label | Tracker-safe canonical mapping | Allowed in `applications.md` | Recommended handling |
|---|---|---|---|---|
| `new` | `Yeni` | none | no | Keep in pipeline/listing layer only; maps conceptually to `discovered` or `queued`, not to a tracker state |
| `reviewing` | `Inceleniyor` | none | no | Keep outside tracker; this is an evaluation-in-progress state |
| `not a fit` | `Uygun Degil` | `skip` | yes | Safe terminal skip state |
| `CV ready` | `CV Hazir` | none | no | Store as preparation metadata, not as tracker status |
| `ready to apply` | `Basvuruya Hazir` | none | no | Store as readiness metadata; if forced into tracker, only after a completed evaluation and with explicit note, not as a new canonical state |
| `applied` | `Basvuruldu` | `applied` | yes | Safe direct mapping |
| `screening` | `On Gorusme` | `interview` | yes | Map to `interview`, but preserve subtype in notes or future stage field |
| `technical interview` | `Teknik Mulakat` | `interview` | yes | Map to `interview`, preserve subtype |
| `HR interview` | `IK Mulakati` | `interview` | yes | Map to `interview`, preserve subtype |
| `case study/test` | `Vaka / Test` | `interview` | yes | Map to `interview`, preserve subtype |
| `offer` | `Teklif` | `offer` | yes | Safe direct mapping |
| `rejected` | `Reddedildi` | `rejected` | yes | Safe direct mapping |
| `no response` | `Donus Yok` | none | no | Do not map to `rejected` or `discarded`; keep as follow-up metadata on top of `applied` unless the team later adds a dedicated state |

## Why Some Requested Statuses Must Stay Out of `applications.md`

### `new`

This means discovery, not evaluation or application progress. Mapping it to `evaluated` would be false.

### `reviewing`

This means work is in progress, not complete. Mapping it to `evaluated` would silently change meaning.

### `CV ready`

This describes candidate-material readiness, not application state.

### `ready to apply`

This is a recommendation or gating status, not a historical application event.

### `no response`

This is not equivalent to:

- `rejected`
- `discarded`
- `responded`

It should remain metadata attached to an existing `applied` row until the repo intentionally introduces a dedicated follow-up state model.

## Safe Turkish Alias Strategy

Recommended alias groups for ingestion:

### Map to `skip`

- `uygun degil`
- `fit degil`
- `bana uygun degil`
- `no fit`
- `pas`
- `basvurma`
- `basvurulmayacak`

### Map to `evaluated`

Only when the wording clearly means evaluation is complete:

- `degerlendirildi`
- `incelendi`
- `degerlendirme tamam`

Do not map:

- `yeni`
- `inceleniyor`
- `cv hazir`
- `basvuruya hazir`

to `evaluated`.

### Map to `interview`

- `on gorusme`
- `mulakat`
- `ik mulakati`
- `teknik mulakat`
- `teknik interview`
- `vaka calismasi`
- `case study`
- `test asamasi`

But preserve subtype detail separately.

## Recommended Subtype Preservation

For Turkish workflows, `interview` is too coarse if the team cares about stage-level visibility.

Recommended additive solution:

- keep `applications.md` status at canonical `Interview`
- preserve finer stage detail in notes using a stable prefix

Example note tags:

- `stage:screening`
- `stage:hr_interview`
- `stage:technical_interview`
- `stage:case_study`
- `followup:no_response`
- `readiness:cv_ready`
- `readiness:ready_to_apply`

This is safer than introducing new tracker states immediately because:

- dedup logic remains stable
- dashboard grouping remains stable
- historical rows remain parseable
- richer meaning is preserved without forcing a schema migration

## Recommended Turkish Display Labels

If the team wants a Turkish-facing tracker UI or docs, use these display terms while keeping internal ids unchanged:

| Internal id | English label | Turkish display label |
|---|---|---|
| `evaluated` | `Evaluated` | `Degerlendirildi` |
| `applied` | `Applied` | `Basvuruldu` |
| `responded` | `Responded` | `Geri Donus Alindi` |
| `interview` | `Interview` | `Mulakat` |
| `offer` | `Offer` | `Teklif` |
| `rejected` | `Rejected` | `Reddedildi` |
| `discarded` | `Discarded` | `Vazgecildi` |
| `skip` | `SKIP` | `Uygun Degil` |

## Data Integrity Rules

1. Never remap `no response` to `rejected`.
2. Never remap `CV ready` to `applied`.
3. Never remap `reviewing` to `evaluated`.
4. Never collapse `screening`, `HR interview`, `technical interview`, and `case study` into bare `interview` without preserving detail somewhere.
5. Never default an unknown Turkish status to `Evaluated`.
6. Historical meanings already in the tracker must remain parseable after Turkish aliases are added.

## Recommended Implementation Plan

### Phase 1: Freeze the canonical contract

Files:

- `templates/states.yml`
- `docs/tr-status-map.md`

Actions:

1. Keep canonical ids unchanged:
   - `evaluated`
   - `applied`
   - `responded`
   - `interview`
   - `offer`
   - `rejected`
   - `discarded`
   - `skip`
2. Add Turkish aliases to `templates/states.yml`.
3. Optionally add localized display metadata such as:
   - `label_tr`
   - `aliases_tr`
4. Do not add `new`, `reviewing`, `cv_ready`, `ready_to_apply`, or `no_response` as tracker states yet.

Reason:

- this preserves dedup and historical tracker safety

### Phase 2: Centralize normalization logic

Files:

- `normalize-statuses.mjs`
- `merge-tracker.mjs`
- `verify-pipeline.mjs`
- `dedup-tracker.mjs`

Actions:

1. Load canonical ids, labels, and aliases from `templates/states.yml` instead of duplicating status tables in code.
2. Normalize through canonical ids first, then render the chosen tracker label.
3. Remove hardcoded Spanish-only status lists from scripts.

Reason:

- the repo currently has drift between declared source of truth and actual validation logic

### Phase 3: Make normalization fail-safe

Files:

- `normalize-statuses.mjs`
- `merge-tracker.mjs`

Actions:

1. Replace `unknown -> Evaluada` fallback with one of these safer behaviors:
   - warn and skip write
   - quarantine the TSV
   - write a machine-readable note for manual review
2. Keep duplicate/repost handling explicit and note-preserving.
3. Preserve raw original status text when normalization is lossy.

Reason:

- silent fallback to `Evaluated` is unsafe for Turkish intake terms like `Yeni` or `CV Hazir`

### Phase 4: Support Turkish-friendly intake without tracker drift

Files:

- `normalize-statuses.mjs`
- `merge-tracker.mjs`
- `modes/tracker.md`

Actions:

1. Accept Turkish aliases such as:
   - `uygun degil`
   - `basvuruldu`
   - `teklif`
   - `reddedildi`
2. Map interview-family Turkish statuses to canonical `Interview`.
3. For stage-specific values such as:
   - `on gorusme`
   - `ik mulakati`
   - `teknik mulakat`
   - `case study`
   preserve subtype in notes via stable tags.
4. Remove or explicitly deprecate unsupported `Contacto` from tracker docs unless the repo intentionally reintroduces it as a canonical state everywhere.

Reason:

- tracker docs must not advertise states the scripts cannot safely store

### Phase 5: Separate tracker status from workflow metadata

Recommended future additive fields or note tags:

- `stage:screening`
- `stage:hr_interview`
- `stage:technical_interview`
- `stage:case_study`
- `followup:no_response`
- `readiness:cv_ready`
- `readiness:ready_to_apply`

Minimum-change approach:

- keep them in notes with stable prefixes first

Better long-term approach:

- add a structured normalized listing/application metadata layer outside `applications.md`

Reason:

- the requested Turkish workflow statuses mix application state, interview subtype, and preparation readiness

### Phase 6: Update verification and ranking safely

Files:

- `verify-pipeline.mjs`
- `dedup-tracker.mjs`
- `dashboard/internal/data/career.go`
- `dashboard/internal/ui/screens/pipeline.go`

Actions:

1. Make `verify-pipeline.mjs` validate against aliases from `states.yml`.
2. Move advancement order into a central registry or derive it from `states.yml`.
3. Keep dashboard grouping based on canonical ids, not localized free text.
4. If Turkish display labels are added later, render them in the UI layer only.

Reason:

- normalization must not break dedup promotion logic or dashboard filters

## Recommended Order of Execution

1. Fix the status contract in `templates/states.yml`.
2. Refactor `normalize-statuses.mjs` and `merge-tracker.mjs` to read from that contract.
3. Tighten `verify-pipeline.mjs` to validate the same registry.
4. Align `dedup-tracker.mjs` and dashboard grouping to canonical ids.
5. Only then expose Turkish tracker labels or Turkish-first tracker docs.

## Decision Summary

The safe Turkey implementation is:

- keep internal tracker meanings stable
- accept Turkish vocabulary as aliases
- treat `new`, `reviewing`, `cv_ready`, `ready_to_apply`, and `no_response` as workflow metadata, not tracker states
- map interview-family Turkish statuses to canonical `interview` while preserving subtype detail
- remove unsafe defaults that silently rewrite unknown statuses into `Evaluated`
