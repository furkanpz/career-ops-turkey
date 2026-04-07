# Turkey-Specific Scoring Framework

## Goal

Define a Turkey-specific job scoring framework for `career-ops` that:

- fits the existing A-F evaluation pipeline
- preserves the current 1-5 weighted scoring spirit
- stays practical for real Turkey-market job filtering
- uses explicit, repeatable scoring guidance instead of vague intuition

## Scope Assumption

This framework is designed for:

- Turkey-based candidates
- roles in Turkey or roles realistically open to Turkey-based candidates
- mixed-language hiring markets, where the JD can be in Turkish or English

It is not limited to Turkish-language roles only.

## How The Current Evaluation Flow Appears To Work

Based on repo structure and docs:

1. Input comes from a pasted JD or URL.
2. JD text is extracted through browser or fetch fallback.
3. The role is classified into an archetype.
4. The evaluator produces 6 structured blocks:
   - A: role summary
   - B: CV match and gap analysis
   - C: seniority/level strategy
   - D: compensation and market research
   - E: CV personalization plan
   - F: interview story preparation
5. A global score is produced as a weighted 1-5 score.
6. A report is saved, a PDF can be generated, and the result is tracked.

Observed compatibility constraints from the repo:

- `modes/_shared.md` defines a weighted 1-5 global score and already separates red flags from core dimensions.
- `docs/ARCHITECTURE.md` says the system uses a weighted average across 10 dimensions.
- `modes/oferta.md` and `batch/batch-prompt.md` expect the report to stay structured around A-F blocks.

Recommended compatibility rule:

- keep A-F exactly as the evidence-gathering structure
- replace the current coarse global score breakdown with a Turkey-ready 10-dimension matrix
- keep red flags as a separate cap/override, not as a hidden subjective penalty

## Design Principles

1. Evidence first. Every score should be traceable to JD text, profile constraints, or market research.
2. Turkey realism. City, hybrid policy, salary opacity, and company credibility matter more in this market than in a generic global framework.
3. No fake precision. Use 1-5 anchors with clear thresholds.
4. Hard filters stay explicit. Serious red flags should cap the final score instead of being diluted inside averages.
5. Candidate-specific fit matters. Scores should use `config/profile.yml` and any Turkey-ready preference fields if available.

## Scoring Scale

Use the same 1-5 scale for every dimension:

- `5` = strong positive signal, no meaningful concern
- `4` = good enough, minor caveats only
- `3` = workable but mixed
- `2` = weak fit or material risk
- `1` = poor fit or serious concern

## Weighted Dimensions

The weighted score should use 10 dimensions and sum to 100.

| Dimension | Weight |
|---|---:|
| Role Fit | 18 |
| Alignment With Candidate Goals | 12 |
| Seniority Fit | 10 |
| City / Work Model Fit | 10 |
| Language Fit | 8 |
| Salary Transparency / Market Fairness | 12 |
| Posting Quality | 8 |
| Company Clarity / Hiring Credibility | 8 |
| Application Effort | 6 |
| Interview Likelihood | 8 |

Formula:

```text
weighted_score =
  (role_fit * 18 +
   candidate_goals * 12 +
   seniority_fit * 10 +
   city_work_model_fit * 10 +
   language_fit * 8 +
   salary_transparency * 12 +
   posting_quality * 8 +
   company_clarity * 8 +
   application_effort * 6 +
   interview_likelihood * 8) / 100
```

## Dimension Details

### 1. Role Fit

Weight: `18`

Definition:

- How well the actual responsibilities and required skills match the candidate's proven experience.

Primary evidence source:

- Block B (`CV match`)

Signals:

- close overlap between JD requirements and CV proof points
- required stack matches shipped work, not just exposure
- proof points map to the role archetype
- gaps are minor or clearly mitigable

Risks:

- JD is mostly adjacent rather than core
- required stack is missing from CV
- role title looks right but responsibilities are materially different
- role expects deep domain experience the candidate does not have

