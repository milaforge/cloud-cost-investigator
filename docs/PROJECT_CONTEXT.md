# Cloud Cost Investigator — Project Context

> Source of truth for the agreed product, interfaces, data semantics, safety policy, and acceptance criteria. See [`RULES.md`](./RULES.md) for recorded event notes, [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md) for executable gates, and [`../AGENTS.md`](../AGENTS.md) for contributor instructions.

**Decision date:** 2026-10-23 (MVP discovery rounds 1–4 and corrected sponsor architecture approved).  
**Hackathon:** Open Agent Hackathon 2026; **Track 02 — The Agent That Can Explain Why**.  
**Deadline:** 2026-10-27 23:45 UTC per event planning notes; confirm in submission portal.  
**Team:** Milad — orchestration, model, Meterless, CLI/report; Zayan — direct data tools, Zetaris, data correctness; both — contracts, safety evaluation.  
**Target:** AWS EC2 only. **Status:** Product decisions approved; first contradiction-first CLI slice has executable proof in `EXECUTION_PLAN.md`. Current evidence remains mock; sponsor and release gates are separate.

## 1. Product and user decision

Cloud Cost Investigator is a **read-only, evidence-driven EC2 off-hours scheduling investigator** for engineers at small infrastructure/platform teams. An engineer supplies an AWS account and region. The agent discovers **up to three candidate instances**, proposes possible scheduling windows, **attempts to falsify every candidate hypothesis** with operational evidence, and produces a detailed, cited investigation report. Each candidate ends as a **conditional recommendation**, **not recommended**, or **needs verification**. It never stops or resizes an instance.

The user's decision is **which opportunities warrant human approval, which must be rejected, and which need additional verification**. The distinguishing feature is explaining _why not to optimize_ after evidence contradicts an apparently attractive suggestion.

**Superseded scope (explicit team decision, Oct 23):** Explaining _increased EC2 spending between two billing periods_ is no longer the MVP's primary or required workflow. No initial baseline investigation, two billing snapshots, previous run, or comparison-period parameter is required. This does not change the selected hackathon track; evidence-backed explanations and justified refusals satisfy its intent. Billing history can still inform marginal savings when supported.

## 2. Decisions, proposals, and exclusions

| Subject             | Status                           | Policy                                                                                                                                                                            |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Goal and scope      | Agreed                           | Optimization-first, account/region, discover at most three candidates                                                                                                             |
| First optimization  | Agreed                           | EC2 **off-hours stopping schedules only**; no downsizing                                                                                                                          |
| Safety evaluation   | Agreed                           | Mandatory targeted attempt to disprove each proposed schedule                                                                                                                     |
| Uncertainty         | Agreed                           | Query additional relevant sources within bounds; then defer; no interactive CLI clarification required                                                                            |
| Presentation        | Agreed                           | Detailed human-readable CLI investigation report and structured machine-readable output                                                                                           |
| Memory              | Agreed                           | Timestamped investigation summaries guiding fresh queries, not live telemetry                                                                                                     |
| Failure             | Agreed                           | Status-specific bounded degradation and explicit uncertainty                                                                                                                      |
| Source architecture | Agreed                           | Current evidence: Zayan's direct TypeScript tools/API adapters, mocked initially; Zetaris: structured historical investigation records; Meterless H-MEM: reasoning memory         |
| Historical writes   | Approved in principle            | **Narrowly scoped investigation-history append** through Zetaris with separate authorization/allowlisted API; no arbitrary SQL or AWS writes. Technical support/access unverified |
| Observation period  | Proposed default                 | 28 UTC days, configurable; valid granularities and billing coverage must be checked against actual APIs                                                                           |
| Candidate ranking   | Proposed                         | Measured compute-cost relevance + off-hours utilization patterns; explain selection and incomplete coverage                                                                       |
| Report shape        | Proposed implementation contract | Described in §8; implementation names may evolve if behavior stays testable                                                                                                       |

Out of scope: original cost-increase explanation command; mandatory baseline or snapshot comparison; EC2 downsizing; multi-cloud; Kubernetes; automated remediation; enterprise onboarding/auth; forecasting; dashboards; complex multi-agent frameworks; extra Meterless engines. A readable CLI is sufficient for the surface; demo/slides remain required.

## 3. User flows and expected dispositions

These flows share **one bounded investigation engine**, not separate agents:

| Flow                                             | Trigger and agent behavior                                                                                                                      | Expected outcome                                                                                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Supported opportunity**                    | Discover an instance with eligible compute spend and repeatable inactive hours; investigate peaks, jobs, dependencies, schedules and exceptions | **Conditional recommendation** for a specific UTC shutdown window only with adequately corroborated safety evidence, stated human approval and remaining checks; deterministic compute-only savings or `null` |
| **B — Rejected hypothesis**                      | Proposed shutdown looks attractive; an evidence-dependent query uncovers critical weekly batch/peak/dependency conflicting with that window     | **Not recommended** for that proposed window; trace records hypothesis before/after and cites contradiction                                                                                                   |
| **C — Justified continuous operation / unknown** | Current evidence justifies uptime, or critical operational evidence is insufficient                                                             | **Not recommended** when required operation is supported; **needs verification** when evidence is missing/ambiguous. These are different conclusions                                                          |
| **D — Reinvestigation**                          | Later run sees relevant previous history and reasoning memory                                                                                   | Zetaris supplies structured prior observations; H-MEM supplies investigation context. Both may affect query order but **all current verdicts require fresh direct evidence**                                  |

