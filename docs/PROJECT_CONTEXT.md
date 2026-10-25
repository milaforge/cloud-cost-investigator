# Cloud Cost Investigator — Project Context

> Source of truth for the agreed product, interfaces, data semantics, safety policy, and acceptance criteria. See [`RULES.md`](RULES.md) for recorded event notes, [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md) for executable gates, and [`../AGENTS.md`](../AGENTS.md) for contributor instructions.

[What](../README.md) · [How](HOW.md)

Approved scope and contracts below are distinct from [current verification status](EXECUTION_PLAN.md).

## 1. Product and user decision

Cloud Cost Investigator is a **read-only, evidence-driven EC2 off-hours scheduling investigator** for engineers at small infrastructure/platform teams. An engineer supplies an AWS account and region. The agent discovers **up to three candidate instances**, proposes possible scheduling windows, **attempts to falsify every candidate hypothesis** with operational evidence, and produces a detailed, cited investigation report. Each candidate ends as a **conditional recommendation**, **not recommended**, or **needs verification**. It never stops or resizes an instance.

The user's decision is **which opportunities warrant human approval, which must be rejected, and which need additional verification**. The distinguishing feature is explaining _why not to optimize_ after evidence contradicts an apparently attractive suggestion.

**Superseded scope (explicit team decision, Oct 23):** Explaining _increased EC2 spending between two billing periods_ is no longer the MVP's primary or required workflow. No initial baseline investigation, two billing snapshots, previous run, or comparison-period parameter is required. This does not change the selected hackathon track; evidence-backed explanations and justified refusals satisfy its intent. Billing history can still inform marginal savings when supported.

**Long-term direction (2026-10-24):** evolve into a **cost optimization specialist
agent**. Finding EC2 scheduling opportunities is the initial niche, not the limit
of the product vision. Broader optimization decisions remain future scope; this
clarification does not expand the current MVP, tool permissions or safety policy.

## 2. Decisions, proposals, and exclusions

| Subject             | Status                           | Policy                                                                                                                                                                            |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Goal and scope      | Agreed                           | Optimization-first, account/region, discover at most three candidates                                                                                                             |
| First optimization  | Agreed                           | EC2 **off-hours stopping schedules only**; no downsizing                                                                                                                          |
| Safety evaluation   | Agreed                           | Mandatory targeted attempt to disprove each proposed schedule                                                                                                                     |
| Uncertainty         | Agreed                           | Query additional relevant sources within bounds; then defer; no interactive CLI clarification required                                                                            |
| Presentation        | Agreed                           | Detailed CLI/JSON reports and a local guided demo UI with investigation, learning, follow-through and validated report loading                                                                                           |
| Memory              | Agreed                           | Timestamped investigation summaries guiding fresh queries, not live telemetry                                                                                                     |
| Failure             | Agreed                           | Status-specific bounded degradation and explicit uncertainty                                                                                                                      |
| Source architecture | Agreed                           | Current evidence: Zayan's direct TypeScript tools/API adapters, mocked initially; Zetaris: structured historical investigation records; Meterless H-MEM: reasoning memory         |
| Historical writes | Agreed | Narrow schema-validated history append through Zetaris; no arbitrary SQL or AWS writes. Deployment proof is tracked separately. |
| Observation period  | Agreed AWS MVP                   | 14 complete UTC days (Milad confirmed Oct 24); aligned metrics/billing windows required. Mock mode has a separate 28-day default.             |
| Candidate ranking   | Implemented policy                         | Descending positive matching compute spend, ties by instance ID; explain incomplete coverage                                                                       |
| Report shape        | Runtime-validated contract | Described in §8; implementation names may evolve if behavior stays testable                                                                                                       |

Out of scope: original cost-increase explanation command; mandatory baseline or snapshot comparison; EC2 downsizing; multi-cloud; Kubernetes; automated remediation; enterprise onboarding/auth; forecasting; full dashboards; complex multi-agent frameworks; extra Meterless engines. A readable CLI is sufficient for the surface; demo/slides remain required.

