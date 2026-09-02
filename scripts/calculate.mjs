#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

export const AUDIT_VERSION = '0.1.0';

const questions = [
  {
    short: 'Release sources',
    options: [
      'Git and CI',
      'Git, CI and ticket tracker',
      'Git, CI, tracker and chat or docs',
      'Four or more systems plus people or spreadsheets',
    ],
    scores: [0, 0, 0, 0],
  },
  {
    short: 'Frequency',
    options: ['Monthly or less', '2–3 times a month', 'Weekly', 'Twice a week or more'],
    scores: [0, 1, 2, 3],
    ranges: [[0.5, 1], [2, 3], [4, 5], [8, 12]],
  },
  {
    short: 'Team time',
    options: ['Under 15 person-minutes', '15–30 person-minutes', '31–60 person-minutes', 'More than 60 person-minutes'],
    scores: [0, 1, 2, 3],
    ranges: [[5, 15], [15, 30], [31, 60], [60, 120]],
  },
  { short: 'Confirmations', scores: [0, 1, 2, 3] },
  { short: 'Handoffs', scores: [0, 1, 2, 3] },
  { short: 'Trust', scores: [0, 1, 2, 3] },
  { short: 'Consequence', scores: [0, 1, 2, 3] },
  { short: 'Current state', scores: [0, 1, 2, 3] },
];

const FIT_FIELDS = [
  'workflow_count',
  'source_integrations',
  'output_destinations',
  'named_owner',
  'standard_apis',
  'security_ready_before_start',
  'requires_production_access',
  'requires_platform_migration',
  'can_narrow_to_three_sources',
];

function assertFinitePositive(value, name, allowZero = false) {
  const valid = typeof value === 'number' && Number.isFinite(value) && (allowZero ? value >= 0 : value > 0);
  if (!valid) throw new Error(`${name} must be a ${allowZero ? 'non-negative' : 'positive'} number.`);
}

function assertUniqueStringList(value, name) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    throw new Error(`${name} must be a non-empty array of non-empty strings.`);
  }
  const normalized = value.map((item) => item.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) throw new Error(`${name} must not contain duplicates.`);
}

export function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Input must be a JSON object.');
  }
  if (!Array.isArray(input.answers) || input.answers.length !== 8) {
    throw new Error('answers must contain exactly eight option indexes.');
  }
  input.answers.forEach((answer, index) => {
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
      throw new Error(`answers[${index}] must be an integer from 0 to 3.`);
    }
  });
  if (input.exact !== undefined) {
    if (!input.exact || typeof input.exact !== 'object' || Array.isArray(input.exact)) {
      throw new Error('exact must be an object when supplied.');
    }
    for (const field of ['occurrences_per_month', 'occurrences_per_week', 'person_minutes_per_occurrence']) {
      if (input.exact[field] !== undefined) assertFinitePositive(input.exact[field], `exact.${field}`);
    }
    const hasMonthlyOccurrences = input.exact.occurrences_per_month !== undefined;
    const hasWeeklyOccurrences = input.exact.occurrences_per_week !== undefined;
    const hasMinutes = input.exact.person_minutes_per_occurrence !== undefined;
    if (hasMonthlyOccurrences && hasWeeklyOccurrences) {
      throw new Error('Supply exact.occurrences_per_month or exact.occurrences_per_week, not both.');
    }
    if (input.exact.loaded_hourly_cost !== undefined) {
      assertFinitePositive(input.exact.loaded_hourly_cost, 'exact.loaded_hourly_cost', true);
      if ((!hasMonthlyOccurrences && !hasWeeklyOccurrences) || !hasMinutes) {
        throw new Error('Exact frequency and person-minutes are required before estimating coordination cost.');
      }
    }
    if (input.exact.currency !== undefined && (typeof input.exact.currency !== 'string' || !/^[A-Z]{3}$/.test(input.exact.currency))) {
      throw new Error('exact.currency must be a three-letter uppercase currency code.');
    }
  }
  if (input.fit !== undefined && (!input.fit || typeof input.fit !== 'object' || Array.isArray(input.fit))) {
    throw new Error('fit must be an object when supplied.');
  }
  if (input.fit) {
    if (input.fit.workflow_count !== undefined && (!Number.isInteger(input.fit.workflow_count) || input.fit.workflow_count < 1)) {
      throw new Error('fit.workflow_count must be a positive integer.');
    }
    for (const field of ['source_integrations', 'output_destinations']) {
      if (input.fit[field] !== undefined) assertUniqueStringList(input.fit[field], `fit.${field}`);
    }
    for (const field of FIT_FIELDS.slice(3)) {
      if (input.fit[field] !== undefined && typeof input.fit[field] !== 'boolean') {
        throw new Error(`fit.${field} must be true or false.`);
      }
    }
  }
  return input;
}