Scoring guidance:

- `5`: 80%+ of core requirements map directly to strong CV proof points; no true hard blocker
- `4`: 60-79% direct match; one or two manageable gaps
- `3`: 40-59% direct match; multiple adjacent-but-not-direct matches
- `2`: 20-39% direct match; the candidate would need a narrative rescue to justify applying
- `1`: under 20% direct match or one clear non-negotiable technical blocker

### 2. Alignment With Candidate Goals

Weight: `12`

Definition:

- How well the role aligns with the candidate's target roles, constraints, and long-term direction.

Primary evidence source:

- `config/profile.yml`
- `modes/_profile.md`
- Turkey-ready profile preferences if present

Signals:

- role matches a primary archetype or stated North Star role
- domain and ownership level support the candidate's intended direction
- work model, compensation structure, and location fit stated preferences
- must-haves are present and deal-breakers are absent

Risks:

- role is off-track, down-market, or a career detour
- candidate would apply only because the market is difficult
- the role conflicts with must-have constraints
- the job appears attractive only because of brand name

Scoring guidance:

- `5`: direct match to primary target role and no conflict with stated goals or constraints
- `4`: strong fit to a secondary target or adjacent path with a clear strategic reason
- `3`: neutral; acceptable but not clearly advancing the candidate's plan
- `2`: materially off-target or conflicts with one important preference
- `1`: clearly against the candidate's goals or violates a documented deal-breaker

### 3. Seniority Fit

Weight: `10`

Definition:

- How well the JD level matches the candidate's credible positioning in that archetype.

Primary evidence source:

- Block C (`level strategy`)

Signals:

- scope, ownership, and expectations align with past work
- title and impact level are consistent with the candidate's story
- candidate can defend level without exaggeration

Risks:

- inflated title with junior scope
- under-leveling that would force compensation or growth tradeoffs
- leadership expectations not backed by evidence
- hidden manager expectations in an IC-looking role

Scoring guidance:

- `5`: level is a clean fit; candidate can credibly perform and interview at this level now
- `4`: slight stretch or slight downlevel, but still rational
- `3`: noticeable mismatch, but still survivable with strong framing
- `2`: clear mismatch; likely downlevel, rejection, or bad mutual fit
- `1`: the JD level is fundamentally wrong for the candidate

### 4. City / Work Model Fit

Weight: `10`

Definition:

- How well the location, city expectations, and remote/hybrid/onsite policy fit the candidate's Turkey-specific constraints.

Primary evidence source:

- Block A (`role summary`)
- `config/profile.yml`
- Turkey-ready location preferences if present

Signals:

- role is remote in Turkey, hybrid in a preferred city, or onsite where the candidate is already based
- relocation requirement is acceptable
- hybrid cadence is realistic
- the employer is explicit about city and work model

Risks:

- city is missing or inconsistent across posting pages
- “hybrid” really means near-daily office attendance
- role is remote but excludes Turkey payroll or Turkey-based workers
- relocation is required to a non-preferred city

Scoring guidance:

- `5`: exact fit with preferred city/work model and no relocation friction
- `4`: workable city/work model with only minor compromise
- `3`: possible, but would require a meaningful compromise on commute or mode
- `2`: weak fit; relocation or onsite expectations are likely to become a problem
- `1`: location/work model conflicts with stated constraints or makes the role unrealistic

### 5. Language Fit

Weight: `8`

Definition:

- How well the language expectations of the role align with the candidate's working language ability and available application materials.

Primary evidence source:

- JD language
- Block A
- profile language preferences if present

Signals:

- JD language matches the candidate's strongest professional language
- internal/external communication expectations are explicit
- candidate can reasonably interview and work in the expected language
- CV language can be aligned to the posting

Risks:

- Turkish JD but English-only interview process or vice versa
- client-facing Turkish expectations not stated clearly
- the role requires fluent written Turkish for legal/compliance/customer communication
- the candidate would need to bluff language comfort

