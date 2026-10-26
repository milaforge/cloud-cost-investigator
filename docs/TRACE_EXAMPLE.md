# Trace example — retry, recover, reject a shutdown window

[What](../README.md) · [How](HOW.md) · [Trace reference](CLI_GUIDE.md#capture-and-read-the-decision-trace)

**Decision:** reject the proposed **00:00–06:00 UTC** shutdown for `i-mock-primary`. After three failed operations calls, the fourth retrieves a critical **02:00–03:00 UTC** batch that contradicts the hypothesis. No infrastructure changes occur; other windows remain unevaluated.

**Captured execution:** this [complete report](evaluation/trace-metadata-2026-10-25/B-retry.json) uses synthetic EC2 evidence, a scripted planner and three deliberately injected tool exceptions. It exercises the actual runner, retry/backoff and evaluator. It makes no model, AWS, Zetaris or H-MEM calls. Timings include real backoff waits.

```text
trace_id / investigation_id: e3080d21-0229-471b-839a-d4b29fa43a72
planner: scripted (no model call)
scope: trace-synthetic / us-east-1 / i-mock-primary
run: 2026-10-25T17:22:36.411Z → 2026-10-25T17:22:51.806Z
budget: 5 planner calls, 7 evidence-tool attempts, 15395 ms
```

## The turning point

Steps 1–7 discover inventory, rank compute spend and retrieve utilization: average CPU **2%**, peak **8%**. This justifies investigating a window, not authorizing shutdown. Below are actual steps 8–16 as JSONL; only validated `action` objects are omitted for readability.

```jsonl
{"trace_id":"e3080d21-0229-471b-839a-d4b29fa43a72","confidence":"supported","retry_count":0,"step":8,"phase":"planner","reason":"Observed low average and peak CPU suggest this window; challenge it before any decision.","evidence_ids":["mock-ec2-evidence-6a68e696-8f18-47b7-9e13-30cfa51ea4fa"]}
{"trace_id":"e3080d21-0229-471b-839a-d4b29fa43a72","confidence":"supported","retry_count":0,"step":9,"phase":"evaluator","reason":"Plausible window proposed. Require a fresh targeted operations challenge; low CPU is not scheduling authority.","evidence_ids":["mock-ec2-evidence-6a68e696-8f18-47b7-9e13-30cfa51ea4fa"]}
{"trace_id":"e3080d21-0229-471b-839a-d4b29fa43a72","confidence":"unassessed","retry_count":0,"step":10,"phase":"planner","reason":"Try to falsify the proposed window with overlapping critical jobs.","evidence_ids":[]}
{"trace_id":"e3080d21-0229-471b-839a-d4b29fa43a72","confidence":"insufficient","retry_count":0,"step":11,"phase":"tool","reason":"Tool failed or timed out; retrying the same read-only action after backoff. No payload retained.","evidence_ids":[],"status":"error"}
{"trace_id":"e3080d21-0229-471b-839a-d4b29fa43a72","confidence":"insufficient","retry_count":1,"step":12,"phase":"tool","reason":"Tool failed or timed out; retrying the same read-only action after backoff. No payload retained.","evidence_ids":[],"status":"error"}
{"trace_id":"e3080d21-0229-471b-839a-d4b29fa43a72","confidence":"insufficient","retry_count":2,"step":13,"phase":"tool","reason":"Tool failed or timed out; retrying the same read-only action after backoff. No payload retained.","evidence_ids":[],"status":"error"}
{"trace_id":"e3080d21-0229-471b-839a-d4b29fa43a72","confidence":"supported","retry_count":3,"step":14,"phase":"tool","reason":"get_ec2_operations: ok; coverage complete, authoritative.","evidence_ids":["mock-ec2-evidence-5a66dee4-7a1c-4c7d-b91d-f7f18374f414"],"status":"ok"}
{"trace_id":"e3080d21-0229-471b-839a-d4b29fa43a72","confidence":"supported","retry_count":0,"step":15,"phase":"evaluator","reason":"A retrieved critical job overlaps the proposed shutdown window; reject this window.","evidence_ids":["mock-ec2-evidence-5a66dee4-7a1c-4c7d-b91d-f7f18374f414"]}
{"trace_id":"e3080d21-0229-471b-839a-d4b29fa43a72","confidence":"unassessed","retry_count":0,"step":16,"phase":"finish","reason":"hypothesis_contradicted","evidence_ids":[]}
```

All steps share one `trace_id`; `(trace_id, step)` identifies an entry. `retry_count` counts retries already made for that action: **0** for the initial call, then **1**, **2**, **3**. The executor repeats the same validated operations action without another planner decision. After four failed attempts it would give up; here attempt four succeeds. Backoff is 2s/4s/8s with positive jitter, bounded by call caps and the run deadline.

`confidence` is evidence support for this step: `supported` for complete authoritative cited observations without gaps, `insufficient` for failures or cited gaps, `unassessed` for steps without current citations. It is not a fabricated numerical probability or permission to stop EC2. Thus a supported low-CPU observation can lead to a hypothesis that fresh evidence later disproves.

**Final result:** `not_recommended`; hypothesis `proposed → contradicted`; stop reason `hypothesis_contradicted`; monthly savings `null`. The final operations observation supplies the contradiction citation. Failed attempts remain visible with no accepted payload. Dependencies and alternative windows remain untested; review the cited conflict with the resource owner.

The [earlier real NVIDIA run](evaluation/model-network-2026-10-25/gate-rerun/round-1-B.json) demonstrates real model selection with synthetic telemetry. Its original trace predates these fields and remains unchanged. Loading legacy reports labels retry counts unknown; it does not invent historical confidence or retry measurements.

## Reproduce

After [setup](HOW.md#run-the-demo), capture an ordinary offline B investigation:

```bash
mkdir -p logs
set -o pipefail
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario B --json | tee logs/trace-B.json
```

To reproduce the injected-outage path above, run from the repository root:

```bash
node --import tsx --input-type=module <<'JS'
import { MockProvider } from './src/investigation/mock.ts';
import { ScriptedPlanner } from './src/investigation/planner.ts';
import { runInvestigation } from './src/investigation/run.ts';
const base = new MockProvider('B');
let failures = 0;
const report = await runInvestigation({
  account_id: 'trace-synthetic', region: 'us-east-1', max_candidates: 1,
  window: { from: '2026-09-01T00:00:00Z', to: '2026-09-29T00:00:00Z' },
}, {
  planner: new ScriptedPlanner(),
  provider: { mode: 'mock', async call(action, signal) {
    if (action.tool === 'get_ec2_operations' && failures++ < 3)
      throw new Error('synthetic outage');
    return base.call(action, signal);
  } },
});
console.log(JSON.stringify(report, null, 2));
JS
```

This creates fresh IDs and timestamps, with no configured history or external services. `logs/` is ignored by Git. Regression proof, including persistent failure and deadline exhaustion: `node --import tsx --test --test-isolation=none tests/trace-retry.test.ts`.
