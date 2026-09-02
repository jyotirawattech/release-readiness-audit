---
name: release-readiness-audit
description: Audit one recurring software release-readiness workflow, estimate its monthly coordination effort, score handoff friction, and identify the first safe automation. Use when an engineering leader wants a release coordination cost audit or release readiness checklist based on aggregate answers. Do not use for incident debugging, repository or CI configuration changes, security/compliance certification, production deployment approval, or broad DevOps transformation.
metadata:
  short-description: Measure release coordination cost and risk
---

# Release Readiness Audit

Run a read-only screening audit for one recurring release-readiness decision. Produce the useful result before discussing implementation.

## Workflow

1. Isolate one recurring release-readiness workflow. If the user describes several, ask them to choose the one that consumes the most recurring coordination time.
2. Read [references/audit-contract.md](references/audit-contract.md) before scoring. Use its exact questions, answer order, scoring, thresholds, boundaries, and disclosure rules.
3. Collect eight aggregate answers. Never request credentials, logs, source code, customer data, employee names, private messages, or secrets.
4. When available, collect exact occurrences per month or per week and combined person-minutes per occurrence. Either exact fact is useful on its own. Accept a loaded hourly cost only when the user volunteers it and both exact frequency and time are known; never invent or silently normalise a cadence.
5. Save the answers as JSON and run `node scripts/calculate.mjs --input <path> --format markdown`. The script is the scoring authority; do not calculate or alter the result by intuition.
6. Present, in this order:
   - friction score and result band;
   - estimated monthly person-hours and calculation basis;
   - release decision path, delivery impact, and first recommended automation;
   - three practical next steps;
   - standard-sprint fit, if supplied;
   - optional implementation route only when the calculator returns one.
7. Explain that this is a screening estimate, not an ROI promise or release approval. Treat missing evidence as unknown, never as a pass.

## Fit assessment

Only collect implementation-fit facts after the user has received the diagnostic result, or when those facts are already present. The fixed sprint covers one workflow, up to three source integrations, one output destination, a named owner, standard APIs, and no production deployment authority or platform migration. Count a source integration by distinct API and permission boundary: GitHub repositories and GitHub Actions accessed through the same GitHub connection count as one; an output-only Slack destination is not also a source.

If fit facts are missing, label the route conditional. If the scope exceeds the boundaries, show the useful result and self-service next steps but do not show a sales link.

## Boundaries

- Remain read-only. Do not change repositories, CI/CD, tickets, chat, infrastructure, or production systems.
- Do not claim that the audit certifies security, compliance, deployment safety, or GDPR compliance.
- Do not invent savings percentages, industry benchmarks, or evidence.
- Recommend deterministic collection before AI classification or summarisation.
- Preserve source links, timestamps, named ownership, human approval, failure alerts, and a manual fallback in any proposed implementation.
