# Contributing

Useful contributions make the diagnostic more accurate, safer, or easier to run without broadening it into a repository scanner or deployment gate.

Good issue topics include:

- an answer or threshold that is ambiguous in a real release-coordination workflow;
- a calculator result that differs from the published contract;
- a false-positive implementation recommendation;
- a privacy, permissions, or disclosure problem;
- an installation or compatibility failure with reproducible details.

Before proposing a change, run:

```bash
npm test
npm run audit:example
```

Do not include secrets, internal logs, source code, private workflow content, customer information, employee names, or unpublished incident details in an issue or pull request. Reduce examples to aggregate or synthetic facts.

Scoring changes must update the contract, calculator, examples, tests, and changelog together. Do not add unsupported benchmarks, ROI claims, autonomous deploy actions, or a commercial link before the diagnostic result.
