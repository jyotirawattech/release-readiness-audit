# Release Readiness Audit — coordination cost checklist

A free, read-only diagnostic for Heads and VPs of Engineering who repeatedly rebuild release status across Git, CI, ticketing, chat, docs, people, or spreadsheets.

It takes eight aggregate answers, estimates monthly coordination effort, scores handoff friction, and recommends the first safe automation. It does **not** scan a repository, approve a deployment, certify security, edit CI/CD, or request credentials.

## What you get

- a 0–21 release-coordination friction score;
- an answer-derived range or exact monthly person-hour estimate;
- a source-pattern and delivery-risk flag;
- one recommended automation and three practical next steps;
- a separate scope check for the optional fixed implementation.

The result appears before any commercial route. Workflows that are already healthy, below the operating threshold, or outside the standard scope receive no sales link.

## Try it in 60 seconds

Requires Node.js 18 or newer and has no third-party dependencies.

```bash
npm test
npm run audit:example
```

Or run your own aggregate answers:

```bash
node scripts/calculate.mjs --input your-answers.json --format markdown
```

Use [examples/qualified.json](examples/qualified.json) as the input template. The exact questions and scoring rules are public in [references/audit-contract.md](references/audit-contract.md).

## Use as an agent skill

This repository follows the Agent Skills directory format. After the public repository is available, install it with:

```bash
npx skills add jyotirawattech/release-readiness-audit
```

Then prompt your compatible agent:

```text
Use $release-readiness-audit to estimate our monthly release-coordination cost and identify the first handoff to fix.
```

The skill should ask only for aggregate workflow facts. Do not paste credentials, logs, source code, customer data, employee names, or private messages.

## Example result

The included qualified example scores 17/21 and estimates 10 person-hours per month. It recommends a source-linked release-readiness digest before showing the separately disclosed optional implementation route.

Run the two negative cases as well:

```bash
node scripts/calculate.mjs --input examples/outside-standard-scope.json --format markdown
node scripts/calculate.mjs --input examples/already-healthy.json --format markdown
```

The first is painful but too broad for the fixed sprint; the second is already healthy. Neither output contains a sales link.

## Method and limitations

The calculator is deterministic and versioned. Its monthly estimate uses selected ranges and safely incorporates exact frequency or combined person-minutes when either is known. Weekly cadence is converted with 52 ÷ 12 and disclosed. A loaded hourly cost is optional, requires a complete exact estimate, and is never inferred.

This is a screening diagnostic, not a benchmark, ROI promise, compliance opinion, production-readiness certification, or release approval. Missing evidence stays unknown. Human owners retain every decision.

## Commercial disclosure

Jyoti Rawat publishes and maintains this free audit. Only an operational candidate that does not conflict with the standard scope may see an optional €4,800 fixed-scope implementation offer, delivered in 14 days after scope, access, and security readiness are signed off. The implementation covers one workflow, up to three source integrations, one output destination, acceptance testing, failure alert, manual fallback, runbook, and handover. A source integration means one distinct API and permission boundary; an output-only destination is counted separately.

If your completed result includes an `implementation_route`, use its [technical fit check](https://www.linkedin.com/in/jyotirawattech/). If it does not, follow the free next steps instead.

## Security and privacy

See [SECURITY.md](SECURITY.md). The calculator runs locally, performs no network requests, stores nothing, and needs no repository or production access.

## License

MIT. See [LICENSE](LICENSE).