Additional required failure proof: unavailable/partial/invalid direct source, history-store failure, memory unavailable, model error, repeated action, or budget exhaustion should be bounded and correctly labeled. First run must work with empty Zetaris history and empty H-MEM memory.

**CLI shape:** supports `--max-candidates 1` through `3` (default 1), sharing discovery and one aggregate deadline:

```bash
cloud-cost-investigator investigate --account demo --region us-east-1 \
  --lookback-days 28 --max-candidates 3
```

Mock/live integration modes must be explicit; synthetic fixture records must never be represented as AWS live telemetry.

## 4. Evidence source architecture

### Direct TypeScript tool/API boundary — source of current facts

Zayan owns validated, read-only adapters; the implementation may initially use **labeled mocks** with identical result contracts. These are **logical application operations**, not promised AWS SDK endpoints:

```text
list_ec2_instances(scope)
get_ec2_billing(scope, window)
get_ec2_metrics(instance, window)
get_ec2_operations(instance, window)
get_ec2_dependencies(instance)
```

Direct data categories: inventory (IDs, types, ownership/tags, state), billing (compute charges, currency, pricing/commitment coverage), utilization (time series, peaks, coverage and granularity), schedules/changes (jobs, deployment/config history, timezone, exceptions), and dependencies (upstream/downstream consumers, availability obligations, coverage). Some job/dependency facts may require operational integrations outside native AWS APIs. Do **not** assume such integrations exist merely because a logical tool is defined.

Previous discovery described all five categories as available _via Zetaris_. The **corrected architecture** uses direct adapters; Zayan reports these are **under development**, with mocks allowed now. No executed direct-API verification is claimed.

### Zetaris — structured historical records and comparisons

Use governed, scoped historical investigation data that can answer: _What was observed last time, when, with what coverage, and what changed in a later fresh observation?_ Keep timestamped compact rows for investigation ID, `(account, region, instance)`, observed interval, summarized numeric observations, evidence reference metadata, proposed schedule, verdict and reason, integration mode, and collection time. Avoid duplicate full reports, secrets, raw provider responses, or unverifiable historical conclusions.

Proposed allowlisted surface:

```text
query_investigation_history(scope, limit, date_range)  # read-only historical query
append_investigation_history(validated_record)          # authorized narrowly scoped append
```

**Security boundary:** AWS and current-evidence tools stay strictly read-only. The **only authorized write exception** is an approved, schema-validated, append-only investigation-history operation within a dedicated non-infrastructure history namespace/table, subject to least-privilege credentials and supported Zetaris/backing-store capabilities. No model-authored SQL, general DML/DDL exposure, resource mutations, arbitrary updates/deletes, or writes to AWS. Until the write path is proven, record historical-write failures and continue the current investigation; do **not** claim the Zetaris integration gate passed.

The repository's existing generic `queryZetaris(sql)` is connectivity scaffolding **not** an agent-facing API. Replace or wrap behind fixed operations. Neither a historical record nor its absence proves current operational safety. Empty history must not block a first run.

### Meterless H-MEM — reasoning memory

Use the H-MEM reference already present in the TypeScript starter (runtime store/retrieve must be verified). Persist concise, timestamped summaries of hypotheses, rejected schedules, discovered concerns, unresolved checks, investigation IDs and provenance. Retrieve only relevant scoped memories and disclose which were used to choose a next tool. H-MEM **does not** own authoritative numeric telemetry or structured billing history. Its retrieved beliefs and confidence/ranking signals are not evidence for a current safety verdict. A changed current observation may override stale memory.

**Demonstrable distinct value:** in a second execution, H-MEM changes the early safety question while Zetaris supplies typed previous observations for comparison; direct tools still decide the current verdict. Show separate success/failure handling for both stores.

**Learned-check slice (Oct 24):** A validated, authoritative contradiction can
teach an optional typed `dependency_continuous_operation` or
`critical_job_overlap` check in the reasoning summary. Its original evidence ID
remains historical provenance. Planner hints carry only the check and UTC window,
bound to the current instance and evidence mode; they never carry historical
evidence IDs or free-form memory instructions. The newest eligible H-MEM summary
is active; older records remain auditable. Fresh observations explicitly confirm,
clear or leave the remembered concern unresolved. A newer cleared investigation
can replace a rejected conclusion only through the existing safety evaluator.
`npm run demo:warm` isolates real local H-MEM in a cold C → warm C → changed A
proof; `--planner model` exercises the real model. Measure fewer planner/tool
calls separately from wall time. This extends the bounded loop and introduces no
world graph, additional roles, remote schema changes or live evidence claims.

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

