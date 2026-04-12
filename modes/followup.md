# Mode: followup -- Follow-up Cadence Tracker

## Purpose

Track follow-up cadence for active applications. Flag overdue follow-ups, extract contacts from notes, and generate tailored follow-up email or LinkedIn drafts using report context.

## Inputs

- `data/applications.md` — application tracker
- `data/follow-ups.md` — follow-up history (create on first use)
- `reports/` — evaluation reports for context in drafts
- `config/profile.yml` — user profile
- `cv.md` — CV for proof points in drafts

## Step 1 — Run Cadence Script

Execute:

```bash
node followup-cadence.mjs
```

Parse the JSON output. It contains:

- `metadata` — analysis date, total tracked, actionable count, overdue or urgent counts
- `entries` — per application cadence state, follow-up count, next follow-up date, urgency, extracted contacts, report path
- `cadenceConfig` — cadence rules

If there are no actionable entries, tell the user there is nothing active to follow up on yet.

## Step 2 — Display Dashboard

Show a dashboard sorted by urgency:

```text
Follow-up Cadence Dashboard - {date}
{N} applications tracked, {N} actionable

| # | Company | Role | Status | Days | Follow-ups | Next | Urgency | Contact |
```

Use practical urgency labels:
- `urgent` — the company responded and the user should reply quickly
- `overdue` — follow-up is due
- `waiting` — on track
- `cold` — too many follow-ups already sent; deprioritize

## Step 3 — Generate Follow-up Drafts

For each `urgent` or `overdue` entry only:

1. Read the linked report (`reportPath`) for company context.
2. Read `cv.md` for proof points.
3. Read `config/profile.yml` for the candidate name and identity.

### First follow-up

Generate a short 3-4 sentence email:

1. Reference the specific role and when the application was sent.
2. Mention one concrete value-add from the report or CV.
3. Make a soft ask and offer availability.
4. Optionally include a relevant recent project or achievement.

Rules:
- professional but not desperate
- never say "just checking in", "touching base", or "circling back"
- lead with value, not with the ask
- keep it under 150 words
- include a subject line

### LinkedIn follow-up

If no email contact is found, generate a concise LinkedIn follow-up:
- 3 short sentences
- under 300 characters
- company-specific hook + proof point + soft ask

### Second follow-up

If one follow-up already exists:
- make it shorter than the first
- take a new angle
- do not repeat the same value proposition

### Cold applications

If two or more follow-ups were already sent, do not draft another one. Instead recommend closing or deprioritizing the application unless the user has a strong reason to keep pushing.

## Step 4 — Present Drafts

For each generated draft, show:

```text
## Follow-up: {Company} — {Role} (#{num})

To: {email or fallback note}
Subject: {subject}
Days since application: {N}
Follow-ups sent: {N}
Channel: Email / LinkedIn
```

Then print the draft body.

## Step 5 — Record Sent Follow-ups

Only after the user confirms a follow-up was actually sent:

1. If `data/follow-ups.md` does not exist, create it with:
   ```markdown
   # Follow-up History

   | # | App# | Date | Company | Role | Channel | Contact | Notes |
   |---|------|------|---------|------|---------|---------|-------|
   ```
2. Append a row with the next sequence number and the confirmed details.
3. Optionally update the notes in `data/applications.md` if the user explicitly asks to keep tracker notes in sync.

Never record a draft as sent unless the user confirms it.
