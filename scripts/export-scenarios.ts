import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { InvestigationReport } from '../src/contracts.ts';
import { validateReport } from '../src/investigation/report.ts';
import { historyRecordFromReport } from '../src/tools/zetaris-history.ts';

interface Capture {
  scenario_number: number;
  source_test: string;
  report: InvestigationReport;
  previous_report: InvestigationReport | null;
}
const sourceTests = [
  'tests/investigation.test.ts',
  'tests/broader-scenarios.test.ts',
  'tests/warm.test.ts',
];

function decisiveReason(report: InvestigationReport): string {
  const candidate = report.candidates[0];
  const metric = report.evidence.find((e) => e.tool === 'get_ec2_metrics');
  if (
    !candidate.proposed_window &&
    metric?.data &&
    'peak_cpu_percent' in metric.data
  )
    return `CPU average ${metric.data.average_cpu_percent}%, peak ${metric.data.peak_cpu_percent}%; no supported shutdown window. No operational cause was confirmed.`;
  return [candidate.explanation, ...candidate.missing_checks].join(' ');
}

function packageCaptures(captures: Capture[]) {
  assert.equal(
    captures.length,
    7,
    'All seven target tests must produce captures',
  );
  return Array.from({ length: 6 }, (_, i) => {
    const number = i + 1;
    const group = captures.filter((c) => c.scenario_number === number);
    assert.equal(group.length, number === 3 ? 2 : 1);
    const first = group[0].report;
    return {
      scenario_id: `ec2-${number}`,
      name:
        number === 3
          ? 'Unavailable operations or dependency evidence'
          : group[0].source_test.replace(/^EC2 \d: /, ''),
      synthetic: true,
      evidence_mode: 'mock',
      expected_verdict: first.candidates[0].verdict,
      decisive_reason: group.map((c) => decisiveReason(c.report)).join(' | '),
      uses_zetaris_history: number >= 5,
      history_transport: number >= 5 ? 'in_memory_http_fixture' : 'not_used',
      reproduction_command: `node --import tsx --test --test-isolation=none "--test-name-pattern=^EC2 ${number}:" ${sourceTests.join(' ')}`,
      variants: group.map((c) => ({
        source_test: c.source_test,
        current_investigation: c.report,
        previous_investigation: c.previous_report,
        historical_zetaris_records: c.previous_report
          ? [historyRecordFromReport(c.previous_report)]
          : [],
      })),
    };
  });
}
export type ScenarioExport = ReturnType<typeof packageCaptures>[number];

/** Validate each complete retained report, not just JSON syntax or verdict labels. */
export function validateScenarioJsonl(text: string): ScenarioExport[] {
  const lines = text.trimEnd().split('\n');
  assert.equal(
    lines.length,
    6,
    'Exactly one JSON object per scenario is required',
  );
  const rows = lines.map((line) => JSON.parse(line) as ScenarioExport);
  rows.forEach((row, i) => {
    assert.equal(row.scenario_id, `ec2-${i + 1}`);
    assert.equal(row.synthetic, true);
    assert.equal(row.evidence_mode, 'mock');
    assert.equal(row.uses_zetaris_history, i >= 4);
    assert.equal(
      row.history_transport,
      i >= 4 ? 'in_memory_http_fixture' : 'not_used',
    );
    assert.ok(row.decisive_reason.length > 0);
    assert.equal(row.variants.length, i === 2 ? 2 : 1);
    for (const variant of row.variants) {
      const report = validateReport(variant.current_investigation);
      assert.equal(report.integration_mode, 'mock');
      assert.equal(report.planner.mode, 'scripted');
      assert.equal(report.candidates.length, 1);
      assert.equal(report.candidates[0].verdict, row.expected_verdict);
      assert.match(variant.source_test, new RegExp(`^EC2 ${i + 1}:`));
      assert.ok(!report.trace.some((entry) => entry.failure_code));
      assert.ok(row.decisive_reason.includes(decisiveReason(report)));
      for (const r of [
        report,
        ...(variant.previous_investigation
          ? [validateReport(variant.previous_investigation)]
          : []),
      ]) {
        const { from, to } = r.request.window;
        assert.equal(Date.parse(to) - Date.parse(from), 14 * 86400000);
        assert.equal(Date.parse(from) % 86400000, 0);
        assert.equal(Date.parse(to) % 86400000, 0);
      }
      if (row.uses_zetaris_history) {
        assert.ok(variant.previous_investigation);
        const previous = validateReport(variant.previous_investigation);
        const record = historyRecordFromReport(previous);
        assert.deepEqual(variant.historical_zetaris_records, [record]);
        assert.equal(report.historical_context.zetaris, 'ok');
        assert.equal(report.historical_context.comparisons?.length, 1);
        const comparison = report.historical_context.comparisons[0];
        assert.equal(comparison.record_id, record.record_id);
        assert.equal(comparison.verdict, previous.candidates[0].verdict);
        assert.notEqual(comparison.verdict, row.expected_verdict);
        assert.ok(
          report.evidence.every(
            (e) =>
              !previous.evidence.some(
                (old) => old.evidence_id === e.evidence_id,
              ),
          ),
        );
      } else {
        assert.equal(variant.previous_investigation, null);
        assert.deepEqual(variant.historical_zetaris_records, []);
        assert.deepEqual(report.historical_context.comparisons ?? [], []);
      }
    }
  });
  return rows;
}

export async function exportScenarios(
  destination = 'docs/ec2-scenarios.jsonl',
) {
  const directory = await mkdtemp(join(tmpdir(), 'cci-scenario-export-'));
  const captureFile = join(directory, 'captures.jsonl');
  try {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--test',
        '--test-isolation=none',
        '--test-name-pattern=^EC2',
        ...sourceTests,
      ],
      {
        env: { ...process.env, CCI_SCENARIO_EXPORT_FILE: captureFile },
        encoding: 'utf8',
        windowsHide: true,
        timeout: 60_000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    assert.equal(
      result.status,
      0,
      'Scenario tests failed; export was not published',
    );
    const captures = (await readFile(captureFile, 'utf8'))
      .trimEnd()
      .split('\n')
      .map((line) => JSON.parse(line) as Capture);
    const jsonl = `${packageCaptures(captures)
      .map((row) => JSON.stringify(row))
      .join('\n')}\n`;
    validateScenarioJsonl(jsonl);
    await writeFile(destination, jsonl, 'utf8');
    if (destination === 'docs/ec2-scenarios.jsonl')
      await writeFile('ec2-scenarios.jsonl', jsonl, 'utf8');
    return { path: resolve(destination), scenarios: 6, variants: 7 };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    assert.equal(process.argv.length, 2, 'No arguments supported');
    console.log(JSON.stringify(await exportScenarios()));
  } catch {
    console.error(
      'Scenario export failed validation or test execution; no successful export claimed.',
    );
    process.exitCode = 1;
  }
}
