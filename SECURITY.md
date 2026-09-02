# Security and privacy

## Data handling

The calculator runs locally and makes no network requests. It reads one JSON object, writes the result to standard output, and does not persist, transmit, or enrich the input.

Use aggregate workflow facts only. Never include:

- access tokens, passwords, API keys, or credentials;
- source code, logs, repository contents, or CI output;
- customer, employee, or incident-identifying information;
- private ticket, chat, email, or document content.

## Permissions

The audit requires no Git provider, CI/CD, ticketing, chat, cloud, infrastructure, or production permissions. The agent instructions prohibit changing those systems.

## Threat model and boundaries

The main risks are sensitive data pasted into an input, a user treating a screening result as release approval, or an implementation receiving excessive access. The package reduces those risks by requiring aggregate answers, stating that unknowns are not passes, producing no deploy decision, making no network calls, and separating any implementation from the diagnostic.

Any later implementation should use customer-created least-privilege credentials, source-linked fields, explicit timestamps and owners, human approval, a failed-run alert, a manual fallback, and documented access removal.

## Reporting a vulnerability

Do not include secrets or personal data in a public issue. Contact the maintainer privately through the LinkedIn profile linked in the README with a short description and a safe reproduction. No bug-bounty or response-time promise is currently offered.
