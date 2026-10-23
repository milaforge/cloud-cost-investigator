# Cloud Cost Investigator — Execution Plan (Milad + Zayan)

> **Execution-only document.** Event requirements and rubric are recorded in [`RULES.md`](./RULES.md); contributor workflow is in [`../AGENTS.md`](../AGENTS.md). For goals, scope, data semantics, safety, and report format see [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md). Update this checklist as work actually completes; planned items are **not** evidence of completion.

**Hackathon track:** 02 — The Agent That Can Explain Why  
**Scope:** AWS EC2, investigation/recommendation only; no infrastructure changes.  
**Team agreement (Oct 22):** EC2-only MVP, evidence from billing, utilization, inventory and operational changes.  
**Deadline:** October 27, 2026, **23:45 UTC**; target completion on October 26.  
**Active milestone:** Day 2 kickoff — October 23, 2026. The Oct 22 tasks below are prerequisites to verify or carry forward, not claimed completed work. Advance this milestone after recording gate evidence.

## Day 2 kickoff: current evidence and order of work

This is a **static inspection**, not proof that any integration works. No live
provider calls, runtime tests, or credential checks were performed in this review.

| Observed artifact | What it establishes | What remains to prove | Owner |
| --- | --- | --- | --- |
| `package.json`, `notebook.ts`, `src/engine.ts` | TypeScript notebook and H-MEM loader exist | Project-context store/retrieve round-trip and clean-checkout setup | Milad |
| `src/contracts.ts` | Initial request/evidence/report interfaces exist | Runtime validation, comparison/scope fields, observation statuses, hypotheses and traces | Both |
| `src/tools/zetaris.ts`, `src/test-zetaris.ts` | SQL connectivity helper and probe script exist | Actual connectivity, four allowlisted tools, typed observations and fixture datasets | Zayan |
| `src/llm.ts` | Starter retrieval and optional Anthropic answer path exist | Approved investigation-model call, NVIDIA contribution, and bounded planner/evaluator behavior | Milad |
| `README.md` | Starter notebook instructions exist | Project-specific install, investigation, evaluation, provenance and limitations | Milad |

The generic SQL helper is connectivity scaffolding, not an agent-facing tool.
The optional starter model path is not proof of approved model access.

Work in this order, closing unfinished Day 1 prerequisites as part of Day 2:

1. **Both:** settle the runtime data contract and minimal labeled fixtures; reuse
   TypeScript/Node.js and H-MEM rather than starting a second implementation.
2. **Zayan:** prove read-only Zetaris access and all four allowlisted operations
   against those fixtures. **Milad:** prove one approved model call and a
   project-context Meterless store → retrieve round-trip.
3. **Milad:** connect the bounded planner/executor/evaluator to those tools; the
   second query must depend on evidence from the first, with a recorded trace.
4. **Both:** run scenario A and an unavailable/partial-source path; validate
   evidence references, uncertainty, bounds, and the JSON report.
5. Record runnable commands and outcomes below. Carry blockers with owners and
   next actions; a local fixture fallback keeps development moving but does not
   satisfy the real Zetaris integration gate.

### Verification and blocker log

Append a row after each actual check; include date, reproducible command, result,
`fixture`/`live`/`stub` mode, and owner. Sanitize commands and output; never include
keys, tokens, private endpoints, or sensitive account data. Do not mark a milestone
complete from this static review.

| Date | Gate or integration | Command / evidence | Mode | Result or blocker | Owner / next action |
| --- | --- | --- | --- | --- | --- |
| 2026-10-23 | Day 2 kickoff | Static source inspection listed above | Not executed | Runtime gates unverified | Milad + Zayan: execute prerequisites and Day 2 gate |

## 1. Owners and interfaces

