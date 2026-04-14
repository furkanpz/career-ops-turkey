# Career-Ops Turkey

[Türkçe](README.md) | [English](README.en.md) | [Español](README.es.md) | [Português (Brasil)](README.pt-BR.md) | [한국어](README.ko-KR.md) | [日本語](README.ja.md) | [Русский](README.ru.md) | [繁體中文](README.zh-TW.md)

<p align="center">
  <img src="docs/hero-banner.jpg" alt="Career-Ops — Multi-Agent Job Search System" width="800">
</p>

<p align="center">
  <em>A Turkey and EMEA-oriented job search pipeline.</em><br>
  Companies use AI to filter candidates. <strong>Career-Ops gives candidates AI to <em>choose</em> companies.</strong><br>
  <em>This fork is maintained for the Turkey market.</em>
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

<p align="center"><strong>Turkey/EMEA-oriented job search pipeline · MIT-licensed Career-Ops fork · Maintained by Furkan Uyar</strong></p>


## What Is This

Career-Ops turns any AI coding CLI into a full job search command center. Instead of manually tracking applications in a spreadsheet, you get an AI-powered pipeline that:

- **Evaluates offers** with a structured A-G scoring system (10 weighted dimensions + posting legitimacy)
- **Generates tailored PDFs** -- ATS-optimized CVs customized per job description
- **Scans portals** automatically (tracked company pages + LinkedIn Jobs, Kariyer.net, Indeed Turkiye, Eleman.net, Secretcv, Yenibiris, ISKUR)
- **Processes in batch** -- evaluate 10+ offers in parallel with sub-agents
- **Tracks everything** in a single source of truth with integrity checks

> **Important: This is NOT a spray-and-pray tool.** Career-ops is a filter -- it helps you find the few offers worth your time out of hundreds. The system strongly recommends against applying to anything scoring below 4.0/5. Your time is valuable, and so is the recruiter's. Always review before submitting.

Career-ops is agentic: Claude Code navigates career pages with Playwright, evaluates fit by reasoning about your CV vs the job description (not keyword matching), and adapts your resume per listing.

> **Heads up: the first evaluations won't be great.** The system doesn't know you yet. Feed it context -- your CV, your career story, your proof points, your preferences, what you're good at, what you want to avoid. The more you nurture it, the better it gets. Think of it as onboarding a new recruiter: the first week they need to learn about you, then they become invaluable.

