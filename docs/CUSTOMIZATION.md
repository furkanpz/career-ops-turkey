# Customization Guide

## Profile (`config/profile.yml` + `modes/_profile.md`)

This is the single source of truth for your identity and user-specific targeting. All modes read from here.

Key sections in `config/profile.yml`:
- **candidate**: Name, email, phone, location, LinkedIn, portfolio
- **target_roles**: Your North Star roles and archetypes
- **narrative**: Your headline, exit story, superpowers, proof points
- **compensation**: Target range, minimum, currency
- **location**: Country, timezone, visa status, on-site availability

Turkey-locale additions that the TR override layer reads when present:
- **compensation.salary_preferences**
- **language.cv_preferences**
- **location_preferences**
- **constraints**
- **automation.application**

Use `modes/_profile.md` for user-specific archetype notes, negotiation scripts, and narrative tweaks that should survive system updates.

## Target Roles (`modes/_profile.md`)

Put your archetype tweaks and adaptive framing overrides in `modes/_profile.md`, not `modes/_shared.md`:

```markdown
| Archetype | Thematic axes | What they buy |
|-----------|---------------|---------------|
| **Your Role 1** | key skills | what they need |
| **Your Role 2** | key skills | what they need |
```

Also update your adaptive framing notes to map YOUR specific projects to each archetype.

## Portals (portals.yml)

In the Turkey fork, start from `templates/portals.tr.example.yml` unless you explicitly want the global default. The global fallback remains `templates/portals.example.yml`.

Important distinction:
- System layer = Turkey market behavior, locale-aware scoring, parser coverage, aliases
- User layer = your target roles, keywords, company list, compensation targets, and narrative
- Scanner execution stays script-first: customize discovery in `portals.yml`, not by editing agent prompts.

Customize:

1. **title_filter.positive**: Keywords matching your target roles
2. **title_filter.negative**: Tech stacks or domains to exclude
3. **search_queries**: WebSearch queries for job boards (LinkedIn Jobs, Kariyer.net, Indeed Turkiye, Eleman.net, Ashby, Greenhouse, Lever, Workable, Teamtailor)
4. **tracked_companies**: Companies to check directly

The TR starter already includes a shared tracked-company layer for Turkey tech employers plus a Bilişim Vadisi discovery query. Treat that as the baseline locale surface, then add or remove employers based on your own targets.

The TR template is deliberately a tech-first generic starter. Do not treat it as the "correct" default role list; trim it to your own target families.

## CV Templates (`templates/cv-template*.html`)

The HTML templates use these design tokens:
- **Fonts**: Space Grotesk (headings) + DM Sans (body) -- self-hosted in `fonts/`
- **Colors**: Cyan primary (`hsl(187,74%,32%)`) + Purple accent (`hsl(270,70%,45%)`)
- **Layout**: Single-column, ATS-optimized

Template variants:
- `templates/cv-template.html` — legacy / Spanish-compatible default
- `templates/cv-template.en.html` — explicit English template
- `templates/cv-template.tr.html` — explicit Turkish template

To customize fonts/colors, edit the CSS in the templates. Update font files in `fonts/` if switching fonts.

## Negotiation Scripts (`modes/_profile.md`)

Keep negotiation scripts and comp pushback in `modes/_profile.md` or `config/profile.yml`. Replace the example scripts with your own:
- Target ranges
- Geographic arbitrage strategy
- Pushback responses

## Hooks (Optional)

Career-ops can integrate with external systems via Claude Code hooks. Example hooks:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "echo 'Career-ops session started'"
      }]
    }]
  }
}
```

Save hooks in `.claude/settings.json`.

## States (`tracker-status-registry.json`)

The machine-readable source of truth is `tracker-status-registry.json`.
`templates/states.yml` is only a human-readable mirror.

If you add or rename states, update:
1. `tracker-status-registry.json`
2. Any docs that explain canonical statuses
3. `templates/states.yml` only as a mirror of the registry