| Area | Driver | Deliverable |
| --- | --- | --- |
| **Data sources, Zetaris, datasets** | **Zayan** | Read-only access to billing, metrics, inventory and changes with stable typed responses and evidence IDs |
| **Agent orchestration, Nemotron, Meterless** | **Milad** | Working bounded planner–executor–evaluator loop, memory integration, report generation and decision trace |
| **Interface contract + integration tests** | **Both** | Agreed query semantics, representative fixture records and an end-to-end investigation |
| **UI + submission/docs** | **Milad** (Zayan reviews data accuracy) | Minimal trace/report viewer, README, evaluation results, slides and demo video |
| **Scenario quality and safe recommendations** | **Both** | Cases A/B/C with ground-truth expectation and audited evidence |

**Do not block on unconfigured production AWS.** Use explicitly labeled reproducible fixture data through Zetaris first, then substitute real read-only data only if credentials and billing coverage permit.

### Shared API/data handoff (agree before parallel implementation)

```text
get_cost_change(period_a, period_b, filter)
get_instance_metrics(instance_id, window)
get_instance_inventory(instance_id)
get_instance_changes(instance_id, window)
```

Each returns `status` (`ok`, `no_match`, `partial`, `unavailable`, `error`), `source`, `data`, `evidence_ids`, `observed_at/period`, and coverage/missing-data indicators. **Never treat an empty dataset, missing source, or query failure as proof that there are no dependencies.** Use consistent `(account_id, region, instance_id)` identifiers and UTC timestamps. Keep mock/live providers interchangeable.

## 2. Day-by-day plan

### Day 1 — Thu, Oct 22: scope + skeleton (verify/catch up on Oct 23)

**Milad**
- [ ] Create repository, minimal TypeScript/Node.js investigation CLI using the existing starter and `README.md` run instructions.
- [ ] Confirm Track 02, engineer persona, EC2-only scope and structured report contract.
- [ ] Verify the approved model endpoint/access (prefer Nemotron) and make **one real model call** (log endpoint/model used; no secrets).
- [ ] Verify Meterless setup and a **store → retrieve** context round-trip.
- [ ] Implement minimal `planner → tool call → evaluator → finish/replan` loop using a fixture tool.
- [ ] Define runtime-validated JSON contracts (TypeScript types alone are insufficient) for actions, observations, evidence, findings and traces.

**Zayan**
- [ ] Verify Zetaris environment, authentication and supported query interface.
- [ ] Create or expose inventory and billing fixture datasets as distinct sources.
- [ ] Prove a Zetaris query can retrieve/join relevant records; return stable IDs and provenance.
- [ ] Share a tiny sample response and agreed tool interfaces with Milad.

**Joint gate:** One investigation request results in at least one real tool observation and a structured, non-fabricated response. Record which integrations are **real** and which are **stubbed**.

### Day 2 — Fri, Oct 23: data integration + first working investigation

**Milad**
- [ ] Replace fixture stub with Zayan's Zetaris-backed allowlisted tools.
- [ ] Add bounded execution (`max_steps`, tool timeouts, retry cap, error statuses).
- [ ] Make the agent choose a second query based on findings from its first result.
- [ ] Emit an evidence-backed JSON report, preserving retrieved evidence IDs.

**Zayan**
- [ ] Add `ec2_metrics` with meaningful off-hours and peak behavior.
- [ ] Add `ec2_changes` including a scheduled-job/deployment record for the unsafe case.
- [ ] Implement/test all four query operations against fixtures via Zetaris.
- [ ] Verify costs, currencies, UTC timestamps, resource IDs, coverage and missing fields.

**Joint gate:** Scenario A runs from the CLI through real Zetaris queries over
labeled data to a validated JSON report **with assumptions, citations and missing
checks**. A second tool choice depends on earlier evidence and appears in the
trace. Verify an approved model call and a Meterless context round-trip, including
any unfinished Day 1 prerequisites. An unavailable/partial-source run terminates
within configured budgets with explicit uncertainty and no invented savings.
Record commands, integration modes and results. Integration blockers have owners
and next actions; incomplete sponsor access keeps the gate open.

