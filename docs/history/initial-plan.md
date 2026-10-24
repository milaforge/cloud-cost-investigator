# Original first-slice plan — historical

[What](../../README.md) · [Why](../WHY.md) · [How](../HOW.md)

This is the original planning record, not current instructions or status. It includes superseded ownership, mock defaults and incomplete milestones. Use the [current contracts](../PROJECT_CONTEXT.md) and [execution plan](../EXECUTION_PLAN.md).

# First Working Investigation Loop — Approved Optimization-First Slice

> Implementation approach only. This document is **not a progress tracker** and does not claim executed work. `docs/EXECUTION_PLAN.md` owns verification, integration proofs, blockers and milestone status. Product requirements and safety policy are in `docs/PROJECT_CONTEXT.md`; rules in `docs/RULES.md`.

## Goal and ownership

Build **one bounded, evidence-dependent off-hours scheduling investigation** in the current TypeScript/Node.js CLI. From only an account/region, discover an EC2 candidate using mock direct TypeScript tools; form a plausible proposed shutdown window; retrieve a critical operational constraint; visibly **reject** that window; return a validated detailed report. Show the missing-evidence failure path. First-run success must not require Zetaris history or Meterless memory.
- **Zayan:** mock and eventual live current-evidence adapters; separate history store/query through Zetaris; source coverage, typed observations, read-only AWS.
- **Milad:** bounded planner/executor/evaluator, approved model verification, Meterless H-MEM, CLI, trace and report.
- **Both:** contract, fixture truth and evidence-integrity review.

## 1. One minimal scenario

Example (illustrative, not implemented):

```bash
cloud-cost-investigator investigate --account demo --region us-east-1 \
  --lookback-days 28 --max-candidates 1
```

In a small labeled **mock** account/region: instance A has material compute spend and low average off-hours CPU, but runs a critical batch job during an initially proposed stopping window. The agent discovers A rather than taking a preselected instance ID. Its first plausible optimization hypothesis must be rejected when the relevant fresh job record arrives.

The first slice intentionally keeps monthly savings **`null`**; billing eligibility, schedule calendars and marginal pricing cannot be guessed. Later scenario A may calculate savings after deterministic coverage checks. All timestamps use UTC with explicit observed/collected distinctions.

## 2. Strict tool boundaries

Proposed **logical** read-only current-evidence operations, initially backed by mocks:

```text
list_ec2_instances(scope)
get_ec2_billing(scope, window)
get_ec2_metrics(instance, window)
get_ec2_operations(instance, window)
get_ec2_dependencies(instance)
```

Use validated, allowlisted arguments. These are not assumptions about AWS SDK endpoints. Direct sources provide **current investigation evidence**. All results carry `ok`/`no_match`/`partial`/`unavailable`/`error`, scope, integration mode (`mock`/`fixture`/`live`/`stub`), source, evidence IDs, observation period, collection time, units, coverage and missing fields. Unknown is not zero or absent.

**Separately**, after the basic proof, integrate:

```text
query_investigation_history(scope, limit)       # Zetaris historical query
append_investigation_history(validated_record)  # narrowly authorized history-only write
hmem_retrieve_relevant_context(scope)
hmem_store_investigation_summary(summary)
```

Actual SDK/API shapes must be verified. Zetaris history is structured prior observation/outcome data; H-MEM is prior hypothesis/risk/learning memory. Neither establishes current safety. Never pass model-authored SQL to the unrestricted Zetaris connectivity helper, expose general DML, write to AWS, or store sensitive raw responses.

## 3. One planner → executor → evaluator → replan/finish loop

| Component    | Responsibility                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Planner      | Choose next allowlisted current-evidence query given the requested account/region, observed evidence and unresolved safety risks               |
| Executor     | Check tool name/arguments, call direct tool with timeout, validate response and register retrieved evidence IDs                                |
| Evaluator    | Assess scope, freshness, peaks, jobs, dependencies, coverage, contradictions and whether to continue, reject, conditionally recommend or defer |
| Orchestrator | Bound calls and total runtime, refuse repeated actions, record trace and finalize a report                                                     |

The agent cannot make a supported scheduling recommendation until it has **attempted a targeted falsification** of that proposed window. Finishing is code-gated, not an untrusted model instruction. A single model-backed planner plus deterministic safety evaluator is sufficient. Do not add another autonomous agent role.

Illustrative **expected** trace:

```text
CLI       account=demo region=us-east-1 (no baseline provided)
Planner   discover candidates from inventory and current compute costs
Tool      instance A appears potentially idle overnight [inventory, billing]
Planner   inspect utilization to propose a window
Tool      low average overnight CPU (peaks/coverage disclosed) [metrics]
Evaluator possible conflict: require job/schedule/dependency challenge
Planner   query operational schedules overlapping proposed window
Tool      required batch job overlaps proposed window [operations]
Evaluator hypothesis contradicted; reject initial window
Finish    not_recommended, exact conflicting evidence ID, assumptions,
          missing checks, null savings, full trace
```

