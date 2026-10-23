import assert from 'node:assert/strict';
import {
  mkdtemp,
  readdir,
  readFile,
  writeFile,
  rm,
  mkdir,
} from 'node:fs/promises';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import {
  HmemReasoningMemory,
  reasoningSummaryFromReport,
  type ReasoningSummary,
} from '../src/investigation/memory.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';

const scope = { account_id: 'demo', region: 'us-east-1' };
const summary: ReasoningSummary = {
  schema_version: 1,
  investigation_id: 'test-investigation',
  recorded_at: '2026-10-23T00:00:00Z',
  scope,
  instance_id: 'i-mock-primary',
  hypothesis: {
    window: { start_hour_utc: 0, end_hour_utc: 6 },
    state: 'contradicted',
  },
  verdict: 'not_recommended',
  reason: 'Critical batch overlaps the proposed UTC window.',
  unresolved_risks: ['Other operational windows need fresh verification.'],
  provenance: {
    integration_mode: 'mock',
    evidence_ids: ['mock-operation-evidence'],
  },
};
async function temporary(t: TestContext): Promise<string> {
  const dir = await mkdtemp('/tmp/cloud-cost-investigator-hmem-test-');
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('real H-MEM reference persists a scoped mock B summary and retrieves it after reload', async (t) => {
  const dir = await temporary(t);
  const now = Date.now();
  const report = await runInvestigation(
    {
      ...scope,
      max_candidates: 1,
      window: {
        from: new Date(now - 28 * 86400000).toISOString(),
        to: new Date(now - 1000).toISOString(),
      },
    },
    { provider: new MockProvider('B'), planner: new ScriptedPlanner() },
  );
  const first = await HmemReasoningMemory.open(dir, scope);
  assert.equal(first.source, 'vendor/hmem');
  const stored = first.store(reasoningSummaryFromReport(report));
  assert.equal(stored.summary.hypothesis?.state, 'contradicted');
  const reloaded = await HmemReasoningMemory.open(dir, scope);
  const retrieved = reloaded.retrieve(report.candidates[0].instance_id);
  assert.deepEqual(retrieved, [stored]);
  assert.equal(retrieved[0].historical, true);
  assert.equal(retrieved[0].summary.provenance.integration_mode, 'mock');
  assert.ok(retrieved[0].context_id.startsWith('hmem:'));
  const [namespace] = await readdir(dir);
  const state = JSON.parse(
    await readFile(join(dir, namespace, 'state.json'), 'utf8'),
  );
  const content = JSON.parse(state.records[0].content);
  assert.equal(content.evidence, undefined);
  assert.equal(content.trace, undefined);
  const ledger = await readFile(join(dir, namespace, 'ledger.jsonl'), 'utf8');
  assert.ok(ledger.includes('"action":"create"'));
  assert.ok(ledger.includes('"action":"read"'));
});

test('account, region and instance boundaries prevent historical context leakage', async (t) => {
  const dir = await temporary(t);
  const memory = await HmemReasoningMemory.open(dir, scope);
  memory.store(summary);
  assert.deepEqual(memory.retrieve('i-different'), []);
  const account = await HmemReasoningMemory.open(dir, {
    ...scope,
    account_id: 'other-account',
  });
  const region = await HmemReasoningMemory.open(dir, {
    ...scope,
    region: 'eu-west-1',
  });
  assert.deepEqual(account.retrieve(summary.instance_id), []);
  assert.deepEqual(region.retrieve(summary.instance_id), []);
  assert.throws(() => account.store(summary), {
    message: 'hmem_store_unavailable_or_invalid',
  });
});

test('malformed or oversized summaries cannot be persisted', async (t) => {
  const dir = await temporary(t);
  for (const input of [
    { ...summary, raw_payload: 'private provider diagnostic' },
    { ...summary, recorded_at: 'yesterday' },
    {
      ...summary,
      unresolved_risks: ['private provider diagnostic'.repeat(30)],
    },
    {
      ...summary,
      provenance: { integration_mode: 'pretend-live', evidence_ids: [] },
    },
  ]) {
    const memory = await HmemReasoningMemory.open(dir, scope);
    assert.throws(() => memory.store(input), {
      message: 'hmem_store_unavailable_or_invalid',
    });
  }
  const reloaded = await HmemReasoningMemory.open(dir, scope);
  assert.deepEqual(reloaded.retrieve(summary.instance_id), []);
});

test('malformed persisted content is rejected with a sanitized error on reload', async (t) => {
  const dir = await temporary(t);
  const memory = await HmemReasoningMemory.open(dir, scope);
  memory.store(summary);
  const [namespace] = await readdir(dir);
  const file = join(dir, namespace, 'state.json');
  const state = JSON.parse(await readFile(file, 'utf8'));
  state.records[0].content = 'private provider diagnostic';
  await writeFile(file, JSON.stringify(state));
  await assert.rejects(HmemReasoningMemory.open(dir, scope), {
    message: 'hmem_open_unavailable_or_invalid',
  });
});

test('persistence failures on open, store and retrieval disclose no paths or provider content', async (t) => {
  const dir = await temporary(t);
  const blocked = join(dir, 'private-provider-diagnostic');
  await writeFile(blocked, 'not a directory');
  await assert.rejects(HmemReasoningMemory.open(blocked, scope), {
    message: 'hmem_open_unavailable_or_invalid',
  });
  const memory = await HmemReasoningMemory.open(dir, scope);
  memory.store(summary);
  const writer = await HmemReasoningMemory.open(dir, scope);
  const namespace = (await readdir(dir)).find((name) =>
    name.startsWith('scope-'),
  );
  assert.ok(namespace);
  const ledger = join(dir, namespace, 'ledger.jsonl');
  await rm(ledger);
  await mkdir(ledger);
  assert.throws(() => memory.retrieve(summary.instance_id), {
    message: 'hmem_retrieve_unavailable_or_invalid',
  });
  assert.throws(() => writer.store(summary), {
    message: 'hmem_store_unavailable_or_invalid',
  });
  await rm(ledger, { recursive: true });
  // A failed reference append may already exist in memory; reopening is mandatory before recall.
  assert.throws(() => writer.retrieve(summary.instance_id), {
    message: 'hmem_retrieve_unavailable_or_invalid',
  });
});

test('missing H-MEM engine rejects for caller containment instead of terminating the host', async (t) => {
  const fs = (await import('node:fs')).default;
  const { loadHMEM } = await import('../src/engine.ts');
  t.mock.method(fs, 'existsSync', () => false);
  await assert.rejects(loadHMEM(), /H-MEM engine not found/);
});
