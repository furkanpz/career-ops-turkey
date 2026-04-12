# Setup Guide

## Prerequisites

- [Claude Code](https://claude.ai/code) installed and configured
- Node.js 18+ (for PDF generation and utility scripts)
- (Optional) Go 1.21+ (for the dashboard TUI)

## Quick Start (5 steps)

### 1. Clone and install

```bash
git clone https://github.com/furkanpz/career-ops-turkey.git
cd career-ops-turkey
npm install
npx playwright install chromium   # Required for PDF generation
```

### 2. Configure your profile

```bash
cp config/profile.tr.example.yml config/profile.yml
# Fallback global starter:
# cp config/profile.example.yml config/profile.yml
```

Edit `config/profile.yml` with your personal details: name, email, target roles, narrative, proof points. The Turkey profile starter is only a locale-aware scaffold; it is not a recommended default persona.

### 3. Add your CV

Create `cv.md` in the project root with your full CV in markdown format. This is the source of truth for all evaluations and PDFs.

(Optional) Create `article-digest.md` with proof points from your portfolio projects/articles.

### 4. Configure portals

```bash
cp templates/portals.tr.example.yml portals.yml
# Fallback global starter:
# cp templates/portals.example.yml portals.yml
```

Edit `portals.yml`:
- Update `title_filter.positive` with keywords matching your target roles
- Add companies you want to track in `tracked_companies`
- Customize `search_queries` for your preferred job boards

The Turkey starter now includes primary board coverage for LinkedIn Jobs, Kariyer.net, Indeed Turkiye, and Eleman.net, plus secondary coverage for Secretcv, Yenibiris, and ISKUR.
It also ships with a tracked-company starter for public Turkey tech employers and a Bilişim Vadisi careers discovery query, so the company-scan layer is available out of the box rather than being user-only.
Treat this file as a customizable starter for Turkey-market discovery, not as a fixed role pack. Keep the locale defaults, then narrow or widen the role families yourself.
If your existing `portals.yml` was created before these parser keys existed, keep your custom file and merge the missing query entries manually from `templates/portals.tr.example.yml`.

If you are Turkey-based, also add this profile convention:

```yaml
language:
  modes_dir: "modes/tr"
```

Canonical commands stay the same. The Turkish aliases `teklif` and `basvur` are supported, but they resolve back to the canonical evaluation/apply flows.
`followup` is also available for application follow-up cadence once you start tracking live applications.

Parser-safe report keys stay English even in Turkish workflows: `Archetype`, `TL;DR`, `Remote`, `Comp`, `Date`, `Score`, `URL`, `PDF`, `Batch ID`.

### 5. Start using

Open Claude Code in this directory:

```bash
claude
```

Then paste a job offer URL or description. Career-ops will automatically evaluate it, generate a report, create a tailored PDF, and track it.

## Available Commands

| Action | How |
|--------|-----|
| Evaluate an offer | Paste a URL or JD text |
| Search for offers | `/career-ops scan` |
| Process pending URLs | `/career-ops pipeline` |
| Generate a PDF | `/career-ops pdf` |
| Batch evaluate | `/career-ops batch` |
| Check tracker status | `/career-ops tracker` |
| Fill application form | `/career-ops apply` |
| Prepare for interviews | `/career-ops interview-prep` |
| Analyze rejection patterns | `/career-ops patterns` |
| Track follow-up cadence | `/career-ops followup` |

## Verify Setup

```bash
node cv-sync-check.mjs      # Check configuration
node verify-pipeline.mjs     # Check pipeline integrity
npm run scan -- --dry-run    # Preview scanner behavior without writing files
```

## Build Dashboard (Optional)

```bash
cd dashboard
go build -o career-dashboard .
./career-dashboard --path ..  # Opens TUI pipeline viewer
```