The next query must genuinely depend on earlier evidence. An alternate observation (e.g., a different operating window, peak pattern, or no authoritative schedule coverage) must change the query or the verdict. Never script a false hypothesis revision with hard-coded narration.

## 4. Minimum runtime checks and failure cases

- Runtime-validate all external/tool/model outputs, not only TypeScript interfaces.
- Enforce caller scope `(account_id, region, instance_id)` and UTC period across all evidence; reject mismatched joins.
- Retain `ok`, `no_match`, `partial`, `unavailable`, `error` distinctly. A successful empty job query is not proof that no job exists unless the source's coverage and authority justify a narrower conclusion.
- Proposed initial budgets: **at most six current-evidence tool attempts and seven planner calls per candidate**, one separate discovery budget, finite per-tool and overall timeouts; tune to executable evidence and count every attempt. No unbounded retries.
- Detect repeated identical tool actions without new evidence and terminate as incomplete.
- A missing schedule/dependency source should produce `needs_verification` and `null` savings; a model failure produces an explicitly incomplete model-dependent investigation; history/memory failures are disclosed without replacing fresh evidence.
- Keep current evidence references separate from historical Zetaris/H-MEM context IDs. Every factual current finding cites an ID actually retrieved in the run.
- Never modify infrastructure; owner approval remains required for any eventual user action.

## 5. Proof and completion gate

The **basic loop** is proven only when executed tests demonstrate:
1. Account/region CLI discovers a candidate from a labeled provider and produces runtime-valid JSON and a detailed readable trace.
2. The first proposed schedule is overturned by a genuinely later contradictory operational observation, with exact evidence references and scope.
3. Altering the mock operational record produces a different decision or next query, establishing adaptive behavior.
4. Missing/invalid/unavailable evidence, repeating actions and budget exhaustion finish within limits with explicit uncertainty and `null` savings.
5. No prior Zetaris or H-MEM records are required to finish a first-run investigation; modes are truthfully labeled.
6. An actual approved model call is verified and clearly separated from any scripted-only test.

Then prove real sponsor integrations separately: one Meterless H-MEM store/read with provenance, one authorized narrow Zetaris history append/read, and a later **warm** run where memory changes a query priority and Zetaris supplies historical comparison rows. The current verdict must still depend on freshly retrieved direct evidence. A mock backing these operations is **not** integration proof.

Record exact commands, outcomes, integration modes, and blockers only in `docs/EXECUTION_PLAN.md`. Record durable design rationale in `memory.md`.

## 6. Follow-on work (not part of the first slice)

- Expand discovery to **at most three** candidates with a fixed ranking, selection rationale, and a bounded aggregate runtime.
- Implement scenario A conditional scheduling with positive safety coverage and deterministic marginal compute-only savings when justified.
- Implement scenario C justified continuous operation and a separate incomplete-data path.
- Implement scenario D warm reinvestigation: Zetaris structured history, H-MEM contextual recall and fresh tool verification.
- Measure compared-to-baseline safety, citation integrity, durations and call counts; finish README, slides and 1–4 minute demo.

Stop after a verified thin slice; do not build dashboards, downsizing, a new stack, or extra autonomous roles to demonstrate the MVP.

## Warm slice implementation checkpoint (2026-10-23)

Scenario D now connects the existing Zetaris and H-MEM adapters to the CLI.
Scoped historical context changes fresh query priority; newly retrieved evidence
still controls every verdict. The configured two-run sponsor proof and focused
failure tests are recorded in `docs/EXECUTION_PLAN.md`. Live AWS and warm model
planning remain separate gates. The broader A/C and multi-candidate implementation
is described below; measured baseline evaluation remains separate.

## Broader scenario implementation (2026-10-23)

A conditional recommendation requires positive matching owner/calendar/recovery
clearance from both operations and dependencies, complete authoritative data,
adequate utilization coverage, no overlapping jobs and no continuous-operation
constraint. C rejects a proposed window based on a fresh continuous-operation
dependency; missing evidence remains a separate deferral path.

Discover up to three candidates in descending positive matching compute spend,
ties by instance ID. Share discovery, keep candidate evidence isolated and retain
one aggregate deadline. Unsupported candidates are explicitly deferred without
losing earlier results. Persist one scoped historical summary per candidate.

Savings use the month following the observation window, reviewed excluded dates,
per-window overhead, billing granularity and an explicit marginal on-demand USD
compute rate. Commitments, other currencies, retained-cost ambiguity or expired
pricing keep the estimate null. No rate is derived from total spend. All new
scenario data is synthetic; actual adapter/pricing integration remains a gate.

Executable proof and remaining work belong to `docs/EXECUTION_PLAN.md`.
