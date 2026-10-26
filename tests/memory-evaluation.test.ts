import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateMemory } from '../scripts/evaluate-memory.ts';

test('memory evaluation preserves complete-collection ties, teaching cost and partial outcomes', async () => {
  const result = await evaluateMemory();
  assert.equal(result.passed, true);
  assert.equal(result.rows.length, 8);
  assert.ok(result.comparison.training_tool_calls > 0);
  for (const total of result.totals) {
    assert.equal(total.correct, 8);
    assert.equal(total.partial, 4);
  }
  const recurring = result.rows.find((r) => r.name === 'recurring_dependency');
  const changed = result.rows.find(
    (r) => r.name === 'dependency_replaced_by_job',
  );
  assert.ok(recurring);
  assert.ok(changed);
  const calls = (r: typeof recurring, strategy: string) => {
    const result = r.results.find((v) => v.strategy === strategy);
    assert.ok(result);
    return result.tool_calls;
  };
  assert.equal(calls(recurring, 'hmem'), calls(recurring, 'jobs_first'));
  assert.equal(calls(changed, 'hmem'), calls(changed, 'jobs_first'));
  assert.equal(result.comparison.warm_tool_calls_saved_vs_best_fixed, 0);
  for (const row of result.rows)
    for (const r of row.results) {
      if (r.strategy !== 'hmem')
        assert.deepEqual(r.report.historical_context.context_ids, []);
    }
});