function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatHours(low, high, exactHours) {
  if (exactHours !== null) return `${round(exactHours)} person-hours / month`;
  if (high < 1) return 'Less than 1 person-hour / month';
  const roundedLow = Math.max(1, Math.floor(low * 2) / 2);
  const roundedHigh = Math.ceil(high * 2) / 2;
  return `${roundedLow}–${roundedHigh} person-hours / month`;
}

function practicalActions(answers, criticalDeliveryRisk) {
  const candidates = [];
  const add = (priority, action) => candidates.push({ priority, action });

  if (criticalDeliveryRisk) add(110, 'Add a failed-run alert and preserve the manual fallback before changing the process.');
  if (answers[0] === 3) add(100, 'Reduce the workflow to three source integrations; use chat or docs as the output destination unless they are required evidence.');
  if (answers[5] >= 2) add(90 + answers[5], 'Timestamp every field and flag missing or stale evidence instead of hiding it.');
  if (answers[4] >= 2) add(85 + answers[4], 'Name one approval owner and auto-populate the context they repeatedly request.');
  if (answers[3] >= 2) add(80 + answers[3], 'Schedule one read-only digest that links back to every source system.');
  if (answers[7] >= 2) add(75 + answers[7], 'Automate deterministic collection first; use AI only for classification or summary.');
  if (answers[0] === 2) add(70, 'Confirm the systems of record and keep chat or docs output-only unless they contain required evidence.');

  const defaults = [
    'Measure two real runs before changing anything; record person-minutes and rework.',
    'Deliver the result in Slack, Teams, or your tracker instead of adding a dashboard.',
    'Keep every action human-approved until the output is trusted.',
  ];
  for (const action of defaults) {
    add(10, action);
  }
  return candidates.sort((left, right) => right.priority - left.priority).slice(0, 3).map(({ action }) => action);
}

function assessFit(fit, operationalCandidate) {
  if (!operationalCandidate) {
    return { status: 'not_applicable', reasons: ['The diagnostic does not meet the score and monthly-effort threshold for the fixed sprint.'], missing: [] };
  }

  const missing = FIT_FIELDS.filter((field) => fit?.[field] === undefined);
  const reasons = [];
  if (fit) {
    if (fit.workflow_count !== undefined && fit.workflow_count !== 1) reasons.push('The fixed sprint covers exactly one workflow.');
    if (fit.source_integrations !== undefined && fit.source_integrations.length > 3 && fit.can_narrow_to_three_sources !== true) reasons.push('The fixed sprint supports up to three source integrations.');
    if (fit.output_destinations !== undefined && fit.output_destinations.length !== 1) reasons.push('The fixed sprint supports one output destination.');
    if (fit.named_owner === false) reasons.push('A named workflow owner is required.');
    if (fit.standard_apis === false) reasons.push('The standard sprint requires usable standard APIs.');
    if (fit.security_ready_before_start === false) reasons.push('Access and security review must be ready before the 14-day implementation starts.');
    if (fit.requires_production_access === true) reasons.push('The fixed sprint does not require or accept production deployment authority.');
    if (fit.requires_platform_migration === true) reasons.push('A platform migration is outside the fixed sprint.');
  }

  if (reasons.length > 0) return { status: 'no', reasons, missing };
  if (missing.length > 0) return { status: 'conditional', reasons: ['No supplied fact conflicts with the fixed scope; confirm the missing fit facts before booking.'], missing };
  return { status: 'yes', reasons: ['The supplied facts fit the standard one-workflow implementation scope.'], missing: [] };
}