### Days 3–4 — Sat–Sun, Oct 24–25: reasoning quality + evaluation

**Milad**
- [ ] Implement evaluator feedback and explicit hypothesis statuses: proposed/supported/contradicted/unresolved.
- [ ] Demonstrate replanning: a plausible initial stop/downsize hypothesis is **rejected** after contradictory evidence.
- [ ] Persist/resume investigation state with Meterless; mark historical context separately from fresh evidence.
- [ ] Deterministically calculate estimated savings only when cost/pricing and schedule data justify them; otherwise return `null` in `estimated_monthly_savings` (or its agreed typed equivalent).
- [ ] Add trace logs recording plan, tool action, outcome, evaluation and revision.
- [ ] Implement missing-data behavior, tool retries and graceful bounded termination.

**Zayan**
- [ ] Finalize the three independent, labeled incident fixtures with explicit expected outcomes:
  - A: feasible off-hours savings (with checks)
  - B: unsafe optimization despite deceptively low average utilization
  - C: increase justified by workload/capacity needs
- [ ] Add an intentional partial-source or failed-query scenario.
- [ ] Validate queries against all fixtures, including joins and provenance.
- [ ] Check how EC2 compute, EBS, reservations/Savings Plans affect claims in outputs.

**Joint gate:** The agent produces the expected disposition on A, B and C; case B includes a **visible hypothesis revision**. Verify every cited evidence ID exists. Record failures honestly.

### Day 5 — Mon, Oct 26: freeze, demo, submission assets

**Milad**
- [ ] Prepare a readable CLI trace for the demo: question → evidence retrieved → revised hypothesis → final report. Add a UI/viewer only if core gates pass and time remains.
- [ ] Add clean install/run commands, `.env.example`, fixture seed, example investigation command and tests.
- [ ] Prepare slide deck and record a **1–4 minute** demo showing case B prominently.
- [ ] Document architecture, constraints, benchmark, safety choices and precise sponsor-tech usage.

**Zayan**
- [ ] Review demo data for coherence; confirm all presented savings numbers are reproducible or clearly illustrative.
- [ ] Ensure Zetaris setup instructions and sample queries work from scratch.
- [ ] Validate sources, expected fixture outcomes and permissions; remove any secrets/personal data.
- [ ] Run end-to-end tests independently on a fresh checkout/environment.

**Joint gate:** A fresh checkout reproduces the demo without manual database fixes; submission assets exist and reflect **working** behavior.

### Day 6 — Tue, Oct 27: contingency + submission

**Milad**
- [ ] Verify demo video, slides, public repo/README and required submission fields.
- [ ] Explicitly declare reused or pre-existing components if the event requires it.
- [ ] Submit **before 23:45 UTC**, preferably well ahead of deadline.

**Zayan**
- [ ] Re-run scenarios and integrity checks; help fix only blocking defects.
- [ ] Verify sponsor connections and data-source reproducibility.

**Joint gate:** Submission confirmed; avoid late architectural changes.

## 3. Integration contract: minimum end-to-end slice

First demonstration question:

> "Which EC2 resources explain the spending increase, and can any cost be reduced safely?"

Expected operation:

1. Planner asks for a cost delta (with comparison period).
2. Tool returns cost driver(s), source period and evidence IDs.
3. Planner chooses an instance, retrieves utilization and inventory; evaluator detects a risk/knowledge gap.
4. Agent retrieves change/schedule evidence and revises or qualifies its hypothesis.
5. Report states cost driver, recommendation or refusal, assumptions, risks, missing checks and cited evidence.
6. Meterless persists context; trace demonstrates why actions were chosen.

### Must-have schema checks

- Each observation references a real retrieval source, timestamp/period and immutable evidence ID.
- Every recommendation cites supporting evidence. Rejected recommendations cite contradictions.
- Savings estimate uses deterministic arithmetic and clearly identifies applicable cost components.
- `error`, `unavailable`, `partial`, `no_match` remain distinguishable.
- A safety-gated conclusion can be `needs_verification`; do not force a positive savings recommendation.

