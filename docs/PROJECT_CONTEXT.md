# Cloud Cost Investigator — Project Context

> Source of truth for the agreed product, interfaces, data semantics, safety policy, and acceptance criteria. See [`RULES.md`](RULES.md) for recorded event notes, [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md) for executable gates, and [`../AGENTS.md`](../AGENTS.md) for contributor instructions.

[What](../README.md) · [How](HOW.md)

Approved scope and contracts below are distinct from [current verification status](EXECUTION_PLAN.md).

## 1. Product and user decision

Cloud Cost Investigator is a **read-only, evidence-driven EC2 off-hours scheduling investigator** for engineers at small infrastructure/platform teams. An engineer supplies an AWS account and region. The agent discovers **up to three candidate instances**, proposes possible scheduling windows, **attempts to falsify every candidate hypothesis** with operational evidence, and produces a detailed, cited investigation report. Each new candidate ends as **not recommended** (a cited rejection of this window) or **needs verification** (explicit missing evidence or external decision authority). It never stops or resizes an instance.

The useful answer is **a specific reason to reject a shutdown window, or exactly what evidence is missing and why the decision is deferred**. The distinguishing feature is explaining _why not to optimize_ after evidence contradicts an apparently attractive suggestion.

**Superseded scope (explicit team decision, Oct 23):** Explaining _increased EC2 spending between two billing periods_ is no longer the MVP's primary or required workflow. No initial baseline investigation, two billing snapshots, previous run, or comparison-period parameter is required. This does not change the selected hackathon track; evidence-backed explanations and justified refusals satisfy its intent. Billing history can inform candidate ordering; new runs do not estimate savings.

**Superseding decision (2026-10-26):** new runs only reject or defer. `decision_policy: reject_or_defer` distinguishes them from legacy reports. Older conditional recommendations and their deterministic savings remain readable, never regenerated as new advice. An absence of found conflicts is not approval: when technical checks are complete, name the outstanding authorized human decision without inventing a telemetry gap.

## 2. Decisions, proposals, and exclusions

| Subject             | Status                     | Policy                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Goal and scope      | Agreed                     | Optimization-first, account/region, discover at most three candidates                                                                                                                                                                                                                                                                                                                                                                        |
| First optimization  | Agreed                     | EC2 **off-hours stopping schedules only**; no downsizing                                                                                                                                                                                                                                                                                                                                                                                     |
| Safety evaluation   | Agreed                     | Mandatory targeted attempt to disprove each proposed schedule                                                                                                                                                                                                                                                                                                                                                                                |
| Uncertainty         | Agreed                     | Query additional relevant sources within bounds; then defer; no interactive CLI clarification required                                                                                                                                                                                                                                                                                                                                       |
| Presentation        | Agreed                     | Concise verdict-first CLI by default, comprehensive `--verbose`/JSON reports, and a local guided demo UI with investigation, learning, follow-through and validated report loading                                                                                                                                                                                                                                                           |
| Memory              | Agreed                     | Timestamped investigation summaries guiding fresh queries, not live telemetry                                                                                                                                                                                                                                                                                                                                                                |
| Failure             | Agreed                     | Status-specific bounded degradation and explicit uncertainty                                                                                                                                                                                                                                                                                                                                                                                 |
| Source architecture | Agreed                     | Current evidence: Zayan's direct TypeScript tools/API adapters, mocked initially; Zetaris: structured historical investigation records; Meterless H-MEM: reasoning memory                                                                                                                                                                                                                                                                    |
| Historical writes   | Agreed                     | Narrow schema-validated history append through Zetaris; no arbitrary SQL or AWS writes. Deployment proof is tracked separately.                                                                                                                                                                                                                                                                                                              |
| Observation period  | Agreed AWS MVP             | CLI defaults to 14 complete UTC days; web Live lets the user select 1–14 (default 7), ending at midnight UTC today. Aligned metrics/billing windows remain required; fewer than seven days cannot support a recurring schedule recommendation. Investigation metrics default to five-minute aggregation. Mock mode has a separate 28-day default; explicit seven-day mocks cover the minimum safety window without fabricating live history. |
| Candidate ranking   | Implemented policy         | Available matching compute spend, ties by instance ID; include unbilled running inventory and explain unknown coverage                                                                                                                                                                                                                                                                                                                       |
| Report shape        | Runtime-validated contract | Described in §8; implementation names may evolve if behavior stays testable                                                                                                                                                                                                                                                                                                                                                                  |

Out of scope: original cost-increase explanation command; mandatory baseline or snapshot comparison; EC2 downsizing; multi-cloud; Kubernetes; automated remediation; enterprise onboarding/auth; forecasting; full dashboards; complex multi-agent frameworks; extra Meterless engines. A readable CLI is sufficient for the surface; demo/slides remain required.

