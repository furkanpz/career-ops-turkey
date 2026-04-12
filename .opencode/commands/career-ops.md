---
description: AI job search command center -- show menu or evaluate job description
---

Career-ops router. Arguments provided: "$ARGUMENTS"

If arguments contain a job description or URL (keywords like "responsibilities", "requirements", "qualifications", "about the role", "http", "https"), the skill will execute auto-pipeline mode.

Otherwise, the discovery menu will be shown.

The skill must respect `config/profile.yml -> language.modes_dir` when it exists and keep Turkish aliases `teklif` and `basvur` compatible with the canonical command set.

Load the career-ops skill:
```
skill({ name: "career-ops" })
```