Scoring guidance:

- `5`: language expectations are clear and fully aligned
- `4`: good fit with minor adaptation needed, such as CV language switch
- `3`: mixed; candidate can probably function but not from a position of strength
- `2`: language expectations are material risk for interviews or day-to-day work
- `1`: the candidate is not realistically qualified on language grounds

### 6. Salary Transparency / Market Fairness

Weight: `12`

Definition:

- How transparent and market-fair the compensation appears for Turkey-market conditions.

Primary evidence source:

- Block D (`comp and market research`)
- profile compensation preferences

Signals:

- salary range is stated or reasonably inferable
- compensation unit is clear: gross/net, monthly/annual, TRY/EUR/USD, payroll/contractor
- benefits and bonus structure are understandable
- reported range is at or above fair market for the level and city

Risks:

- no compensation detail at all
- misleading “competitive salary” language
- mix of net and gross wording without clarification
- contractor/EOR setup presented as employee-equivalent without details
- salary clearly below Turkey-market norms for the role

Scoring guidance:

- `5`: transparent range and clearly fair or strong versus market
- `4`: range is partially clear and likely fair
- `3`: no real transparency, but available evidence suggests the comp may still be workable
- `2`: opaque or below-market signals; likely negotiation pain
- `1`: strongly negative comp signals or compensation structure is suspicious

### 7. Posting Quality

Weight: `8`

Definition:

- How trustworthy, specific, and decision-useful the job posting itself is.

Primary evidence source:

- Blocks A and D

Signals:

- concrete responsibilities and requirements
- clear title, scope, team, and work model
- realistic stack description
- coherent posting date and source consistency

Risks:

- copy-paste buzzword soup
- generic title with no real scope
- contradictory seniority or location language
- recruiting spam or aggregation residue
- likely stale posting

Scoring guidance:

- `5`: specific, current, and decision-useful posting with minimal ambiguity
- `4`: mostly clear; only one minor ambiguity
- `3`: usable but incomplete or slightly inconsistent
- `2`: poor quality posting with several unknowns
- `1`: too vague or contradictory to justify serious effort

### 8. Company Clarity / Hiring Credibility

Weight: `8`

Definition:

- How credible and legible the employer and hiring setup appear from the available evidence.

Primary evidence source:

- Block D
- company site
- source consistency across posting and company presence

Signals:

- identifiable company, legal presence, or established operating footprint
- clear product or service explanation
- coherent career page, recruiter presence, or recent hiring activity
- consistent company naming across portals

Risks:

- no credible company footprint
- stealth language with no trustworthy context
- agency posting that hides the employer with weak details
- contradictory company descriptions or suspicious domains
- evidence of churn-heavy or low-signal hiring behavior

Scoring guidance:

- `5`: company identity and hiring setup are clear and credible
- `4`: mostly credible with one mild unknown
- `3`: some uncertainty, but enough legitimacy to continue
- `2`: significant ambiguity about the company or role sponsor
- `1`: credibility concerns are serious enough to question whether to engage

### 9. Application Effort

Weight: `6`

Definition:

- How much effort and friction are required to produce a serious application relative to likely upside.

Primary evidence source:

- apply flow
- Block E (`personalization plan`)
- portal behavior

Signals:

- one-click or low-friction ATS
- limited manual re-entry
- no unnecessary assessments before first contact
- personalization needed is reasonable

Risks:

- full CV retyping
- unpaid assignments before screening
- multi-page forms asking for duplicate data
- heavy localization/custom writing burden for a low-probability role

Scoring guidance:

- `5`: low-friction application; strong expected return on effort
- `4`: manageable effort with some manual steps
- `3`: noticeable effort, but still acceptable if the role is strong
- `2`: high-friction process that needs a very strong role to justify it
- `1`: excessive effort relative to likely payoff