export function calculateAudit(rawInput) {
  const input = validateInput(rawInput);
  const { answers } = input;
  const score = questions.reduce((total, question, index) => total + question.scores[answers[index]], 0);
  const frequency = questions[1].ranges[answers[1]];
  const minutes = questions[2].ranges[answers[2]];
  const answerLowHours = (frequency[0] * minutes[0]) / 60;
  const answerHighHours = (frequency[1] * minutes[1]) / 60;
  const exactMonthlyFrequency = input.exact?.occurrences_per_month
    ?? (input.exact?.occurrences_per_week !== undefined ? input.exact.occurrences_per_week * 52 / 12 : null);
  const exactMinutes = input.exact?.person_minutes_per_occurrence ?? null;
  const refinedLowHours = ((exactMonthlyFrequency ?? frequency[0]) * (exactMinutes ?? minutes[0])) / 60;
  const refinedHighHours = ((exactMonthlyFrequency ?? frequency[1]) * (exactMinutes ?? minutes[1])) / 60;
  const exactHours = exactMonthlyFrequency !== null && exactMinutes !== null ? refinedLowHours : null;
  const thresholdHours = (refinedLowHours + refinedHighHours) / 2;
  const criticalDeliveryRisk = answers[6] === 3;
  const deliveryImpact = [
    { level: 'none', description: 'No meaningful effect' },
    { level: 'low', description: 'A short clarification' },
    { level: 'moderate', description: 'A decision or release is delayed' },
    { level: 'critical', description: 'Missed release, hotfix, or customer escalation' },
  ][answers[6]];
  const alreadyHealthy = answers[7] === 0 && answers[2] <= 1;

  let band = 'Low friction';
  let summary = 'The numbers do not justify a custom automation sprint yet.';
  if (score >= 16) {
    band = 'High-priority candidate';
    summary = 'This workflow is frequent, manual, and consequential enough to warrant focused automation.';
  } else if (score >= 11) {
    band = 'Credible sprint candidate';
    summary = 'There is enough recurring friction to test one tightly scoped automation.';
  } else if (score >= 6) {
    band = 'Improve what exists';
    summary = 'Strengthen the current integrations and source discipline before adding a new workflow.';
  }
  if (alreadyHealthy) {
    band = 'Already in good shape';
    summary = 'Your accepted single view and low assembly time suggest this is not the best automation target.';
  } else if (score >= 11 && thresholdHours < 6) {
    band = 'High friction, low volume';
    summary = 'Fix the weak handoff, but the recurring effort does not yet justify a paid implementation sprint.';
  }

  const operationalCandidate = !alreadyHealthy && score >= 11 && thresholdHours >= 6;
  const fit = assessFit(input.fit, operationalCandidate);
  const implementationRoute = ['yes', 'conditional'].includes(fit.status)
    ? {
        offer: 'One release workflow working in 14 days after access and scope sign-off',
        price: { amount: 4800, currency: 'EUR' },
        scope: 'One workflow, up to three source integrations, one output destination, acceptance test, failure alert, manual fallback, runbook, and handover.',
        contact: 'https://www.linkedin.com/in/jyotirawat-tech/',
        disclosure: 'This optional paid implementation is offered by Jyoti Rawat, the publisher of this free audit.',
      }
    : null;

  const result = {
    audit_version: AUDIT_VERSION,
    workflow: 'release_readiness_coordination',
    result: {
      friction_score: score,
      maximum_score: 21,
      percent: Math.round((score / 21) * 100),
      band,
      summary,
    },
    coordination_estimate: {
      display: formatHours(refinedLowHours, refinedHighHours, exactHours),
      refined_range_hours: { low: round(refinedLowHours, 2), high: round(refinedHighHours, 2), midpoint: round(thresholdHours, 2) },
      answer_derived_range_hours: { low: round(answerLowHours, 2), high: round(answerHighHours, 2), midpoint: round((answerLowHours + answerHighHours) / 2, 2) },
      exact_monthly_person_hours: exactHours === null ? null : round(exactHours, 2),
      exact_monthly_frequency: exactMonthlyFrequency === null ? null : round(exactMonthlyFrequency, 2),
      exact_person_minutes_per_occurrence: exactMinutes === null ? null : round(exactMinutes, 2),
      threshold_basis: exactMonthlyFrequency !== null && exactMinutes !== null
        ? input.exact?.occurrences_per_week !== undefined
          ? 'user-supplied weekly frequency converted with 52 ÷ 12 and user-supplied combined person-minutes'
          : 'user-supplied exact monthly frequency and combined person-minutes'
        : exactMonthlyFrequency !== null
          ? input.exact?.occurrences_per_week !== undefined
            ? 'user-supplied weekly frequency converted with 52 ÷ 12 and answer-derived combined person-minutes'
            : 'user-supplied monthly frequency with answer-derived combined person-minutes'
          : exactMinutes !== null
            ? 'answer-derived frequency with user-supplied combined person-minutes'
            : 'answer-derived range midpoint',
      calculation: exactMonthlyFrequency !== null && exactMinutes !== null
        ? input.exact?.occurrences_per_week !== undefined
          ? `${round(input.exact.occurrences_per_week, 2)} runs/week × 52 ÷ 12 × ${round(exactMinutes, 2)} person-minutes ÷ 60`
          : `${round(exactMonthlyFrequency, 2)} runs/month × ${round(exactMinutes, 2)} person-minutes ÷ 60`
        : null,
    },
    source_pattern: questions[0].options[answers[0]],
    flags: {
      delivery_impact: deliveryImpact,
      critical_delivery_risk: criticalDeliveryRisk,
      already_healthy: alreadyHealthy,
      operational_candidate: operationalCandidate,
    },
    recommended_first_automation: {
      title: 'Build a source-linked release-readiness digest',
      description: 'Collect Git, CI, and ticket status into one scheduled view with explicit blockers, timestamps, owners, source links, and a human approval step.',
    },
    practical_next_steps: practicalActions(answers, criticalDeliveryRisk),
    standard_sprint_fit: fit,
    implementation_route: implementationRoute,
    methodology_note: 'Screening estimate based on supplied aggregate answers. It is not an ROI promise, compliance opinion, or release approval. Missing evidence remains unknown.',
    publisher_disclosure: 'Free open-source audit maintained by Jyoti Rawat. A paid implementation route appears only for workflows that pass the operational screen and do not conflict with the standard scope.',
  };

  if (input.exact?.loaded_hourly_cost !== undefined && exactHours !== null) {
    result.coordination_estimate.supplied_cost_estimate = {
      amount_per_month: round(exactHours * input.exact.loaded_hourly_cost, 2),
      currency: input.exact.currency ?? 'EUR',
      label: 'Estimated recurring coordination cost using the user-supplied loaded hourly cost; not a savings or ROI claim.',
    };
  }
  return result;
}