The team-approved local demo UI (Oct 24) runs the existing investigation,
learning and follow-through workflows, with offline investigation/learning by
default and explicit real-service controls. It supports A/B and failure scenarios,
read-only AWS scope selection, configured-model calls, H-MEM cold/warm/changed
proof and separately acknowledged synthetic Zetaris history writes. It also loads
single generated reports. This does not add a new planner or permit AWS mutation.
[How](HOW.md#open-the-web-demo) owns usage and
[components](components.md#local-report-viewer) owns its boundaries.

## 3. User flows and expected dispositions

These flows share **one bounded investigation engine**, not separate agents:

| Flow                                             | Trigger and agent behavior                                                                                                                      | Expected outcome                                                                                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Supported opportunity**                    | Discover an instance with eligible compute spend and repeatable inactive hours; investigate peaks, jobs, dependencies, schedules and exceptions | **Conditional recommendation** for a specific UTC shutdown window only with adequately corroborated safety evidence, stated human approval and remaining checks; deterministic compute-only savings or `null` |
| **B — Rejected hypothesis**                      | Proposed shutdown looks attractive; an evidence-dependent query uncovers critical weekly batch/peak/dependency conflicting with that window     | **Not recommended** for that proposed window; trace records hypothesis before/after and cites contradiction                                                                                                   |
| **C — Justified continuous operation / unknown** | Current evidence justifies uptime, or critical operational evidence is insufficient                                                             | **Not recommended** when required operation is supported; **needs verification** when evidence is missing/ambiguous. These are different conclusions                                                          |
| **D — Reinvestigation**                          | Later run sees relevant previous history and reasoning memory                                                                                   | Zetaris supplies structured prior observations; H-MEM supplies investigation context. Only H-MEM lessons may affect query order; **all current verdicts require fresh direct evidence**                                  |

Additional required failure proof: unavailable/partial/invalid direct source, history-store failure, memory unavailable, model error, repeated action, or budget exhaustion should be bounded and correctly labeled. First run must work with empty Zetaris history and empty H-MEM memory.

[CLI flags and synthetic scenario selection](CLI_GUIDE.md#run) are documented separately.

## 4. Evidence source architecture

### Direct TypeScript tool/API boundary — source of current facts

Zayan owns validated, read-only adapters; **labeled mocks** use the same application contract. These are **logical application operations**, not promised AWS SDK endpoints:

```text
list_ec2_instances(scope)
get_ec2_billing(scope, window)
get_ec2_metrics(instance, window)
get_ec2_operations(instance, window)
get_ec2_dependencies(instance)
```

Direct data categories: inventory (IDs, types, ownership/tags, state), billing (compute charges, currency, pricing/commitment coverage), utilization (time series, peaks, coverage and granularity), schedules/changes (jobs, deployment/config history, timezone, exceptions), and dependencies (upstream/downstream consumers, availability obligations, coverage). Some job/dependency facts may require operational integrations outside native AWS APIs. Do **not** assume such integrations exist merely because a logical tool is defined.

### Zetaris — structured historical records and comparisons

Use governed, scoped historical investigation data that can answer: _What was observed last time, when, with what coverage, and what changed in a later fresh observation?_ Keep timestamped compact rows for investigation ID, `(account, region, instance)`, observed interval, summarized numeric observations, evidence reference metadata, proposed schedule, verdict and reason, integration mode, and collection time. Avoid duplicate full reports, secrets, raw provider responses, or unverifiable historical conclusions.

Allowlisted logical history surface:

```text
query_investigation_history(scope, limit, date_range)  # read-only historical query
append_investigation_history(validated_record)          # authorized narrowly scoped append
```

**Security boundary:** AWS and current-evidence tools stay strictly read-only. The **only authorized write exception** is an approved, schema-validated, append-only investigation-history operation within a dedicated non-infrastructure history namespace/table, subject to least-privilege credentials and supported Zetaris/backing-store capabilities. No model-authored SQL, general DML/DDL exposure, resource mutations, arbitrary updates/deletes, or writes to AWS. Until the write path is proven, record historical-write failures and continue the current investigation; do **not** claim the Zetaris integration gate passed.

The generic `queryZetaris(sql)` connectivity helper is **not** exposed to the agent; the history adapter owns fixed operations. Neither a historical record nor its absence proves current operational safety. Empty history must not block a first run.

Report fields for historical comparisons are defined in the [report contract](#8-detailed-report-and-trace-contract).

### Meterless H-MEM — reasoning memory

Use the vendored H-MEM reference; storage details live in the [H-MEM reference](MEMORY.md). Persist concise, timestamped summaries of hypotheses, rejected schedules, discovered concerns, unresolved checks, investigation IDs and provenance. Retrieve only relevant scoped memories and disclose which were used to choose a next tool. H-MEM **does not** own authoritative numeric telemetry or structured billing history. Its retrieved beliefs and confidence/ranking signals are not evidence for a current safety verdict. A changed current observation may override stale memory.

H-MEM owns historical check-order advice. Raw Zetaris rows cannot directly order checks. Linked, structured rollback feedback may teach a scoped lesson through the [validated follow-up learning path](FOLLOW_UP.md#automatic-learning-from-outcomes). Detailed reuse conditions and persistence failure handling live in the [H-MEM reference](MEMORY.md#store-and-recall); event compatibility and operator attribution live in [follow-up storage boundaries](FOLLOW_UP.md#storage-and-failure-boundaries).

## 5. Shared runtime contract

Every tool response is runtime-validated (TypeScript types alone are insufficient) and includes:

```text
status: ok | no_match | partial | unavailable | error
source; integration_mode: mock | fixture | live | stub
scope: account_id, region, resource_id where applicable
observed_at or UTC observation interval; collected_at
coverage and missing_fields; measurement units and aggregation interval
evidence_ids; validated typed data or sanitized error metadata
```

A successful query returning no matches is **not** proof of absent jobs, dependencies or risks. Scope/period mismatches and unparseable results are explicit errors or incomplete evidence, never silently joined. Preserve UTC event time separately from collection time and historical record time. Keep an investigation-local registry of **actually retrieved** evidence IDs. History IDs or H-MEM IDs may be cited as _historical context_, but cannot substitute for fresh evidence citations.

Model-produced arguments/actions are validated against an allowlist. Protect all query paths with source-specific timeouts, page/size bounds and a shared total runtime budget; no unrestricted SQL or tool-generated writes. One investigation has a maximum 15-minute total budget, 60-second model-call cap and five-second report finalization reserve (proportionately smaller for short custom budgets). History waits and pacing share the deadline. Keep existing evidence-call limits, preserve completed findings on exhaustion and defer unresolved candidates. No automatic model retries. Exact execution bounds are documented in [components](components.md#runtime-ownership-and-bounds).

## 6. Decision policy

| Verdict                                      | Minimum rationale                                                                                                                                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `optimization_candidate` (intermediate only) | Current compute-cost relevance and plausible inactive window, supported by data coverage; not a recommendation                                                                                                                            |
| `conditional_recommendation`                 | Explicit UTC schedule window, adequate utilization/peak coverage, authoritative job/schedule and dependency checks or equivalent positive scope-complete proof, no known critical conflict, and required human approval/remaining caveats |
| `not_recommended`                            | Retrieved current evidence directly conflicts with the proposed window or establishes required continuous operation; say which window was rejected                                                                                        |
| `needs_verification`                         | A critical data gap, stale scope, unreliable coverage, contradictory observations, or unresolved safety risk prevents a recommendation                                                                                                    |

Every candidate is challenged with at least one **targeted disconfirming** inquiry before any supported recommendation. The evaluator may replan based on a newly discovered risk. A rejected hypothesis must be _actually rejected_, not simply recommended with a warning. Low average CPU, a `dev` tag, or no matching jobs in a non-authoritative source cannot clear the safety gate. If a fresh operational constraint is unknown, defer.

## 7. Savings discipline

Savings are **deterministic**, not LLM-derived. A non-null amount requires a justified schedule, compute-only marginal eligible cost or rate, time units, billing coverage, currency, and treatment of Reserved Instances/Savings Plans/discounts. Explicitly exclude ongoing EBS and other retained costs unless separately modeled. Consider schedule/calendar/timezone exceptions, stop/start overhead and billing effects. A tempting nominal estimate is not necessarily a reduction in the AWS bill. For any missing essential assumption, set `estimated_monthly_savings = null`; never invent a price, confidence percentage, or coverage claim.

Implemented conservative policy: complete authoritative discovery and both operational challenges, at least seven days of ≤5-minute low-average/peak utilization, no overlapping jobs, and matching owner/calendar/recovery clearances covering the calendar month following the observed window. Clearances explicitly carry excluded UTC dates and per-window overhead. Positive clearance never authorizes execution. Numeric savings currently support only USD on-demand marginal compute rates with explicit commitment treatment, retained-cost exclusion and pricing validity covering that month. Round avoided daily minutes down to billing granularity and the final amount down to USD cents; all unsupported cases remain `null`.

Example: fixture A uses 00:00–06:00 UTC, one excluded date, 30 minutes overhead, 60-minute billing units and a **synthetic** USD 0.50/hour rate. For October, `(31 − 1) × 5 × 0.50 = USD 75`. This is a conditional planning estimate, not measured savings.

## 8. Detailed report and trace contract

Output both readable CLI content and a runtime-validated JSON report (file export optional). Each report includes:

- Investigation ID, question/goal, account/region, UTC observed window, integration mode, source coverage and **overall completion status** (`complete` / `partial` / `failed`).
- Candidate discovery count/limit, selection rationale, and any discovery gaps.
- Per-instance proposed schedule, verdict, supporting and contradicting **retrieved-current** evidence IDs, risks, unresolved checks, assumptions, next human actions, and deterministic savings or `null` (with currency when known).
- Hypothesis transitions (`proposed` / `supported` / `contradicted` / `unresolved`), including explicit rejected window and contradiction source.
- Detailed decision trace: planned question, chosen validated tool and arguments, source status, evidence IDs, evaluator reason, replan/finish reason, and budget usage.
- History/memory section with past Zetaris observation IDs and H-MEM context IDs **clearly marked as historical**, plus any read/write failures.

Optional `historical_context.comparisons` rows carry prior verdict, proposed/rejected UTC windows, record/context/investigation IDs, timestamp, instance, scope and source mode. Future and mismatched-mode records are excluded. These rows are historical comparison context, never current proposals, clearance or citations; older reports without the field remain valid.

Actionless planner trace entries may carry a validated `failure_code` and optional `provider_error: { body, truncated }`. Codes are fixed public values or three-digit HTTP statuses; excerpts use bounded/redacted capture. Neither field affects safety, retries or evidence. [Diagnostics](CLI_GUIDE.md#diagnostics) defines the capture limits and code meanings.

Do not count a partially completed run as fully investigated. A `partial` run may include one well-supported rejection and two deferred candidates; overall status is separate from per-instance verdicts. Render errors without exposing credentials, raw provider responses, or private endpoints.

## 9. Test and release acceptance

A runnable demo must prove:

1. First-run candidate discovery and investigation **without prior history**; data mode truthfully labeled.
2. Scenario A conditional scheduling opportunity under explicitly adequate evidence; otherwise correctly deferred.
3. Scenario B evidence-dependent next query and **actual falsification** of an initially plausible window.
4. Scenario C both justified-uptime and missing-evidence outcomes, including a separate unavailable-source test.
5. Scenario D a real Meterless store/retrieve round-trip and a real Zetaris history read/authorized append proof; warm run uses both **without stale evidence becoming current**.
6. Every factual report citation resolves to evidence retrieved in that run. Non-null savings are reproducible; null when unsupported.
7. Bounded behavior under timeouts, invalid output, repeated actions and budget exhaustion, preserving partial results and distinct statuses.
8. An approved model call is verified. NVIDIA usage and Cursor usage are documented accurately; do not assume they worked because starter code references them.
9. Comparison against a low-average-CPU heuristic plus measured disposition accuracy, unsafe-positive count, citation validity, runtime, tool count and available model cost. Never fabricate benchmark metrics.
10. Fresh-checkout commands, README, reproducible fixture data, slides, sponsor explanation and **1–4 minute demo** prepared before submission.

## 10. References

Current integration state, actual sponsor contribution and open release work live only in the [execution plan](EXECUTION_PLAN.md). Historical measurements remain in its linked receipts.

- [AWS adapter and collector contract](AWS_TOOLS.md).
- [Zetaris table contract and provisioning](ZETARIS_HISTORY.md).
- [H-MEM storage and recall](MEMORY.md).
- [Operator events and outcome learning](FOLLOW_UP.md).
- [Model transport, diagnostics and CLI flags](CLI_GUIDE.md).
- [Evaluation methodology](evaluation/README.md).
- [Recorded event requirements](RULES.md).