### 10. Interview Likelihood

Weight: `8`

Definition:

- How likely the candidate is to reach a first interview if they apply well.

Primary evidence source:

- synthesis of Blocks B, C, D, and E

Signals:

- strong requirement match
- clear seniority fit
- company likely to process applications seriously
- manageable applicant pool signals
- CV can be tailored to tell a clean story

Risks:

- role is likely flooded with applicants
- hidden internal hire or referral-led process
- candidate match is decent but not distinctive
- company looks real, but process quality is low

Scoring guidance:

- `5`: high probability of first interview if the application is tailored well
- `4`: good probability; candidate is competitive
- `3`: plausible but uncertain
- `2`: low probability without unusual luck, referral, or timing
- `1`: very unlikely to generate interview traction

## Turkey-Specific Red Flag Rules

Red flags should remain separate from the weighted matrix.

Reason:

- the current repo already treats red flags as distinct from the positive fit dimensions
- this avoids hiding serious issues inside a mathematically decent average

### Critical Red Flags

Examples:

- unpaid trial work before screening
- suspicious or unverifiable employer identity
- compensation structure that looks deceptive or exploitative
- role unavailable to Turkey-based candidates despite implying otherwise
- explicit requirement that conflicts with a hard candidate constraint

Rule:

- any critical red flag caps the final score at `2.4`
- default recommendation: do not apply

### Major Red Flags

Examples:

- completely opaque compensation plus below-market signals
- location/work model contradiction
- highly vague or stale posting
- unclear legal employer for payroll/contract setup
- obvious bait-and-switch risk in title or seniority

Rule:

- one major red flag caps the final score at `3.4`
- two major red flags cap the final score at `2.9`

### Minor Red Flags

Examples:

- small ambiguity in hybrid cadence
- missing team information
- one weak employer-detail signal

Rule:

- minor red flags do not cap automatically
- they should already depress one or more weighted dimensions

## Score Interpretation

Keep the repo's current decision spirit:

- `4.5-5.0`: strong match, prioritize immediately
- `4.0-4.49`: good match, worth applying
- `3.5-3.99`: selective apply only if there is a strategic reason
- `below 3.5`: usually not worth the time

If a red-flag cap lowers the final score, the capped score is the one that should drive the recommendation.

## How This Maps Back To The Existing System

Current coarse buckets map cleanly to the proposed Turkey matrix:

| Current spirit | Turkey-ready dimensions |
|---|---|
| Match con CV | Role Fit, Seniority Fit, Interview Likelihood |
| North Star alignment | Alignment With Candidate Goals |
| Comp | Salary Transparency / Market Fairness |
| Cultural signals | City / Work Model Fit, Posting Quality, Company Clarity |
| Red flags | Separate cap/override system |

This keeps the evaluation recognizable while making the score materially more useful for real Turkey-market decisions.

## Recommended Report Usage

Inside the existing A-F report structure:

- Blocks A-F should remain unchanged as the evidence sections.
- The global score section should display all 10 dimensions with weights and 1-5 scores.
- Any red-flag cap should be stated explicitly below the weighted score.

Recommended output shape:

```markdown
## Global Score

| Dimension | Weight | Score |
|---|---:|---:|
| Role Fit | 18 | 4 |
| Alignment With Candidate Goals | 12 | 5 |
| Seniority Fit | 10 | 4 |
| City / Work Model Fit | 10 | 3 |
| Language Fit | 8 | 5 |
| Salary Transparency / Market Fairness | 12 | 2 |
| Posting Quality | 8 | 4 |
| Company Clarity / Hiring Credibility | 8 | 4 |
| Application Effort | 6 | 3 |
| Interview Likelihood | 8 | 4 |
| **Weighted Score** | **100** | **3.86/5** |

Red-flag cap: major
Final score: 3.40/5
```

That format is explicit, machine-readable enough for later parsing, and consistent with the repo's structured evaluation style.