function markdown(result) {
  const lines = [
    '# Release Readiness Audit',
    '',
    `**Result:** ${result.result.friction_score}/${result.result.maximum_score} — ${result.result.band}`,
    '',
    result.result.summary,
    '',
    `- Estimated coordination effort: ${result.coordination_estimate.display}`,
    `- Estimate basis: ${result.coordination_estimate.threshold_basis}`,
    ...(result.coordination_estimate.calculation ? [`- Calculation: ${result.coordination_estimate.calculation}`] : []),
    ...((result.coordination_estimate.exact_monthly_frequency !== null || result.coordination_estimate.exact_person_minutes_per_occurrence !== null)
      ? [`- Original answer-derived screening range: ${formatHours(result.coordination_estimate.answer_derived_range_hours.low, result.coordination_estimate.answer_derived_range_hours.high, null)}`]
      : []),
    `- Release decision path: ${result.source_pattern}`,
    `- Delivery impact: ${result.flags.delivery_impact.level[0].toUpperCase()}${result.flags.delivery_impact.level.slice(1)} — ${result.flags.delivery_impact.description}`,
    '',
    `## First move: ${result.recommended_first_automation.title}`,
    '',
    result.recommended_first_automation.description,
    '',
    '## Three practical next steps',
    '',
    ...result.practical_next_steps.map((action, index) => `${index + 1}. ${action}`),
    '',
    '## Scope screen',
    '',
    `Standard 14-day sprint fit: **${result.standard_sprint_fit.status}**.`,
    ...result.standard_sprint_fit.reasons.map((reason) => `- ${reason}`),
  ];
  if (result.standard_sprint_fit.missing.length > 0) {
    lines.push(`- Missing fit facts: ${result.standard_sprint_fit.missing.join(', ')}`);
  }
  lines.push('', `> ${result.methodology_note}`);
  if (result.implementation_route) {
    lines.push(
      '',
      '## Optional implementation route',
      '',
      `**${result.implementation_route.offer} — €${result.implementation_route.price.amount.toLocaleString('en-GB')} fixed scope.**`,
      '',
      result.implementation_route.scope,
      '',
      `[Request a technical fit check](${result.implementation_route.contact})`,
      '',
      `_${result.implementation_route.disclosure}_`,
    );
  }
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const parsed = { input: null, format: 'json' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--input') parsed.input = argv[++index];
    else if (argv[index] === '--format') parsed.format = argv[++index];
    else if (argv[index] === '--help' || argv[index] === '-h') parsed.help = true;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!['json', 'markdown'].includes(parsed.format)) throw new Error('--format must be json or markdown.');
  return parsed;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('Usage: node scripts/calculate.mjs [--input path] [--format json|markdown]\n');
    return;
  }
  const raw = args.input ? await readFile(args.input, 'utf8') : await readStdin();
  if (!raw.trim()) throw new Error('Provide JSON through --input or standard input.');
  const result = calculateAudit(JSON.parse(raw));
  process.stdout.write(args.format === 'markdown' ? markdown(result) : `${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`Audit failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