This fork is based on the MIT-licensed [Career-Ops](https://github.com/santifer/career-ops) project by Santiago Fernández de Valderrama. The Turkey/EMEA job-board coverage, Turkish modes, fork identity, and update behavior are maintained by Furkan Uyar.

## Features

| Feature | Description |
|---------|-------------|
| **Auto-Pipeline** | Paste a URL, get a full evaluation + PDF + tracker entry |
| **7-Block Evaluation** | Role summary, CV match, level strategy, comp research, personalization, interview prep (STAR+R), posting legitimacy |
| **Interview Story Bank** | Accumulates STAR+Reflection stories across evaluations -- 5-10 master stories that answer any behavioral question |
| **Negotiation Scripts** | Salary negotiation frameworks, geographic discount pushback, competing offer leverage |
| **ATS PDF Generation** | Keyword-injected CVs with Space Grotesk + DM Sans design |
| **Portal Scanner** | Single `scan.mjs` runtime for tracked companies, Turkish boards, and EMEA ATS discovery with Playwright liveness checks |
| **Batch Processing** | Parallel evaluation with `claude -p` workers |
| **Dashboard TUI** | Terminal UI with progress analytics, light/dark Catppuccin themes, vim motions, manual refresh, and richer markdown/table viewing |
| **Human-in-the-Loop** | AI evaluates and recommends, you decide and act. The system never submits an application -- you always have the final call |
| **Pipeline Integrity** | Automated merge, dedup, status normalization, health checks |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/furkanpz/career-ops-turkey.git
cd career-ops-turkey && npm install
npx playwright install chromium   # Required for PDF generation and scanner liveness checks

# 2. Check setup
npm run doctor                     # Validates all prerequisites

# 3. Configure
cp config/profile.tr.example.yml config/profile.yml
cp templates/portals.tr.example.yml portals.yml
# Fallback global starters:
# cp config/profile.example.yml config/profile.yml
# cp templates/portals.example.yml portals.yml

# 4. Add your CV
# Create cv.md in the project root with your CV in markdown

# 5. Personalize with Claude
claude   # Open Claude Code in this directory

# Then ask Claude to adapt the system to you:
# "Change the archetypes to backend engineering roles"
# "Translate the modes to English"
# "Add these 5 companies to portals.yml"
# "Update my profile with this CV I'm pasting"

# 6. Start using
# Paste a job URL or run /career-ops
```

> **The system is designed to be customized by Claude itself.** The Turkey fork changes locale behavior, market heuristics, and board coverage. Your own target roles, keywords, company list, and narrative still belong in `config/profile.yml`, `modes/_profile.md`, `article-digest.md`, or `portals.yml`.

See [docs/SETUP.md](docs/SETUP.md) for the full setup guide.

Turkey-oriented usage is first-class in this fork: set `language.modes_dir: modes/tr` in `config/profile.yml` or tell Claude to use `modes/tr/` for Turkey-market workflows. This is a locale adaptation, not a fixed role pack. Canonical commands stay stable, and the documented Turkish aliases are supported: `teklif` → evaluation, `basvur` → live application help.

Parity scope in this fork tracks the upstream `v1.4` product surface, additional locale packs,
and repository/community assets while preserving the Turkey locale layer, fork identity, and
fork-safe update channel.

Parser-safe report keys stay canonical and English even in Turkish workflows:
`Archetype`, `TL;DR`, `Remote`, `Comp`, `Date`, `Score`, `URL`, `PDF`, `Batch ID`.

## Usage

Career-ops is a single slash command with multiple modes:

```
/career-ops                → Show all available commands
/career-ops {paste a JD}   → Full auto-pipeline (evaluate + PDF + tracker)
/career-ops scan           → Scan portals for new offers
/career-ops pdf            → Generate ATS-optimized CV
/career-ops batch          → Batch evaluate multiple offers
/career-ops tracker        → View application status
/career-ops apply          → Fill application forms with AI
/career-ops pipeline       → Process pending URLs
/career-ops contacto       → LinkedIn outreach message
/career-ops deep           → Deep company research
/career-ops interview-prep → Company-specific interview research
/career-ops training       → Evaluate a course/cert
/career-ops project        → Evaluate a portfolio project
/career-ops patterns       → Analyze rejection patterns
/career-ops followup       → Track follow-up cadence and draft follow-ups
/career-ops teklif         → Turkish alias for single evaluation
/career-ops basvur         → Turkish alias for live application help
```

Or just paste a job URL or description directly -- career-ops auto-detects it and runs the full pipeline.

For the scanner runtime, the CLI and slash-command paths now match:

```bash
npm run scan
```

## How It Works

```
You paste a job URL or description
        │
        ▼
┌──────────────────┐
│  Archetype       │  Classifies: best-fit role family for the user
│  Detection       │
└────────┬─────────┘
         │
┌────────▼─────────┐
│  A-G Evaluation  │  Match, gaps, comp research, STAR stories, legitimacy
│  (reads cv.md)   │
└────────┬─────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
 Report  PDF  Tracker
  .md   .pdf   .tsv
```

## Pre-configured Portals

This fork defaults to `templates/portals.tr.example.yml` for Turkey / EMEA discovery. The global template remains available, but the TR starter is the supported default here.

The TR starter is intentionally tech-first and generic. It is meant to be customized for your own role families rather than treated as a fixed default candidate profile.

The scanner now uses one runtime (`scan.mjs`) for both `/career-ops scan` and `npm run scan`. It combines:

- tracked company scans via ATS APIs or direct careers pages
- search-query discovery for Turkish and EMEA job boards
- Playwright liveness checks for public search results before they enter the pipeline

Primary Turkey board coverage in the template:

- LinkedIn Jobs
- Kariyer.net
- Indeed Turkiye
- Eleman.net

Secondary Turkey board coverage in the template:

- Secretcv
- Yenibiris
- ISKUR

The TR starter also includes a tracked-company layer for Turkey-founded employers and public careers surfaces such as Trendyol, Getir, Dream Games, Insider, Papara, iyzico, Logo Yazılım, Etiya, Yemeksepeti, and Çiçeksepeti, plus a Bilişim Vadisi careers discovery query and a letgo fallback query.

LinkedIn is discovery-only in this fork. Login-gated or authenticated scraping is intentionally out of scope.

Upstream behavior still applies: scanner coverage and locale heuristics live in system files, but the actual target roles, keywords, and tracked companies belong in your user-layer `portals.yml`.

Updates never auto-merge your `portals.yml`. If your file predates the current TR template, `doctor` and `scan` will warn and tell you which parser keys are missing.

## Dashboard TUI

The built-in terminal dashboard lets you browse your pipeline visually:

```bash
cd dashboard
go build -o career-dashboard .
./career-dashboard --path ..
```

Features: 6 filter tabs, 4 sort modes, grouped/flat view, lazy-loaded previews, inline status changes, progress analytics, vim motions (`hjkl`, `g`, `G`), manual refresh (`r`), and automatic Catppuccin light/dark theme selection.

## Project Structure

```
career-ops-turkey/
├── CLAUDE.md                    # Agent instructions
├── followup-cadence.mjs         # Follow-up cadence analysis
├── cv.md                        # Your CV (create this)
├── article-digest.md            # Your proof points (optional)
├── config/
│   ├── profile.example.yml      # Default/global profile template
│   └── profile.tr.example.yml   # Turkey-oriented profile template
├── modes/                       # Root canonical mode set
│   ├── _shared.md               # Shared system context (not user customization)
│   ├── oferta.md                # Single evaluation
│   ├── pdf.md                   # PDF generation
│   ├── scan.md                  # Portal scanner
│   ├── batch.md                 # Batch processing
│   ├── tr/                      # Turkey / EMEA override layer
│   └── ...
├── tracker-status-registry.json # Canonical machine status registry
├── templates/
│   ├── cv-template.html         # Legacy/Spanish-compatible CV template
│   ├── cv-template.en.html      # English ATS template
│   ├── cv-template.tr.html      # Turkish ATS template
│   ├── portals.example.yml      # Default/global scanner config
│   ├── portals.tr.example.yml   # Turkey / EMEA scanner config
│   └── states.yml               # Human-readable status mirror
├── batch/
│   ├── batch-prompt.md          # Self-contained worker prompt
│   └── batch-runner.sh          # Orchestrator script
├── dashboard/                   # Go TUI pipeline viewer
├── data/                        # Your tracking data (gitignored)
├── reports/                     # Evaluation reports (gitignored)
├── output/                      # Generated PDFs (gitignored)
├── fonts/                       # Space Grotesk + DM Sans
├── docs/                        # Setup, customization, architecture
└── examples/                    # Sample CV, report, proof points
```

## Tech Stack

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Bubble Tea](https://img.shields.io/badge/Bubble_Tea-FF75B5?style=flat&logo=go&logoColor=white)

- **Agent**: Claude Code with custom skills and modes
- **PDF**: Playwright/Puppeteer + HTML template
- **Scanner**: Playwright + Greenhouse API + WebSearch
- **Dashboard**: Go + Bubble Tea + Lipgloss (automatic Catppuccin light/dark themes)
- **Data**: Markdown tables + YAML config + TSV batch files

## Credits

Career-Ops Turkey is forked from Santiago Fernández de Valderrama's MIT-licensed [Career-Ops](https://github.com/santifer/career-ops) project. The original copyright notice is preserved in [LICENSE](LICENSE); this Turkey fork is maintained by Furkan Uyar.

## Star History

<a href="https://www.star-history.com/?repos=furkanpz%2Fcareer-ops-turkey&type=timeline&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=furkanpz/career-ops-turkey&type=timeline&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=furkanpz/career-ops-turkey&type=timeline&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=furkanpz/career-ops-turkey&type=timeline&legend=top-left" />
 </picture>
</a>

## Disclaimer

**career-ops is a local, open-source tool — NOT a hosted service.** By using this software, you acknowledge:

1. **You control your data.** Your CV, contact info, and personal data stay on your machine and are sent directly to the AI provider you choose (Anthropic, OpenAI, etc.). We do not collect, store, or have access to any of your data.
2. **You control the AI.** The default prompts instruct the AI not to auto-submit applications, but AI models can behave unpredictably. If you modify the prompts or use different models, you do so at your own risk. **Always review AI-generated content for accuracy before submitting.**
3. **You comply with third-party ToS.** You must use this tool in accordance with the Terms of Service of the career portals you interact with (Greenhouse, Lever, Workday, LinkedIn, etc.). Do not use this tool to spam employers or overwhelm ATS systems.
4. **No guarantees.** Evaluations are recommendations, not truth. AI models may hallucinate skills or experience. The authors are not liable for employment outcomes, rejected applications, account restrictions, or any other consequences.

See [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) for full details. This software is provided under the [MIT License](LICENSE) "as is", without warranty of any kind.

## Contributors

<a href="https://github.com/furkanpz/career-ops-turkey/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=furkanpz/career-ops-turkey" />
</a>

Got hired using career-ops? [Share your story!](https://github.com/furkanpz/career-ops-turkey/issues/new?template=i-got-hired.yml)

## License

MIT. The original upstream copyright notice is preserved, with an added copyright line for Furkan Uyar's Turkey fork changes.

## Support

- Bugs and feature requests: [GitHub Issues](https://github.com/furkanpz/career-ops-turkey/issues)
- Usage questions: [GitHub Discussions](https://github.com/furkanpz/career-ops-turkey/discussions)
- Security reports: [GitHub Security Advisories](https://github.com/furkanpz/career-ops-turkey/security/advisories/new)
