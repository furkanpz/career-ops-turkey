---
name: career-ops
description: AI job search command center -- evaluate offers, generate CVs, scan portals, track applications
user_invocable: true
args: mode
argument-hint: "[scan | deep | pdf | oferta | teklif | ofertas | apply | basvur | batch | tracker | pipeline | contacto | training | project | interview-prep | patterns | followup]"
---

# career-ops -- Router

## Locale Activation

Before resolving files, determine the active mode directory:

1. If the user explicitly asks for a locale or mode directory in this turn, respect that.
2. Otherwise, read `config/profile.yml` if it exists.
3. If `config/profile.yml` contains `language.modes_dir` and that directory exists, use it.
4. Otherwise, use the default root `modes/` directory.

`language.modes_dir` is a routing convention, not a user-data store. Do not edit it unless the user asks to change locale behavior.

## Mode Routing

Determine the mode from `{{mode}}`:

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` -- Show command menu |
| JD text or URL (no sub-command) | **`auto-pipeline`** |
| `oferta` | `oferta` |
| `teklif` | `oferta` |
| `ofertas` | `ofertas` |
| `contacto` | `contacto` |
| `deep` | `deep` |
| `interview-prep` | `interview-prep` |
| `pdf` | `pdf` |
| `training` | `training` |
| `project` | `project` |
| `tracker` | `tracker` |
| `pipeline` | `pipeline` |
| `apply` | `apply` |
| `basvur` | `apply` |
| `scan` | `scan` |
| `batch` | `batch` |
| `patterns` | `patterns` |
| `followup` | `followup` |

**Auto-pipeline detection:** If `{{mode}}` is not a known sub-command AND contains JD text (keywords: "responsibilities", "requirements", "qualifications", "about the role", "we're looking for", company name + role) or a URL to a JD, execute `auto-pipeline`.

If `{{mode}}` is not a sub-command AND doesn't look like a JD, show discovery.

---

## Discovery Mode (no arguments)

Show this menu:

```
career-ops -- Command Center

Available commands:
  /career-ops {JD}      → AUTO-PIPELINE: evaluate + report + PDF + tracker (paste text or URL)
  /career-ops pipeline  → Process pending URLs from inbox (data/pipeline.md)
  /career-ops oferta    → Evaluation only A-F (no auto PDF)
  /career-ops ofertas   → Compare and rank multiple offers
  /career-ops contacto  → LinkedIn power move: find contacts + draft message
  /career-ops deep      → Deep research prompt about company
  /career-ops interview-prep → Company-specific interview research
  /career-ops pdf       → PDF only, ATS-optimized CV
  /career-ops training  → Evaluate course/cert against North Star
  /career-ops project   → Evaluate portfolio project idea
  /career-ops tracker   → Application status overview
  /career-ops apply     → Live application assistant (reads form + generates answers)
  /career-ops teklif    → Turkish alias for single-offer evaluation
  /career-ops basvur    → Turkish alias for live application help
  /career-ops scan      → Scan portals and discover new offers
  /career-ops batch     → Batch processing with parallel workers
  /career-ops patterns  → Analyze rejection patterns and improve targeting
  /career-ops followup  → Follow-up cadence tracker: flag overdue, draft follow-ups

Inbox: add URLs to data/pipeline.md → /career-ops pipeline
Or paste a JD directly to run the full pipeline.
```

---

## Context Loading by Mode

After determining the canonical mode, resolve files in this order:

1. Root shared context: `modes/_shared.md`
2. Localized shared context: `{active_modes_dir}/_shared.md` if `active_modes_dir != modes` and the file exists
3. Root canonical mode file: `modes/{canonical_mode}.md`
4. Localized override file if it exists:
   - `modes/tr/teklif.md` for canonical `oferta`
   - `modes/tr/basvur.md` for canonical `apply`
   - otherwise `{active_modes_dir}/{canonical_mode}.md`

Load the root canonical mode even when a localized override exists. The localized file is an override layer, not a replacement for missing features.

If a localized file is missing, continue with the root mode only.

### Modes that require `_shared.md` + their mode file:
Read the resolved shared context + root canonical mode + localized override (if present)

Applies to: `auto-pipeline`, `oferta`, `ofertas`, `pdf`, `contacto`, `apply`, `pipeline`, `scan`, `batch`

### Standalone modes (only their mode file):
Read the root canonical mode + localized override (if present)

Applies to: `tracker`, `deep`, `training`, `project`, `patterns`, `interview-prep`, `followup`

### Modes delegated to subagent:
For `scan`, `apply` (with Playwright), and `pipeline` (3+ URLs): launch as Agent with the resolved root + localized context injected into the subagent prompt.

```
Agent(
  subagent_type="general-purpose",
  prompt="[content of modes/_shared.md]\n\n[content of localized _shared.md if present]\n\n[content of root canonical mode]\n\n[content of localized override if present]\n\n[invocation-specific data]",
  description="career-ops {canonical_mode}"
)
```

Execute the instructions from the loaded mode file.
