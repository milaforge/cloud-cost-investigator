# Trace example — an attractive shutdown rejected

[What](../README.md) · [How](HOW.md) · [Trace reference](CLI_GUIDE.md#capture-and-read-the-decision-trace)

**Decision:** keep `i-mock-primary` running during the proposed **00:00–06:00 UTC** window. A newly retrieved critical daily batch runs **02:00–03:00 UTC**, contradicting the low-CPU shutdown hypothesis.

**Captured execution, not an invented storyboard.** This [complete report](evaluation/model-network-2026-10-25/gate-rerun/round-1-B.json) used a real NVIDIA model call sequence with **synthetic EC2 evidence**. Zetaris and H-MEM were not configured for this run.

```text
investigation_id: a0e37e60-771e-4a3c-8f3d-18b8f5137ec9
planner: live / nvidia/nemotron-3.5-super-vl-120b-a12b
scope: reliability-synthetic / us-east-1 / i-mock-primary
run: 2026-10-25T06:52:51.043Z → 2026-10-25T06:52:56.820Z
budget: 5 planner calls, 4 evidence-tool calls, 5777 ms
```

## The turning point

Steps 1–7 discover inventory, rank by compute spend and retrieve utilization. Average CPU is **2%**, peak **8%**: enough to propose a question, insufficient to authorize shutdown.

Below is a JSONL projection of actual steps 8–13; `action` objects are omitted for readability. Every line belongs to the investigation above. The full report retains validated tool arguments and source provenance.

```jsonl
{"step":8,"phase":"planner","reason":"Low average (2%) and peak (8%) CPU suggest inactive hours; metrics suggest window 0-6 UTC, so form hypothesis before falsification checks.","evidence_ids":["mock-ec2-evidence-85dba6d5-5bfb-442e-8532-dc59d9276d40"]}
{"step":9,"phase":"evaluator","reason":"Plausible window proposed. Require a fresh targeted operations challenge; low CPU is not scheduling authority.","evidence_ids":["mock-ec2-evidence-85dba6d5-5bfb-442e-8532-dc59d9276d40"]}
{"step":10,"phase":"planner","reason":"Check for critical jobs overlapping the proposed 00-06 UTC shutdown window before falsifying shutdown safety.","evidence_ids":[]}
{"step":11,"phase":"tool","reason":"Validated current-investigation observation registered.","evidence_ids":["mock-ec2-evidence-b3719509-527b-4419-b82a-c3e0ffd4a2f9"],"status":"ok"}
{"step":12,"phase":"evaluator","reason":"A retrieved critical job overlaps the proposed shutdown window; reject this window.","evidence_ids":["mock-ec2-evidence-b3719509-527b-4419-b82a-c3e0ffd4a2f9"]}
{"step":13,"phase":"finish","reason":"hypothesis_contradicted","evidence_ids":[]}
```

Step 10 selects `get_ec2_operations` with the proposed window; step 11 registers its evidence. The contradiction ID resolves to `mock-critical-daily-batch`, marked critical, at **02:00–03:00 UTC**, collected at **2026-10-25T06:52:56.818Z**. These are fixture facts retrieved during this investigation, not live AWS telemetry.

**Final result:** `not_recommended`; hypothesis `proposed → contradicted`; stop reason `hypothesis_contradicted`; estimated monthly savings `null`. Dependencies and alternative windows remain untested. The operator should review the cited conflict with the resource owner; no infrastructure is changed.

## What just happened

- The evaluator requires a targeted challenge, and the planner responds with a relevant query.
- Newly retrieved evidence changes the decision and blocks the proposed shutdown.
- The verdict is auditable through exact evidence IDs, scope, source mode and collection time.
- The run stops once this window is disproved, preserving unresolved checks and unsupported savings.

This run demonstrates a successful contradiction path. A [separate failed run](evaluation/model-network-2026-10-25/gate-rerun/round-3-B.json) records `model_http_500` and finishes `failed` without a recommendation. Neither example implies retries, automatic fallback or sustained provider reliability. Per-step timestamps, confidence scores and retry counters are not emitted by this trace contract.

## Capture a fresh offline example

After [setup](HOW.md#run-the-demo), save the report and its trace while also printing it to stdout:

```bash
mkdir -p logs
set -o pipefail
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario B --json | tee "logs/trace-B-$(date -u +%Y%m%dT%H%M%SZ).json"
```

This reproduction uses synthetic evidence and a scripted planner, with historical services disabled. It generates new run/evidence IDs; it does not reproduce the NVIDIA calls above. `logs/` is ignored by Git. For model configuration and trace fields, use the [CLI reference](CLI_GUIDE.md).