The local web UI has a top-center Mode select defaulting to **Demo**. All three
tabs exist in both modes. In Live, Learn and Follow through remain disabled
until an investigation result or validated saved live report is selected.
Demo is preview-only: generated synthetic/scripted
investigation reports, an illustrative learning flow and illustrative fictional
follow-through. It has no run, owner-input, model/service or remote-write controls.
Live uses the server-configured model, AWS scope (`AWS_EXPECTED_ACCOUNT_ID`,
`AWS_REGION`, `CCI_MAX_CANDIDATES`), automatic configured Zetaris history
reads, and local H-MEM recall/store. It has no Live configuration section or service checkbox: Run investigation
authorizes the run and validates loaded server configuration before worker startup.
Configuration errors request `.env` fixes and restarting `npm start`.
It owns investigation controls, live report loading and
Zetaris decision recording through the explicit Save decision action. Live Learn displays the
selected report's memory status. The web worker uses `HMEM_PERSIST_DIR` when set,
otherwise `.cci-memory`; Docker Compose mounts a persistent `cci-hmem` volume.
Memory failures remain visible and do not supply current evidence. Separate CLI learning/follow-through demonstrations remain
available with their existing safeguards. [How](HOW.md#open-the-web-demo) owns
usage and [components](components.md#local-report-viewer) owns boundaries.
Execution events disclose bounded Zetaris and H-MEM read/store outcomes when
those services are involved. Zetaris comparisons stay out of Planner input;
only applicable H-MEM check hints may reach the Planner, and the event stream
reports their count. Events never expose raw historical prose or provider replies.
This supersedes the earlier mixed synthetic/real-service browser workflows.

## 3. User flows and expected dispositions

These flows share **one bounded investigation engine**, not separate agents:

| Flow                                             | Trigger and agent behavior                                                                                                                      | Expected outcome                                                                                                                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — No conflict found**                        | Discover an instance with eligible compute spend and repeatable inactive hours; investigate peaks, jobs, dependencies, schedules and exceptions | **Needs verification**: complete technical checks do not decide shutdown; defer the external authorized human decision, with null savings                                               |
| **B — Rejected hypothesis**                      | Proposed shutdown looks attractive; an evidence-dependent query uncovers critical weekly batch/peak/dependency conflicting with that window     | **Not recommended** for that proposed window; trace records hypothesis before/after and cites contradiction                                                                             |
| **C — Justified continuous operation / unknown** | Current evidence justifies uptime, or critical operational evidence is insufficient                                                             | **Not recommended** when required operation is supported; **needs verification** when evidence is missing/ambiguous. These are different conclusions                                    |
| **D — Reinvestigation**                          | Later run sees relevant previous history and reasoning memory                                                                                   | Zetaris supplies structured prior observations; H-MEM supplies investigation context. Only H-MEM lessons may affect query order; **all current verdicts require fresh direct evidence** |

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

Native AWS operational reads collect dated SSM maintenance intervals and ELBv2
instance registrations. These facts can contradict a proposed window or prompt
owner review; neither source provides workload-wide negative proof or owner
clearance. Exact coverage, timestamps and bounds live in [AWS tools](AWS_TOOLS.md#native-operational-evidence).

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

The runner automatically requests scoped EC2 inventory through the existing
executor before invoking either planner. The first planner turn receives the
validated inventory observation and tool-attempt trace. Authenticated empty
inventory finishes without a planner call; discovery failure or cancellation
stops before planning. Valid partial inventory retains its evidence gaps.

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

Model-produced arguments/actions are validated against an allowlist. Protect all query paths with source-specific timeouts, page/size bounds and a shared total runtime budget; no unrestricted SQL or tool-generated writes. One investigation has a maximum 15-minute total budget, 60-second model-call cap and five-second report finalization reserve (proportionately smaller for short custom budgets). History waits and pacing share the deadline. Evidence retries count against attempt limits (up to eight discovery attempts and twelve per candidate); preserve completed findings on exhaustion and defer unresolved candidates. Transient planner failures use bounded exponential backoff within the same call/runtime budgets; permanent failures and invalid output are terminal. The executor retries failed read-only evidence actions up to three times after the initial call, with backoff; malformed/out-of-scope observations and cancellation remain terminal. Required discovery cannot advance until it succeeds; exhaustion stops discovery. Never retry uncertain historical writes automatically. Exact execution bounds are documented in [components](components.md#runtime-ownership-and-bounds).

## 6. Decision policy

A proposed daily same-day UTC window is a question, not clearance. A current scoped observation can reject it only by identifying an overlapping critical job, a dated SSM maintenance execution in the planning period, or a named dependency obligation requiring continuous availability. Report the actual identifier, conflicting times or obligation, tested window and current evidence citation. An unnamed dependency boolean cannot explain a new rejection.

Otherwise defer: expose each missing source, coverage/authority gap or unresolved decision and its next check in default CLI and UI output. Complete technical evidence with no found conflict still requires an authorized human decision outside CCI; say so without alleging missing telemetry. Every new report has `decision_policy: reject_or_defer`; the validator rejects conditional recommendations under that marker.

Inventory is mandatory. Billing ranks known running resources when available, with deterministic instance-ID ties; absent spend and billing outages do not block operational checks. Invalid scoped data and cancellation remain terminal. Partial observations and whole-period peaks do not prevent posing the retrieved suggested window or collecting other scoped evidence. Within existing budgets collect both operations and dependencies, including after a conflict, preserving the integrated collection behavior.

Zetaris follow-through accepts review requests for rejected windows and evidence deferrals, including partial reports. Failed investigations cannot receive decisions. Accept/outcome handling remains solely for eligible historical conditional recommendations. Review requires new scoped evidence; attribution never grants infrastructure authority.

## 7. Savings and legacy compatibility

New reports always emit `estimated_monthly_savings: null` and `savings_calculation: null`; savings are not the product's decision. Historic reports without the policy marker retain strict positive-proof and deterministic marginal-cost validation. Historical records and measured receipts are never rewritten to change their verdicts. Native live SSM/ELBv2 evidence remains partial; complete synthetic clearances do not imply complete live coverage.

## 8. Detailed report and trace contract

Output both readable CLI content and a runtime-validated JSON report (file export optional). The CLI defaults to a concise verdict-first summary; `--verbose` exposes the comprehensive report below. Output modes do not change policy, evidence or exit codes. Each report includes:
- Investigation ID, question/goal, account/region, UTC observed window, integration mode, source coverage and **overall completion status** (`complete` / `partial` / `failed`).
- Candidate discovery count/limit, selection rationale, and any discovery gaps.
- Per-instance proposed schedule, verdict, supporting and contradicting **retrieved-current** evidence IDs, risks, unresolved checks, assumptions, next human actions, and null savings (legacy reports preserve their original validated calculation).
- Hypothesis transitions (`proposed` / `contradicted` / `unresolved` (`supported` is historical only)), including explicit rejected window and contradiction source.
- Detailed decision trace: actual UTC emission `timestamp`, run-correlating `trace_id`, ordered `step`, categorical evidence-support `confidence`, zero-based `retry_count`, planned question, chosen validated tool and arguments, source status, evidence IDs, evaluator reason, replan/finish reason, and budget usage. The readable JSONL view adds concise input/reasoning/output summaries and exposes measured five-check evidence coverage as numeric `confidence`, preserving categorical support as `evidence_support`; see the [trace contract](CLI_GUIDE.md#capture-and-read-the-decision-trace).
- History/memory section with past Zetaris observation IDs and H-MEM context IDs **clearly marked as historical**, plus any read/write failures.

Optional `historical_context.comparisons` rows carry prior verdict, proposed/rejected UTC windows, record/context/investigation IDs, timestamp, instance, scope and source mode. Future and mismatched-mode records are excluded. These rows are historical comparison context, never current proposals, clearance or citations; older reports without the field remain valid.

Trace `confidence` is `supported` when this step cites complete authoritative observations without missing fields, `insufficient` for failed attempts or cited evidence gaps, and `unassessed` when no current evidence is cited. It describes support for the step, not a calibrated probability or permission to shut down. `trace_id` equals `investigation_id`; `(trace_id, step)` identifies the entry. Older reports without these fields remain readable with unknown (`null`) retry counts and unassessed confidence; their original receipts stay unchanged.

Actionless planner trace entries may carry a validated `failure_code` and optional `provider_error: { body, truncated }`. Codes are fixed public values or three-digit HTTP statuses; excerpts use bounded/redacted capture. Neither field is safety evidence; only the allowlisted failure code can classify planner retry eligibility, never provider prose. [Diagnostics](CLI_GUIDE.md#diagnostics) defines the capture limits and code meanings.

Do not count a partially completed run as fully investigated. A `partial` run may include one well-supported rejection and two deferred candidates; overall status is separate from per-instance verdicts. Render errors without exposing credentials, raw provider responses, or private endpoints.

Operator-supplied owner statements are a separate optional `owner_evidence`
report section, never direct current-evidence observations. They carry scope,
instance, attribution, topic, reference, assertion time and applicable interval.
The browser no longer collects owner statements; saved reports retain display
and export support. Ownership is not authenticated; statements cannot satisfy
clearance, change verdicts, enter model prompts or teach/persist through H-MEM/Zetaris.
Retirement intent remains supporting context outside the scheduling decision.
See [saved-report retention behavior](HOW.md#open-the-web-demo).

## 9. Test and release acceptance

A runnable demo must prove:
1. First-run candidate discovery and investigation **without prior history**; data mode truthfully labeled.
2. Scenario A defers the external human decision even with complete technical evidence; incomplete evidence names the exact gap.
3. Scenario B evidence-dependent next query and **actual falsification** of an initially plausible window.
4. Scenario C both justified-uptime and missing-evidence outcomes, including a separate unavailable-source test.
5. Scenario D a real Meterless store/retrieve round-trip and a real Zetaris history read/authorized append proof; warm run uses both **without stale evidence becoming current**.
6. Every factual report citation resolves to evidence retrieved in that run. New savings are null; historical calculations remain strictly validated.
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
