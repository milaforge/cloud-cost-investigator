import assert from 'node:assert/strict';
import test from 'node:test';
import { parseArgs } from '../cli.ts';
import type { Observation } from '../src/contracts.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { renderTraceJsonl, traceEvents } from '../src/investigation/trace.ts';

const request = {
  account_id: 'test-account',
  region: 'eu-west-3',
  max_candidates: 1,
  window: { from: '2026-09-28T00:00:00Z', to: '2026-10-26T00:00:00Z' },
};

test('JSONL measures prefix evidence coverage and summarizes retrieved facts', async () => {
  const report = await runInvestigation(request, {
    planner: new ScriptedPlanner(),
    provider: new MockProvider('A'),
  });
  const events = traceEvents(report);
  assert.deepEqual(
    renderTraceJsonl(report)
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line)),
    events,
  );
  assert.deepEqual(
    events.filter((e) => e.agent_name === 'Executor').map((e) => e.confidence),
    [0.2, 0.4, 0.6, 0.8, 1],
  );
  assert.equal(events[0].confidence, 0); // Never count evidence fetched later.
  assert.equal(
    events[0].output_summary,
    'Selected list_ec2_instances for execution.',
  );
  assert.notEqual(events[0].reasoning, events[0].output_summary);
  for (const e of events) {
    assert.ok(e.timestamp);
    assert.ok(Date.parse(e.timestamp) >= Date.parse(report.started_at));
    for (const field of [
      'agent_name',
      'action',
      'input_summary',
      'reasoning',
      'output_summary',
      'status',
    ] as const)
      assert.ok(e[field].length);
    assert.equal(e.trace_id, report.investigation_id);
  }
  assert.ok(
    events.some((e) => e.output_summary.includes('CPU average 2%, peak 8%')),
  );
  assert.ok(
    events.some((e) =>
      e.output_summary.includes('No overlapping jobs returned'),
    ),
  );
  assert.ok(events.some((e) => e.status === 'no_match'));
  assert.equal(events.at(-1)?.status, 'complete');
  const changed = structuredClone(report);
  changed.trace[0].timestamp = '2099-01-01T00:00:00Z';
  assert.throws(() => validateReport(changed), /timestamp/);
  changed.trace[0].timestamp = '2020-01-01T00:00:00Z';
  assert.throws(() => validateReport(changed), /timestamp/);
  for (const e of changed.trace) delete e.timestamp;
  assert.ok(
    traceEvents(changed).every(
      (e) => e.timestamp === null && e.confidence === null,
    ),
  );
});

test('partial evidence does not increment completeness or imply safety', async () => {
  const base = new MockProvider('A');
  const report = await runInvestigation(request, {
    planner: new ScriptedPlanner(),
    provider: {
      mode: 'mock',
      async call(action, signal) {
        const o = (await base.call(action, signal)) as Observation;
        if (action.tool === 'get_ec2_dependencies') {
          o.status = 'partial';
          o.coverage.complete = false;
          o.missing_fields = ['dependency_owner'];
        }
        return o;
      },
    },
  });
  const events = traceEvents(report);
  assert.equal(events.find((e) => e.status === 'partial')?.confidence, 0.8);
  assert.equal(events.at(-1)?.confidence, 0.8);
  assert.equal(report.candidates[0].verdict, 'needs_verification');
});

test('coverage does not transfer candidate checks between instances', async () => {
  const report = await runInvestigation(
    { ...request, max_candidates: 3 },
    { planner: new ScriptedPlanner(), provider: new MockProvider('mixed') },
  );
  const events = traceEvents(report).filter(
    (e) => e.agent_name === 'Planner' && e.action === 'get_ec2_metrics',
  );
  assert.equal(events.length, 3);
  assert.ok(events.every((e) => e.confidence === 0.4));
});

test('CLI JSONL is explicit and mutually exclusive with report JSON', () => {
  const args = [
    'investigate',
    '--account',
    'demo',
    '--region',
    'eu-west-3',
    '--evidence',
    'mock',
  ];
  const options = parseArgs([...args, '--trace-jsonl']);
  assert.ok(options !== 'help' && options.trace_jsonl);
  assert.throws(() => parseArgs([...args, '--trace-jsonl', '--json']));
  assert.throws(() => parseArgs([...args, '--trace-jsonl', '--trace-jsonl']));
});