## 4. Testing plan

| Test | Expected behavior | Driver |
| --- | --- | --- |
| A: 24/7 dev server | Conditional scheduling recommendation, quantified where justified | Both |
| B: low average CPU + weekly critical batch | Agent tests and **rejects/defer** unsafe downsize/stop suggestion | Both |
| C: intended capacity expansion | Explanation of justified expense, not false waste flag | Both |
| Missing metrics/job data | `needs_verification`, no assertion that unknown dependency is absent | Milad |
| Zetaris timeout/unavailable | Bounded retry, partial report, explicit source failure | Both |
| Tool returns contradictory periods/IDs | Detect mismatch instead of combining unrelated evidence | Zayan |
| Memory contains old finding | Agent treats it as historical context and rechecks current evidence | Milad |
| Duplicate model/tool loop | Stops within budgets and explains incomplete result | Milad |
| Baseline: low-CPU rule | Document where it over-recommends vs risk-aware agent | Both |

**Evidence for judges:** a working invocation, a readable trace of at least one replan, verified citations, test results, and honest failure cases. Metrics to report: scenario accuracy, evidence validity, unsafe-recommendation false positives, run duration and tool calls. Only use measured numbers.

## 5. Operational workflow between Milad and Zayan

- **Daily contract-first sync:** announce any schema changes before changing tool responses; share representative examples and expected results.
- **One code owner per layer, shared integration review:** Zayan owns source correctness; Milad owns decision/report correctness.
- **Continuous integration:** merge the thinnest working path each day instead of keeping two large isolated branches.
- **Blocker escalation:** if a sponsor SDK/endpoint fails, capture exact request/error and create a fixture-backed adapter; do not falsely represent a stub as a live integration. Restore the required real integration before submission.
- **Feature triage order:** sponsor integrations → reliable agent loop → falsification demo and scenario evaluation → trace UI → visual polish. Add focused tests and failure handling with each slice. Cut unrelated features first.

## 6. Release checklist

- [ ] End-to-end data path actually traverses **Zetaris**.
- [ ] **Meterless** actually stores/retrieves project-relevant investigation context.
- [ ] An approved model call is verified; NVIDIA model/technology usage is genuine and documented, with no invented API claims.
- [ ] Cursor usage is documented accurately.
- [ ] At least one autonomous, evidence-driven **re-plan after contradiction** is visible.
- [ ] All recommendations cite evidence, disclose uncertainty, and never change AWS resources.
- [ ] Three fixtures, their expected outcomes, and a missing-source/failure path run reproducibly.
- [ ] Low-CPU baseline comparison and measured evaluation (disposition, citation validity, unsafe recommendations, duration, tool calls, and available call-cost data) are recorded; unavailable measurements are identified.
- [ ] No secrets or sensitive AWS exports in the public repository.
- [ ] `README.md`, clean-run commands, slides, and 1–4 minute demo video are ready.
- [ ] Deadline and portal requirements verified; submission completed.

## 7. Cut list if behind schedule

Cut **multi-cloud, Kubernetes, automated remediation, auth/roles, fancy dashboards, complex multi-agent orchestration, forecasting, live AWS onboarding, and elaborate reports**. Keep the three scenarios, real sponsor integrations, adaptive investigation, provenance and safety evaluation. A reliable CLI plus readable trace can be a better submission than an unfinished dashboard.

## 8. Suggested commits (optional)

- `chore: bootstrap cloud cost investigator and typed interfaces`
- `feat(data): federate EC2 evidence through Zetaris`
- `feat(agent): implement bounded investigation loop`
- `feat(agent): validate evidence and revise unsafe hypotheses`
- `test: cover safe unsafe and justified cost scenarios`
- `docs: finalize reproducible demo and submission`