Model-produced arguments/actions are validated against an allowlist. Protect all query paths with source-specific timeouts, page/size bounds, retries and a total runtime budget; no unrestricted SQL or tool-generated writes.

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

## 8. Detailed report and trace contract

Output both readable CLI content and a runtime-validated JSON report (file export optional). Each report includes:
- Investigation ID, question/goal, account/region, UTC observed window, integration mode, source coverage and **overall completion status** (`complete` / `partial` / `failed`).
- Candidate discovery count/limit, selection rationale, and any discovery gaps.
- Per-instance proposed schedule, verdict, supporting and contradicting **retrieved-current** evidence IDs, risks, unresolved checks, assumptions, next human actions, and deterministic savings or `null` (with currency when known).
- Hypothesis transitions (`proposed` / `supported` / `contradicted` / `unresolved`), including explicit rejected window and contradiction source.
- Detailed decision trace: planned question, chosen validated tool and arguments, source status, evidence IDs, evaluator reason, replan/finish reason, and budget usage.
- History/memory section with past Zetaris observation IDs and H-MEM context IDs **clearly marked as historical**, plus any read/write failures.

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

## 10. Integration status and references

**Diagnostic contract update (2026-10-24):** Planner failures may now carry an
optional validated `failure_code` on actionless planner trace entries; old reports
remain valid. Only fixed public codes or three-digit HTTP statuses are reported.
Evaluation separates exact disposition matches from completion states and planner
failures, including matching deferrals reached after failure. Correct deferrals
remain partial; operational planner failures cannot pass the evaluation gate.
This diagnostic change does not relax safety, add retries or establish the exact
causes of older generic failures. A new real-model diagnostic measurement in
`evaluation-model-diagnostics.json` recorded 6/8 label matches, 2 complete and
6 partial, with three `planner_timeout` cases and one incidental matching
deferral after timeout. These hit the unchanged 15-second per-call limit; the
earlier five generic errors remain undiagnosed. Proof is in `EXECUTION_PLAN.md`.

**Subsequent timeout/pacing update (2026-10-24):** By user request, new live
planner calls and HTTP requests allow five minutes. The aggregate live budget
scales with bounded call counts and pacing plus a two-minute reserve; explicit
shorter deadlines still apply. Evaluation supports one selected case via
`--case`, preserving its actual denominator, and defaults to a five-second pause
before each live planner call. Cases and calls remain sequential; no retries or
fallback are added. Earlier timeout measurements above retain their original
limits. An HTTP 500 alone does not establish overload.

**2026-10-24 evaluation update:** Eight designed synthetic cases now have a
reproducible scripted-policy comparison against the low-average-CPU heuristic,
including safety/unknown positives, citation validation and per-case timing/calls.
Results and limitations are in `evaluation-scripted.json`; executed commands are
in `EXECUTION_PLAN.md`. In a subsequent user-requested retry, the configured
NVIDIA-hosted `nvidia/nemotron-3-ultra-550b-a55b` passed the access diagnostic and
real-model cold/warm proof with both historical stores and fresh mock evidence.
The earlier HTTP 403 no longer reproduces; its cause is unknown. No fallback,
credential or endpoint changes were made by the agent. The user confirmed this
exact model is fine for the event. Model selection is therefore team-approved;
independent organizer verification was not obtained. Subsequent live-model
fixture evaluation is in `evaluation-model.json`: 5/8 matching dispositions,
zero unsafe/unverified positives and 25/25 valid current references, but only
1/8 complete investigations. Five planner failures include two matching
deferrals; disposition accuracy must not be called investigation success.
Detailed failures, latency/calls and limitations remain in the execution plan.

**Executed proof:** account/region CLI discovery, mock scenario B rejection and missing-source handling, runtime/citation/failure tests, live NVIDIA-hosted planning over mock evidence, actual local H-MEM summary store/reload/query, and two-run CLI warm investigations using the configured Zetaris service plus local H-MEM with both scripted and real-model planners over mock AWS evidence. History changes query order; fresh operational evidence controls rejection. Exact commands and results belong to `EXECUTION_PLAN.md`. **Still unverified:** live Zayan current-evidence adapters, effective table-scoped least-privilege deployment permissions, real AWS accounts/billing granularity and submission portal details. Model selection is team-confirmed as recorded above. The generic Zetaris helper is connectivity scaffolding outside the agent allowlist. Earlier claims of data available through Zetaris do not establish direct API integration.

Meterless reference: [Meterless repository](https://github.com/Meterless/Meterless), specifically `llms.txt`, `README.md`, `AGENTS.md`, `engines/hmem/README.md`, `engines/hmem/AGENTS.md`. These describe H-MEM's provenance-aware memory and a runnable reference, not a production hosted memory service. Zetaris reference: [documentation](https://zetaris.github.io/). Verify supported read and narrowly scoped append semantics in the deployed environment before choosing an SDK/query shape; examples in documentation are not proof of account access.

Event source: [`RULES.md`](./RULES.md). Recorded judging weights: Impact 30, Technical 20, Innovation 15, Demo 15, Product & UX 10, Sponsor Tech 10; total 100. These are locally recorded notes, not independently verified portal requirements.
