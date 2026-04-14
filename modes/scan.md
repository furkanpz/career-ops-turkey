# Modo: scan — Runtime Scanner

`/career-ops scan` ve `npm run scan` AYNI runtime'i kullanir: `node scan.mjs`.
Bu modu manuel WebSearch/Playwright adimlariyla yeniden uygulama. Tarama mantiginin tek source of truth'u `scan.mjs` dosyasidir.

Runtime artik sadece query taramasi yapmaz:
- tracked company careers sayfalari
- ATS kaynaklari ve public board parser'lari
- liveness dogrulamasi (`check-liveness.mjs`, `liveness-core.mjs`)

Agent gorevi tarayiciyi yeniden yazmak degil, runtime cikisini dogru yorumlamaktir.

## Execution Rules

1. Once `scan` mode is selected, run:

```bash
node scan.mjs
```

2. If the user explicitly asks for a preview without writing files, run:

```bash
node scan.mjs --dry-run
```

3. If the user asks for one company only, use:

```bash
node scan.mjs --company "<company>"
```

## Responsibilities

- Read scanner output and summarize the high-signal results.
- Highlight warnings, especially:
  - missing primary Turkey parser keys in `portals.yml`
  - blocked sources such as LinkedIn auth walls
  - liveness / expired-posting signals
  - source-level fetch failures
- Tell the user to run `/career-ops pipeline` after new offers are added.

## Constraints

- Do not mutate `portals.yml` automatically during a scan.
- Do not re-implement scanner heuristics inside the agent prompt.
- Do not auto-apply to jobs. Scanner output is discovery-only.
