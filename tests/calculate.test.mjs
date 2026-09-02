import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { calculateAudit, validateInput } from '../scripts/calculate.mjs';

test('qualified recurring workflow gets a result before a matching offer', () => {
  const result = calculateAudit({
    answers: [2, 3, 3, 2, 2, 2, 2, 3],
    exact: { occurrences_per_month: 8, person_minutes_per_occurrence: 75 },
    fit: {
      workflow_count: 1,
      source_integrations: ['github', 'linear'],
      output_destinations: ['slack'],
      named_owner: true,
      standard_apis: true,
      security_ready_before_start: true,
      requires_production_access: false,
      requires_platform_migration: false,
      can_narrow_to_three_sources: false
    }
  });

  assert.equal(result.result.friction_score, 17);
  assert.equal(result.coordination_estimate.exact_monthly_person_hours, 10);
  assert.equal(result.flags.operational_candidate, true);
  assert.equal(result.standard_sprint_fit.status, 'yes');
  assert.equal(result.implementation_route.price.amount, 4800);
});

test('severe pain outside fixed scope gets useful advice but no sales route', () => {
  const result = calculateAudit({
    answers: [3, 3, 3, 3, 3, 3, 3, 3],
    fit: {
      workflow_count: 5,
      source_integrations: ['github', 'circleci', 'linear', 'slack', 'notion', 'sheets', 'pagerduty', 'custom-api'],
      output_destinations: ['slack', 'linear', 'email'],
      named_owner: false,
      standard_apis: false,
      security_ready_before_start: false,
      requires_production_access: true,
      requires_platform_migration: true,
      can_narrow_to_three_sources: false
    }
  });

  assert.equal(result.result.friction_score, 21);
  assert.equal(result.standard_sprint_fit.status, 'no');
  assert.equal(result.implementation_route, null);
  assert.equal(result.practical_next_steps.length, 3);
});

test('already healthy workflow is not sold an implementation', () => {
  const result = calculateAudit({ answers: [0, 0, 0, 0, 0, 0, 0, 0] });

  assert.equal(result.result.band, 'Already in good shape');
  assert.equal(result.flags.operational_candidate, false);
  assert.equal(result.standard_sprint_fit.status, 'not_applicable');
  assert.equal(result.implementation_route, null);
});

test('invalid answer data fails closed', () => {
  assert.throws(() => validateInput({ answers: [0, 1] }), /exactly eight/);
  assert.throws(() => validateInput({ answers: [0, 0, 0, 0, 0, 0, 0, 4] }), /0 to 3/);
  assert.throws(
    () => validateInput({ answers: [0, 0, 0, 0, 0, 0, 0, 0], exact: { occurrences_per_month: 4, occurrences_per_week: 1 } }),
    /not both/,
  );
});

test('partial exact time refines the selected frequency range without inventing cadence', () => {
  const result = calculateAudit({
    answers: [2, 3, 3, 2, 2, 2, 2, 2],
    exact: { person_minutes_per_occurrence: 70 },
  });

  assert.deepEqual(result.coordination_estimate.refined_range_hours, { low: 9.33, high: 14, midpoint: 11.67 });
  assert.equal(result.coordination_estimate.exact_monthly_person_hours, null);
  assert.match(result.coordination_estimate.threshold_basis, /user-supplied combined person-minutes/);
});

test('weekly exact frequency uses 52 divided by 12 and prioritizes the trust problem', () => {
  const result = calculateAudit({
    answers: [2, 3, 3, 2, 2, 2, 2, 2],
    exact: { occurrences_per_week: 2, person_minutes_per_occurrence: 70 },
  });

  assert.equal(result.coordination_estimate.exact_monthly_frequency, 8.67);
  assert.equal(result.coordination_estimate.exact_monthly_person_hours, 10.11);
  assert.match(result.practical_next_steps[0], /Timestamp every field/);
  assert.deepEqual(result.flags.delivery_impact, { level: 'moderate', description: 'A decision or release is delayed' });
});

test('command-line entry point works from a path containing spaces', () => {
  const script = fileURLToPath(new URL('../scripts/calculate.mjs', import.meta.url));
  const example = fileURLToPath(new URL('../examples/qualified.json', import.meta.url));
  const run = spawnSync(process.execPath, [script, '--input', example, '--format', 'markdown'], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Result:\*\* 17\/21/);
  assert.match(run.stdout, /€4,800 fixed scope/);
});
