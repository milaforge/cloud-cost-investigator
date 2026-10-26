import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  exportScenarios,
  validateScenarioJsonl,
  type ScenarioExport,
} from '../scripts/export-scenarios.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { appendZetarisHistory } from '../src/tools/zetaris-history.ts';
import { mockZetarisLedger } from './helpers/zetaris-ledger.ts';

test('each exported reproduction command selects exactly its named scenario tests', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'cci-export-commands-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const rows = validateScenarioJsonl(
    await readFile('docs/ec2-scenarios.jsonl', 'utf8'),
  );
  const files = [
    'tests/investigation.test.ts',
    'tests/broader-scenarios.test.ts',
    'tests/warm.test.ts',
  ];
  for (const [index, row] of rows.entries()) {
    const pattern = `^EC2 ${index + 1}:`;
    assert.equal(
      row.reproduction_command,
      `node --import tsx --test --test-isolation=none "--test-name-pattern=${pattern}" ${files.join(' ')}`,
    );
    const captureFile = join(directory, `${row.scenario_id}.jsonl`);
    // Execute the verified command as arguments, never arbitrary shell text.
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--test',
        '--test-isolation=none',
        `--test-name-pattern=${pattern}`,
        ...files,
      ],
      {
        env: { ...process.env, CCI_SCENARIO_EXPORT_FILE: captureFile },
        windowsHide: true,
        encoding: 'utf8',
        timeout: 60_000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    assert.equal(result.status, 0, `${row.scenario_id} command failed`);
    const captures = (await readFile(captureFile, 'utf8'))
      .trimEnd()
      .split('\n')
      .map((line) => JSON.parse(line) as { source_test: string });
    // A successful exit with zero matching tests is not reproduction proof.
    assert.deepEqual(
      captures.map((capture) => capture.source_test).sort(),
      row.variants.map((variant) => variant.source_test).sort(),
    );
  }
});

test('JSONL captures all six tested cases, replays seven evidence variants and rejects damaged exports', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'cci-export-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const destination = join(directory, 'scenarios.jsonl');
  const receipt = await exportScenarios(destination);
  assert.equal(receipt.scenarios, 6);
  assert.equal(receipt.variants, 7);
  const text = await readFile(destination, 'utf8');
  const rows = validateScenarioJsonl(text);
  const retained = validateScenarioJsonl(
    await readFile('docs/ec2-scenarios.jsonl', 'utf8'),
  );
  const facts = (scenarios: ScenarioExport[]) =>
    scenarios.map((row) => ({
      ...row,
      variants: row.variants.map((v) => ({
        source_test: v.source_test,
        request: v.current_investigation.request,
        current_evidence: v.current_investigation.evidence.map(
          ({ evidence_id: _id, collected_at: _time, ...e }) => e,
        ),
        prior_verdict: v.previous_investigation?.candidates[0].verdict ?? null,
        prior_request: v.previous_investigation?.request ?? null,
        prior_evidence:
          v.previous_investigation?.evidence.map(
            ({ evidence_id: _id, collected_at: _time, ...e }) => e,
          ) ?? [],
      })),
    }));
  assert.deepEqual(
    facts(retained),
    facts(rows),
    'Regenerate retained JSONL after changing scenario facts',
  );
  assert.deepEqual(
    rows.map((row) => row.expected_verdict),
    [
      'conditional_recommendation',
      'not_recommended',
      'needs_verification',
      'needs_verification',
      'not_recommended',
      'conditional_recommendation',
    ],
  );
  const { records } = mockZetarisLedger(t);
  for (const row of rows) {
    for (const variant of row.variants) {
      records.length = 0;
      for (const record of variant.historical_zetaris_records)
        await appendZetarisHistory(record);
      const saved = variant.current_investigation;
      const replay = await runInvestigation(saved.request, {
        planner: new ScriptedPlanner(),
        history: { zetaris: row.uses_zetaris_history },
        provider: {
          mode: 'mock',
          async call(action) {
            const observation = saved.evidence.find(
              (o) => o.tool === action.tool,
            );
            assert.ok(
              observation,
              'Replay requested evidence absent from export',
            );
            // Recollect the same synthetic facts now; old timestamps are not fresh evidence.
            return {
              ...structuredClone(observation),
              collected_at: new Date().toISOString(),
            };
          },
        },
      });
      assert.equal(replay.candidates[0].verdict, row.expected_verdict);
      assert.equal(replay.completion_status, saved.completion_status);
      assert.deepEqual(
        replay.candidates[0].missing_checks,
        saved.candidates[0].missing_checks,
      );
      assert.equal(
        replay.historical_context.comparisons?.length ?? 0,
        row.uses_zetaris_history ? 1 : 0,
      );
    }
  }
  assert.throws(() =>
    validateScenarioJsonl(text.trimEnd().split('\n').slice(0, 5).join('\n')),
  );
  assert.throws(() => validateScenarioJsonl(text.replace(/\{/, '!')));
  for (const mutation of [
    'verdict',
    'citation',
    'history',
    'period',
  ] as const) {
    const broken = structuredClone(rows);
    if (mutation === 'verdict') broken[0].expected_verdict = 'not_recommended';
    if (mutation === 'citation')
      broken[1].variants[0].current_investigation.candidates[0].contradicting_evidence_ids =
        ['unretrieved'];
    if (mutation === 'history')
      broken[4].variants[0].historical_zetaris_records[0].record_id =
        'wrong-record';
    if (mutation === 'period')
      broken[0].variants[0].current_investigation.request.window.from =
        '2026-09-16T00:00:00Z';
    assert.throws(() =>
      validateScenarioJsonl(
        broken.map((row) => JSON.stringify(row)).join('\n'),
      ),
    );
  }
});
