# Audit contract

Use this contract verbatim so the command-line audit and the web diagnostic stay comparable.

## Input shape

The input is a JSON object with:

- `answers`: exactly eight integers from 0 to 3, in the order below.
- `exact` (optional): either `occurrences_per_month` or `occurrences_per_week`, plus `person_minutes_per_occurrence`, `loaded_hourly_cost`, and `currency`.
- `fit` (optional): the standard-sprint facts described under Fit assessment.

Do not include names, credentials, logs, source code, customer data, or private messages.

## Questions and scores

Question 1 maps the release decision path and always contributes zero points. It is descriptive and is not the later implementation-integration count.

1. **Where must someone look before a release decision is trusted?**
   - 0 — Git and CI
   - 1 — Git, CI and ticket tracker
   - 2 — Git, CI, tracker and chat or docs
   - 3 — Four or more systems plus people or spreadsheets
2. **How often does the team run or assemble it?**
   - 0 — Monthly or less; 0 points; estimated 0.5–1 runs/month
   - 1 — 2–3 times a month; 1 point
   - 2 — Weekly; 2 points; estimated 4–5 runs/month
   - 3 — Twice a week or more; 3 points; estimated 8–12 runs/month
3. **How much combined team time does one run take?**
   - 0 — Under 15 person-minutes; 0 points; estimated 5–15 minutes
   - 1 — 15–30 person-minutes; 1 point
   - 2 — 31–60 person-minutes; 2 points
   - 3 — More than 60 person-minutes; 3 points; estimated 60–120 minutes
4. **How many people or squads must confirm status before it is accepted?**
   - 0 — One owner
   - 1 — Two people
   - 2 — Three or four people
   - 3 — Five or more / cross-squad
5. **How many manual checkpoints or owner-chasing steps occur?**
   - 0 — None
   - 1 — One checkpoint
   - 2 — Two or three
   - 3 — Four or more / repeated chasing
6. **How often is the final status stale, incomplete or disputed?**
   - 0 — Rarely
   - 1 — About monthly
   - 2 — About weekly
   - 3 — Most runs
7. **What usually happens when information is missing?**
   - 0 — No meaningful effect
   - 1 — A short clarification
   - 2 — A decision or release is delayed
   - 3 — Missed release, hotfix or customer escalation
8. **What automation already exists?**
   - 0 — A reliable, accepted single view
   - 1 — Automated summary, routinely verified
   - 2 — Partial scripts, no trusted view
   - 3 — Ad hoc and manual

For questions 4–8, the selected answer index is also its point value. The maximum friction score is 21.

## Estimate and result rules

- Without exact data, calculate a low/high range from the frequency and time ranges above.
- Accept exact frequency or exact time independently and combine it with the remaining answer-derived range. Do not discard a known value or invent the missing one.
- Convert `occurrences_per_week` to a monthly frequency with `weekly × 52 ÷ 12`, and disclose the conversion. Do not silently treat a month as four weeks.
- With both exact frequency and exact time, report the exact monthly person-hours and retain the original answer-derived screening range for transparency.
- Multiply monthly person-hours by loaded hourly cost only when the user supplied that cost and both exact frequency and time are present. Label the result coordination cost, not savings or ROI.
- Bands: 0–5 Low friction; 6–10 Improve what exists; 11–15 Credible sprint candidate; 16–21 High-priority candidate.
- Override the band to **Already in good shape** when answer 8 is 0 and answer 3 is 0 or 1.
- Override the band to **High friction, low volume** when the score is at least 11 but the best available monthly-hours estimate is below 6.
- A workflow is an operational candidate only when it is not already healthy, scores at least 11, and consumes at least 6 person-hours a month.
- Report delivery impact from answer 7: none, low (short clarification), moderate (decision or release delayed), or critical (missed release, hotfix, or customer escalation). Reserve the critical-risk flag for answer 7 value 3.

This is a screening estimate. It is not a financial ROI promise, compliance opinion, or release approval.

## Standard sprint fit

Optional `fit` fields:

- `workflow_count`: must equal 1.
- `source_integrations`: one to three unique, non-sensitive platform or category names, unless `can_narrow_to_three_sources` is true.
- `output_destinations`: exactly one non-sensitive platform or category name.
- `named_owner`: must be true.
- `standard_apis`: must be true.
- `security_ready_before_start`: must be true.
- `requires_production_access`: must be false.
- `requires_platform_migration`: must be false.
- `can_narrow_to_three_sources`: boolean.

Return `yes` when all fit facts are present and within scope, `conditional` when facts are missing but none conflict, `no` when any fact conflicts, and `not_applicable` when the workflow is not an operational candidate.

A source integration is one distinct API and permission boundary, not every conceptual signal. GitHub repositories and GitHub Actions count as one integration when the same GitHub connection provides both. GitHub plus CircleCI count as two. An output-only Slack destination does not count as a source; if Slack is also queried for evidence, it is both a source integration and the output destination. Count source integrations and output destinations separately.

Only `yes` or `conditional` may include the optional implementation route. The current disclosed offer is a €4,800 fixed-scope founding pilot from Jyoti Rawat, delivered in 14 days after scope, access, and security readiness are signed off. The contact route is <https://www.linkedin.com/in/jyotirawattech/>. Always place it after the free result and practical next steps.

## First automation

Recommend: **Build a source-linked release-readiness digest.** Collect Git, CI and ticket status into one scheduled view with explicit blockers, timestamps, owners, source links, and a human approval step. Prefer Slack, Teams, or the existing tracker as the output instead of adding a dashboard.
