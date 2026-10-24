# Cloud Cost Investigator — Execution Plan (Milad + Zayan)

> **Sole execution tracker.** Event requirements are recorded in [`RULES.md`](./RULES.md); approved product and safety contracts are in [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md); agent workflow in [`../AGENTS.md`](../AGENTS.md). A task is complete only with executed evidence. Preserve the distinction between team decisions, planned work, mocks and verified live integrations.

**Hackathon track:** 02 — The Agent That Can Explain Why.  
**Approved scope (2026-10-23):** AWS EC2 off-hours scheduling safety; direct current-evidence tools; Zetaris structured history; Meterless reasoning memory; no infrastructure modification. The older cost-increase/snapshot-comparison workflow is superseded.  
**Deadline:** 2026-10-27 23:45 UTC in recorded event notes; verify portal. Target freeze: Oct 26.  
**Active milestone:** Day 2 kickoff, Fri Oct 23, 2026. Do not advance from this checkpoint based on elapsed time or this documentation revision.

## 1. Decision change and current verification state

### Retained provider HTTP error bodies — 2026-10-24

**Gate/owner:** Milad, user-requested diagnosis of repeated HTTP 500 responses.

- [x] Capture a bounded sanitized error-body excerpt in typed model HTTP errors;
  carry optional `provider_error: { body, truncated }` through validated runner
  traces, readable reports, evaluation `planner_failures` and verbose stderr.
  Existing HTTP codes, completion behavior and older reports remain compatible.
- [x] JSON diagnostic fields are allowlisted; request/header/stack objects are
  omitted. Configured credentials/scope, common credential patterns, URLs, paths
  and terminal control characters are redacted. Reads stop at 8192 bytes or one
  second; retained excerpts are capped at 2048 characters. Empty/unreadable bodies
  are explicit, without changing the HTTP code or retrying the request.
- **Proof:** `npm test`: **145/145 passed**, including mocked JSON/plain-text/
  HTML/malformed/oversized/stalled bodies, cancellation, secret redaction,
  report/evaluation propagation, invalid diagnostic placement and compatibility.
  `npm run typecheck`, scoped Biome lint (`src scripts tests cli.ts`) and
  `git diff --check`: **passed**. A warm-demo failure fixture was updated to
  distinguish retained safe error text from an omitted private request object.
- **Limit/next action:** no new live provider request made for this implementation.
  Run the existing single-case verbose evaluation to capture the next actual
  provider failure; previously discarded error bodies cannot be recovered.

The Oct 23 MVP discovery approved four shared-engine flows: A supported off-hours opportunity, B an evidence-driven rejected scheduling hypothesis, C justified continuous operation or needs verification, and D a later run using both historical stores with **fresh** operational verification. First run must not require either a historical baseline or prior memory. There is no cost-increase-comparison prerequisite.

**Corrected source ownership:** Zayan is building direct TypeScript evidence adapters (mock first, live later) for inventory, billing, utilization, operations/jobs and dependencies. Zetaris is for querying/storing compact structured investigation **history**, not fetching the current EC2 facts. Meterless H-MEM stores/retrieves reasoning-oriented historical summaries. Narrowly scoped Zetaris history appends have team approval in principle; they require least-privilege implementation and runnable proof. AWS and current-evidence tools remain strictly read-only.

**Existing static evidence only, as of the earlier Oct 23 inspection:**

| Artifact                                       | Establishes                                                | Does **not** establish                                                                        | Owner |
| ---------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----- |
| `package.json`, `notebook.ts`, `src/engine.ts` | TypeScript starter and H-MEM loader are present            | Approved agent memory store/retrieve round-trip or investigation CLI                          | Milad |
| `src/contracts.ts`                             | Preliminary instance-scoped request/evidence/report shapes | Candidate-discovery contract or runtime validation                                            | Both  |
| `src/tools/zetaris.ts`, `src/test-zetaris.ts`  | Generic SQL connectivity scaffolding and probe             | Historical table read/write, least-privilege role, supported append path, or real integration | Zayan |
| `src/llm.ts`                                   | Optional starter answer path                               | Approved model/NVIDIA call, bounded investigation loop                                        | Milad |
| `README.md`                                    | Notebook instructions                                      | Reproducible EC2 investigation                                                                | Milad |
| `plan.md`                                      | Approved contradiction-first implementation slice          | Executed completion by itself; see proof below                                                | Both  |

**Earlier inspection had not verified:** live API calls for any of the five direct categories; historical read and append via Zetaris; H-MEM project round-trip; approved model call; CLI test execution. New executed evidence is recorded below. Team-reported prior Zetaris data availability does not verify the newly planned direct adapters. Never mark any of these complete from a written plan.

### Learned operational check: cold, warm and changed evidence — 2026-10-24

**Gate/owner:** Milad, stronger D demonstration. Acceptance: a prior C
investigation teaches a specific check, warm C retrieves real H-MEM state and
reaches the same correct rejection with fewer calls, then changed A rechecks and
abandons the old rejection using fresh complete evidence. Isolate H-MEM from
Zetaris to attribute the improvement. Keep AWS evidence explicitly synthetic.

- [x] Optional typed lesson is learned only from a validated report's cited,
  authoritative contradiction. Stores check, UTC window and historical evidence
  reference. Planner hints exclude historical evidence IDs and free-form text.
- [x] Recall is scoped to account/region/instance/evidence mode, excludes future
  records and activates the newest eligible summary. Window-mismatched lessons
  cannot influence planner choices. Old records remain auditable; legacy
  summaries without lessons still validate.
- [x] Fresh recheck is traced as confirmed, not_observed or unresolved with
  current evidence citations. Existing evaluator alone controls the verdict.
  Updated summary after changed A supersedes the old conflict in later recall.
- [x] `npm run demo:warm` provides readable results; `--planner model --json`
  provides live planning with stderr progress and a final full JSON artifact.
  Real H-MEM is reopened between phases, temporary storage is removed, remote
  history is disabled, and any model failure remains a failed measured phase.
- [x] `npm test`: **140/140 passed**. Coverage includes end-to-end disk recall,
  one fewer planner/tool call, changed-evidence correction, unknown/partial/
  non-authoritative evidence, future and source-mode separation, malformed
  lessons, historical provenance, window scope, old summaries, and HTTP failure
  without fallback. `npm run typecheck`, scoped Biome lint (`src scripts tests
  cli.ts`), and `git diff --check`: **passed**.
- [x] `npm run --silent demo:warm -- --json > /tmp/cci-warm-scripted.json`:
  exit **0**, real vendored H-MEM / scripted planner / mock evidence. Cold C:
  **6 planner / 5 tools / 10 ms**; warm C: **5 / 4 / 6 ms**, both complete
  rejections. Changed A: **6 / 5 / 2 ms**, complete conditional recommendation.
  All 15 acceptance checks passed. Timings are a tiny local fixture sample,
  not production performance evidence.
- [x] **Live cold/warm behavior:** `npm run --silent demo:warm -- --planner
  model --json` with network access, configured
  `nvidia/nemotron-3.5-super-vl-120b-a12b`, five-second pacing and existing
  300000 ms per-call limit. Cold C: **6 planner / 5 tools / 148001 ms**;
  warm C: **5 / 4 / 55200 ms**, both complete evidence-backed rejections.
  Warm retrieved the cold H-MEM lesson and checked dependencies first.
  One fewer planner call (**16.7%**) and one fewer tool (**20%**); the measured
  92801 ms latency reduction is a single pair subject to provider variability.
  Changed A then received **model_http_500 on call 3**, correctly returned partial
  needs_verification, and made the overall command exit **1**. Full unmodified
  failed measurement: [warm-learning-model-attempt1.json](./warm-learning-model-attempt1.json).
- [x] **Live changed-evidence recovery:** an explicit isolated replay restored
  summaries from those two validated successful reports into temporary real
  H-MEM and used the same model and pacing. The first replay completed with
  a conditional recommendation in **84528 ms**, but its cross-process
  disjoint-ID check failed because the mock provider restarted a numeric counter.
  Retained as [warm-learning-recovery-id-failure.json](./warm-learning-recovery-id-failure.json).
  Mock observations now use UUIDs; two separate Node processes verified distinct
  IDs. A second explicitly recorded replay (`node --import tsx
  /tmp/cci-recover-changed.mts`) passed **9/9 checks**: **6 planner / 5 tools /
  88187 ms**, complete conditional recommendation, fresh dependency-first
  recheck then operational clearance, no old contradiction citation, distinct
  current IDs, and a persisted correction that supersedes the older lesson.
  Evidence: [warm-learning-model-recovery.json](./warm-learning-model-recovery.json).
  No model fallback, automatic retry, prompt change between attempts or remote
  write. This is a recovered phase, not a successful uninterrupted three-run command.
- Initial restricted-network attempt returned `model_transport_unavailable`
  on cold call 1 (5027 ms including pacing); retained in
  [warm-learning-transport-failure.json](./warm-learning-transport-failure.json).
  Scripted full proof: [warm-learning-scripted.json](./warm-learning-scripted.json).
  All retained reports and summaries pass runtime validation. Final source:
  **140/140 tests**, typecheck, scoped lint/format and whitespace checks passed;
  readable `npm run --silent demo:warm` passed after the UUID fix as well.

**Commit verification (Oct 24):** exported the staged enhancement separately
from unrelated provider-diagnostic work. `npm test`: **140/140 passed**;
`npm run typecheck`, `npx biome lint src scripts tests cli.ts`, and
`npm run --silent demo:warm`: **passed** (all 15 demo checks).
Runtime validation passed for all **12 retained investigation reports** across
six evidence artifacts. `git diff --cached --check`: passed. The full concurrent
worktree separately passed 145 tests. No additional live inference was run.

**Additional user-run evidence (Oct 24):** inspected `warm-learning.json` and
retained it as [warm-learning-user-model.json](./warm-learning-user-model.json).
The artifact records `gpt-6.1-sol`: cold complete rejection, 6 planner / 5 tools /
49656 ms; warm complete rejection, 5 / 4 / 39336 ms. Savings: one planner call,
one tool call, 10320 ms (20.8%) in this pair, including five-second call pacing.
Changed phase stopped on call 5 with `model_transport_unavailable`, partial
`needs_verification`, 47512 ms. Overall `passed: false`; no new live call was
made to document this evidence. This is not NVIDIA proof or an uninterrupted
three-phase live pass. Owner: Milad. Next action: complete a live three-phase
run when provider access is reliable; live AWS integration remains separate.

**Boundary:** no live AWS integration, production generalization, new roles,
graph or remote schema changes. The separate `probe:warm` still verifies both
stores; B now rechecks its learned job conflict first. Earlier dependency-first
proofs below remain historical measurements, not current expected behavior.
The stronger learned-check goal is satisfied through the complete offline proof
and recorded live cold/warm plus changed-phase recovery. Endpoint reliability
and live direct-evidence integration remain separate open work.

### Repeated fourth-call HTTP 500 investigation — 2026-10-24

**Gate/owner:** Milad, explain the user's repeated `missing` failures after
metrics retrieval. `evaluation-C.json` actually selects `missing`; its filename
does not select scenario C. The recorded failure is planner call 4 / trace step 8.

- Offline single-case scripted evaluation passed its gate: seven planner calls,
  expected `needs_verification`, partial completion and no planner errors.
  Output: `/tmp/cci-missing-scripted-diagnosis.json`. Missing-source fixture data
  itself does not fail local validation or the scripted workflow.
- Reconstructed the fourth-call logical state with three validated synthetic
  observations using the normal scripted planner/executor. At this point model
  choices are `propose` or `finish`; missing jobs are not queried yet.
- `node --import tsx /tmp/cci-isolate-fourth-call.mjs`: one live request after a
  15-second pause, unchanged configured model/format/options. HTTP **200**,
  **3108 ms**, valid **propose** action using
  `nvidia/nemotron-3.5-super-vl-120b-a12b`, text response format. Result:
  `/tmp/cci-fourth-call-result.json`. The conditional comparison with thinking
  disabled was **not executed**, because the unchanged request succeeded.
- **Conclusion/limit:** no deterministic fourth-state or fixture failure was
  reproduced. The user's 500 occurred about 0.9 seconds into the request, before
  the five-minute deadline. Provider/gateway failure remains established only
  at HTTP-status level; overload, rate limits, reasoning settings or internal
  backend faults are unproven. Logical-state reconstruction does not preserve
  original timestamps/request bytes or provider conditions. Exact cause requires
  diagnostic detail from a failing HTTP response or provider-side logs.
  No product code, credentials or model configuration changed for this diagnosis.

### Isolated third planner-call diagnosis — 2026-10-24

**Gate/owner:** Milad, investigate the user's `missing` run: inventory and billing
succeeded, then planner call 3 returned HTTP 500 after about three seconds.

- Reconstructed the checkpoint using the existing scripted planner, validated
  mock inventory/billing tools and normal candidate selection. No live model was
  used for the first two steps; no jobs or dependency evidence was present yet.
  This recreates the logical state, not the original timestamped request bytes.
- `node --import tsx /tmp/cci-isolate-third-call.mjs`: after one 15-second pause,
  made **exactly one** live planner request with a 300000 ms deadline. Configured
  `nvidia/nemotron-3.5-super-vl-120b-a12b` succeeded in **4305 ms**, choosing
  **get_ec2_metrics**. Output: `/tmp/cci-third-call-result.json`. No AWS/history
  writes and no raw provider output or credentials retained.
- Offline comparison of reconstructed `missing`, B and C checkpoint evidence
  matched after excluding collection timestamps and generated evidence IDs.
  The initial comparison excluded timestamps only and differed by generated IDs;
  the result artifact includes the normalized comparison and explanation.
- **Conclusion/limit:** the isolated third-call state can succeed. No reproducible
  scenario-specific defect was established; neither transient provider failure
  nor overload can be proven from the earlier HTTP 500. This is one planner-call
  proof, not a completed investigation or a claim of endpoint reliability.
  No product code or model configuration was changed for this diagnosis.

### Slow single-case diagnostics — 2026-10-24

**Gate/owner:** Milad, user-requested free-endpoint diagnostics following HTTP
500s in the user's evaluation. Overload remains a hypothesis, not a finding.

- [x] New live calls allow **300000 ms** in both runner and HTTP adapter.
  Aggregate live budget includes bounded calls × (timeout + pacing) plus a
  two-minute reserve; explicit shorter deadlines still apply. Tool timeouts,
  planner-call caps, evidence/safety handling and scripted defaults are preserved.
- [x] `--case missing` selects just one case with one-case denominators.
  `--delay-ms` accepts 0–60000; live evaluation defaults to a **5000 ms** pause
  before each call, including the first call of every case. Cases/calls remain
  sequential. No automatic retry, fallback, model or credential changes.
- [x] README documents selected cases, pacing, longer worst-case runtime and
  the difference between pending-request timeout and immediate HTTP 500.
  Result metadata records selected cases, pacing and planner timeout.
- **Offline proof:** `npm test`: **133/133 passed**. Includes simulated response
  beyond the old aggregate deadline, five-minute runner/adapter deadlines, pacing
  constrained by aggregate budget, selection denominators and invalid arguments.
  `npm run typecheck`, scoped Biome lint (`src scripts tests cli.ts`), and
  `git diff --check`: **passed**.
- **Live attempt:** `npm run --silent evaluate -- --planner model --case missing
  --verbose > /tmp/cci-evaluation-missing-slow.json`: exit **1**, five-second
  pacing, one attempted model call, **model_transport_unavailable**, no tool
  calls, no HTTP response recorded. A network-enabled attempt saved separately
  to `/tmp/cci-evaluation-missing-slow-network.json` also exited **1** with
  **model_transport_unavailable** after approximately 10.5 seconds in the call
  (15.5 seconds including pacing). These attempts predate the added JSON timeout
  metadata; verbose output confirmed **300000 ms**. No AWS/history writes.
- **Blocker/next action:** this environment's transport failures prevent testing
  whether paced requests fix the user's earlier HTTP 500s. Run one selected case
  from the user's working environment and retain each result; a returned 500
  still ends immediately. Do not infer overload or that inference ran from it.

### Visible evaluation progress — 2026-10-24

**Gate/owner:** Milad, evaluation usability. Final JSON remains a single stdout
document; optional progress must appear before waiting for the model, without
exposing provider data or changing investigation behavior.

- [x] `--verbose` reports elapsed time, case index, baseline, planner call and
  bounded timeout, tool/trace steps, safe failure codes and per-case completion
  on stderr. Both flag orders work. Default output stays quiet until final JSON.
- [x] README explains why the redirected file stays empty during execution and
  provides the verbose command. Runner progress contains selected metadata only,
  with no model reasons, source payloads, scope, credentials or endpoints.
- **Proof:** `npm test`: **130/130 passed**, including pending mocked model-call
  visibility, HTTP failure redaction, CLI argument validation, quiet default and
  separate JSON/progress streams. `npm run typecheck`, scoped Biome lint of
  `src scripts tests cli.ts`, and `git diff --check`: **passed**.
- **CLI proof:** `npm run --silent evaluate -- --planner scripted --verbose
  > /tmp/cci-progress-evaluation.json 2> /tmp/cci-progress-evaluation.log`:
  exit **0**, stdout parsed as JSON, **8/8** labels, **4 complete / 4 partial**,
  no planner failures; stderr held progress from startup through all eight cases.
- **Limit/next action:** no new live-model run; model progress tested using mocked
  HTTP failures. User can run the documented model command to watch live calls.
  Existing deadlines, scoring, evidence modes and history boundaries are unchanged.

### Sanitized failure diagnostics and separate execution metrics — 2026-10-24

**Gate/owner:** Milad, focused model-evaluation diagnostics. Preserve the selected
model, request limits, safety evaluator, completion labels and history boundaries.

- [x] Optional runtime-validated `trace[].failure_code` distinguishes bounded
  planner timeout, aggregate deadline, invalid executor action, recognized model
  errors and unknown failures. HTTP status diagnostics retain only a three-digit
  status, never provider text. Readable reports display the same safe code;
  historical reports without it still validate. Failure codes are restricted to
  actionless planner entries, not tool/success entries.
- [x] Model adapter distinguishes malformed JSON from an invalid parsed choice,
  and native deadline/caller cancellation from generic transport errors, including
  cancellation while reading the response body. No retries, fallback, timeout
  increases, prompt changes or new dependencies.
- [x] Evaluation now separately reports complete/partial/failed counts, cases
  with planner errors, incidental matching labels after errors and code counts;
  each case records error step/code. A planner error makes the command fail even
  if its resulting deferral label happens to match. Correct deferrals without
  planner errors remain partial and can pass evaluation.

**Executed proof:**

- `npm test`: **128/128 passed**. Focused new tests cover HTTP 400/401/403/405/
  429/500/503, transport failure, malformed envelope/JSON, incomplete output,
  invalid choice/executor action, caller/native/orchestrator/aggregate timeouts,
  unknown exception redaction, forged diagnostic fields, old-report compatibility,
  readable trace output and failure-aware evaluation gating. Mock transport only.
- `npm run typecheck`: **passed**. `node_modules/.bin/biome lint src scripts
  tests cli.ts`: **passed**. Initial whole-repository `npm run lint` also found
  a separate concurrently created empty root `evaluation-model.json`; that file
  was not created or modified by this task. A new test import-style warning was
  corrected; scoped source lint then passed.
- `npm run --silent evaluate > /tmp/cci-evaluation-scripted-diagnostics.json`:
  exit **0**, mock/scripted, **8/8** labels, **4 complete / 4 partial / 0 failed**,
  **0** planner-failure cases, **0** matching labels after planner failure and an
  empty code-count map. Preserves honest partial statuses for correct deferrals.
- `NODE_TLS_REJECT_UNAUTHORIZED=1 npm run --silent evaluate -- --planner model
  > /tmp/cci-evaluation-model-diagnostics.json`: exit **1**, a new diagnostic
  measurement, not a replacement for the earlier run. Saved separately as
  [`evaluation-model-diagnostics.json`](./evaluation-model-diagnostics.json).
  Real configured NVIDIA model / mock current AWS evidence / history disabled.
  **6/8** matching dispositions, **2 complete / 6 partial / 0 failed**;
  **3** planner-failure cases, all **`planner_timeout`**, and **1** matching
  deferral despite planner failure. C (trace step 12), clear-without-authority
  (step 14) and unknown commitments (step 8) exhausted the existing **15-second
  per-planner-call wait**. No HTTP error code was recorded in this measurement;
  this does not retrospectively diagnose older failures. A and B completed;
  missing and partial operations deferred without planner errors; high peaks
  were blocked as `unsupported_hypothesis`. **0/3** unsafe and **0/3** unknown-
  safety positives, **35/35** valid current references. **308972 ms** total,
  **46** planner calls and **34** current-tool attempts. Cost remains **null**.
  No retry to replace these failures and no timeout/prompt/model changes.
  This proves diagnostic capture, not reliable completion across all fixtures.

**Limit:** historical generic planner failures still have unknown exact causes;
new codes diagnose new runs only. The existing designed fixture set does not
establish production reliability. Diagnostic acceptance is satisfied; next
reliability work should assess model-call latency against the per-call and total
budgets using this evidence. No infrastructure or historical schema was changed.

### Successful real-model access retry and warm proof — 2026-10-24

**Gate/owner:** Milad, real-model D proof. User requested a retry after HTTP 403.
No model, credential, endpoint or TLS configuration was changed by the agent.
The earlier refusal no longer reproduces; its source/cause is undetermined.
This supersedes the model-access blocker below, retaining the failed attempts
as historical evidence. Team approval of the selected model remains confirmed.

- [x] `NODE_TLS_REJECT_UNAUTHORIZED=1 npm run test:integration`: exit **0**,
  **1/1 passed**, configured real model returned a validated action, **8816 ms**.
- [x] `NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:warm -- --planner model`:
  exit **0**, real NVIDIA-hosted `nvidia/nemotron-3-ultra-550b-a55b`, actual
  remote Zetaris and vendored local H-MEM, **mock current AWS evidence**.
  Cold run `5b01a6fd-c796-476c-ac11-22f7e125ed12`: **24188 ms**, five model
  calls, four tool attempts, zero recalled records; operations queried first.
  Warm run `68a34814-f1a4-421f-a0ae-f71222545faf`: **34390 ms**, six model
  calls, five tool attempts, one record recalled from each store; dependencies
  queried before operations. Both reject the window based on fresh operational
  evidence, respectively `mock-ec2-evidence-4` and `mock-ec2-evidence-9`.
  Runtime report validation and disjoint current-evidence IDs passed. Both
  stores succeeded on both runs, each Zetaris append had exact readback, and
  both H-MEM summaries were stored. Two synthetic history rows retained;
  temporary memory directory removed. No live AWS or pricing proof implied.
- [x] `NODE_TLS_REJECT_UNAUTHORIZED=1 npm run --silent evaluate -- --planner
  model > /tmp/cci-evaluation-model.json`: completed, exit **1** because three
  expected dispositions were missed; all eight cases retained. Measured artifact
  copied to [`evaluation-model.json`](./evaluation-model.json). Real selected
  model / mock AWS evidence / history disabled. **5/8** matching dispositions,
  **0/3** known-unsafe positives and **0/3** unknown-safety positives, versus
  CPU heuristic **2/8**, **3/3**, **3/3**. Candidate/hypothesis current references
  **25/25 valid**, all reports runtime-validated. Total investigation time
  **252264 ms**, range **21229–55948 ms**, **26** current-tool attempts and
  **36** planner calls; heuristic **1 ms**, **24** attempts, no model calls.
  Model cost remains **null** (usage/billing not captured).
  **Only 1/8 investigations completed; 7/8 were partial.** Five cases stopped
  with `planner_unavailable_or_invalid` (B, C, clear-without-authority, partial
  operations, unknown commitments). B and C deferred instead of discovering
  rejection; unknown commitments produced no candidate. Two of these planner
  failures still match expected `needs_verification` dispositions, so **5/8
  matching dispositions is not a 5/8 successful-investigation rate**. Missing
  operations finished partial; high peaks were safely blocked as
  `unsupported_hypothesis`. A completed with the synthetic USD 75 estimate.
  No repeated evaluation to replace failures; precise planner-error causes
  are not captured by this report. Isolated HTTP 403 was not diagnosed as their
  cause. Designed fixtures and one trial per case do not establish production
  accuracy or model superiority over a safety-aware rule-based engine.

**Next action:** diagnose the five planner failures with sanitized error codes
before claiming reliable model behavior across A/B/C. Warm D and the requested
measured comparison are now recorded; combined sponsor/release gates remain
open for live AWS, effective permissions and release assets.

### Measured fixture evaluation and earlier failed real-model warm attempt — 2026-10-24

**Gate/owner:** Milad, Days 3–4 evaluation/model slice; the active milestone and
combined live integration gate remain open.

- [x] Added `npm run evaluate`: eight fixed synthetic cases, independent expected
  dispositions, shared discovery ranking, no history access/writes. Default
  scripted planner measures deterministic safety policy against the agreed
  average-CPU <=10% heuristic. `--planner model` explicitly enables real inference;
  failures never fall back to scripted planning and missing predictions count
  against the full denominator.
- [x] Extended `probe:warm -- --planner model` to use the configured real planner
  through the existing CLI. Reports model/run IDs, timing/calls, current citations,
  both stores, exact append readback and fresh evidence IDs; validates presence
  of dependency/operations queries before comparing their order.
- [x] Real-model cold/warm execution: subsequent retry passed as recorded above.
  The earlier HTTP 403 failure below is retained; live-model evaluation is
  recorded separately from warm sponsor proof.
- [x] Selected-model approval **team-confirmed on Oct 24**: user explicitly
  confirmed `nvidia/nemotron-3-ultra-550b-a55b` is fine in response to the
  event-eligibility question. This closes the team's model-selection blocker;
  it is user confirmation, not independent organizer verification. The earlier
  public-source check was inconclusive. Runtime access is separate and passed
  on the subsequent retry above.

**Executed evidence:**

- `node --import tsx scripts/evaluate.ts > /tmp/cci-evaluation-scripted.json`:
  exit **0**. Sanitized measured result copied to
  [`evaluation-scripted.json`](./evaluation-scripted.json). One run per case:
  A/B/C, unavailable operations, empty jobs without authority, high peak,
  partial operations and unknown commitments. **Mock evidence / scripted policy**.
  Investigation **8/8** correct, **0/3** known-unsafe positives, **0/3** unknown-
  safety positives; CPU heuristic **2/8**, **3/3**, **3/3** respectively. All
  eight investigation reports passed runtime validation; candidate/hypothesis
  citation references **44/44** resolve to current retrieved evidence.
  Investigation total **7 ms**, case range **0–4 ms**, **37** tool attempts,
  **48** planner calls; heuristic total **3 ms**, range **0–1 ms**, **24** tool
  attempts, **0** planner calls. Millisecond resolution and synthetic latency
  make these unsuitable for live performance claims. Model cost **null**;
  no usage/billing captured. This small designed set has no production accuracy
  estimate or statistical confidence claim, and does not prove model superiority.
  D remains the separate two-run sponsor proof.
- `NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:warm -- --planner model`:
  exit **1**, outside network sandbox, configured NVIDIA-hosted model
  `nvidia/nemotron-3-ultra-550b-a55b`. Run
  `d5fc0526-a38e-4ae8-a82d-3ffd9614ef6f`: first planner call failed,
  **417 ms**, **0** tool attempts, both historical services **not queried**,
  **0** appends. Temporary H-MEM directory removed. No second run attempted.
- `NODE_TLS_REJECT_UNAUTHORIZED=1 npm run test:integration`: exit **1**,
  **0/1** passed, sanitized **model_http_403** diagnostic. Config presence was
  checked after `.env` loading; no credential values or private URLs printed.
  TLS remained verified; no alternate models/endpoints or secret-file edits.
- `npm test`: **110/110 passed**, including evaluation denominators, high-peak
  and unknown-data false positives, null savings, forged-citation rejection and
  mocked model-403 failures with no scripted fallback or history access.
  `npm run typecheck`, `npm run lint`: **passed**. Whole-repository
  `npm run format:check` still fails on the **pre-existing** formatting in
  this file and `docs/ZETARIS_HISTORY.md`; unrelated tables preserved.
  Scoped formatting for all eight other changed/new code, JSON and documentation
  files passed, as did `git diff --check`.

**Next action (superseded by retry results above):** real-model fixture evaluation
has now run with failed outcomes retained. No further eligibility input is
required for this work. Live AWS, effective least privilege, broader live
measurements and release materials remain separate gates.

### Broader A/C, three candidates and savings proof — 2026-10-23

**Gate/owner:** Day 2 broader scenario slice, Milad. This extends the existing
bounded loop; active milestone and live-integration gates remain unchanged.

- [x] Synthetic A produces a conditional recommendation only with complete
  authoritative discovery/metrics, both fresh targeted operational challenges,
  matching owner/calendar/recovery clearance and no overlapping jobs or uptime
  constraint. Human approval and revalidation remain explicit.
- [x] Synthetic C rejects a proposed shutdown because fresh dependency evidence
  establishes continuous operation. Missing sources independently defer.
- [x] One shared discovery selects at most three candidates by descending positive
  matching compute spend, ties by instance ID. Identical proposed windows remain
  isolated by instance and metric citations. Later failures preserve earlier
  verdicts; planner/deadline exhaustion explicitly defers remaining candidates.
- [x] Deterministic USD marginal on-demand compute estimate uses the calendar
  month following the observation window, excluded dates, recovery overhead and
  billing-unit rounding. Unsupported pricing/commitments/retained costs/currency
  keep savings null. Final report validation recomputes proof and arithmetic.
- [x] H-MEM and Zetaris summary conversion supports each candidate with isolated
  provenance; actual local H-MEM three-candidate store/retrieve is tested. Remote
  multi-candidate appends and new verdict storage were not exercised live here.

**Executed proof (mock current evidence; no live AWS/model/pricing calls):**

- `npm test`: **107/107 passed**. Adds 29 focused tests covering A/C/mixed,
  clearance/coverage failures, calendar arithmetic including leap February,
  null savings, forged reports, cross-instance citations, later-source failure,
  aggregate planner/runtime exhaustion, local multi-candidate memory and mocked
  model transport. Existing warm sponsor/failure regressions pass offline.
- `npm run typecheck` and `npm run lint`: passed. `git diff --check`: passed.
- `HMEM_PERSIST_DIR= ZETARIS_HISTORY_TABLE= ZETARIS_HISTORY_ALLOW_APPEND=false node --import tsx cli.ts investigate --account demo --region us-east-1 --scenario mixed --max-candidates 3 --json`:
  exited **0**, `complete`, **mock/scripted**, four discovered / three selected;
  A conditional, B job rejection, C continuous-operation rejection. Two discovery
  attempts, eight candidate tool attempts, thirteen planner calls. For this
  invocation's November estimate: `(30 - 1) * 5 * USD 0.50 = USD 72.50` for A;
  others null. History explicitly disabled for this CLI proof; no remote writes.
  Fixed October test fixture separately reproduces USD 75.
- Whole-repository `npm run format:check` still reports the **pre-existing**
  formatting failures in `docs/EXECUTION_PLAN.md` and `docs/ZETARIS_HISTORY.md`.
  Changed source/test files pass scoped Biome formatting. Existing table
  formatting is preserved.

**Reliability correction:** an aggregate-deadline timeout is remembered even if
its timer fires just before the wall clock cutoff. It cannot start another
candidate/tool or persist history after that budget is exhausted.

**Blocker/next action:** Zayan must map and verify live authoritative scheduling
clearance and marginal pricing/commitment coverage against these validated
contracts. Milad must complete measured baseline evaluation and live warm model
proof. Actual AWS pricing, remote multi-candidate persistence, exact event-model
approval, slides/demo, clean-checkout release and submission remain separate
unclosed gates. These fixture proofs do not advance the release milestone.

### Warm investigation proof — 2026-10-23

- **Gate/owner:** Day 2 scenario D, Milad. Implemented scoped recall and compact
  post-evaluation persistence using the existing Zetaris and local H-MEM adapters.
  Fresh inventory/billing selects the instance; history cannot select a verdict.
- **Executed configured proof:** `NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:warm`
  passed outside the network sandbox. Run 1 recalled zero records, checked
  operations first, stored H-MEM and verified Zetaris append by exact readback.
  Run 2 recalled one record from each service, checked dependencies before
  operations, and again verified both stores. Both CLI exits were 0 and both
  rejected the window using fresh **mock** operational evidence. Planner mode
  was **scripted**; H-MEM used the actual vendored local reference; Zetaris used
  the configured remote service. Probe directories were removed; synthetic
  Zetaris history rows are intentionally retained. Multiple successful proof
  invocations each retained two rows under a separate synthetic account.
- **Automated proof:** `npm test` passed **78/78**; `npm run typecheck`,
  `npm run lint` and `git diff --check` passed. Added tests cover both-store warm
  ordering, either source unavailable, future context exclusion, disabled append,
  stale rejection versus cleared/missing fresh evidence, historical citation
  forgery, and model-adapter hint propagation with mocked model HTTP.
- **Formatting boundary:** `npm run format:check` still reports pre-existing
  table formatting in this document and `docs/ZETARIS_HISTORY.md`; no unrelated
  table reformat was included. Changed TypeScript files pass focused Biome checks.
- **Remaining gate/next action:** Zayan verifies real AWS adapters; Milad/user
  verifies warm behavior with an approved real model and measures broader A/C/D
  outcomes. Effective dedicated-user permissions remain a deployment check.
  Single-writer limits remain. The combined sponsor/release gate stays open.
  This checkpoint supersedes earlier statements that warm CLI use is unimplemented.

### Verification and blocker log

### AWS Task 1 finalization — 2026-10-24

- **Gate/owner:** Day 2 direct-evidence handoff, Zayan. User relayed Milad's approval of a 14-day AWS observation window and direct push to `main`; this supersedes the earlier no-commit/push handoff state below.
- **Reconciliation:** saved a local safety stash and an ignored `.cache/` snapshot, then `git pull --ff-only origin main` advanced to `01e40a5`. Reapplied only AWS changes relative to the earlier reviewed upstream; resolved README, package-script and decision-note overlaps while retaining Milad's newer work. Shared `src/contracts.ts` and its verdicts remain unchanged from this latest upstream.
- **Implementation:** all five agent interfaces return validated `Observation` values. SDK default credentials, scoped read-only discovery/metrics and opt-in attributable billing are implemented; operations/dependencies explicitly remain unavailable. Collector defaults to the last 14 complete UTC days. No AWS or other live service was called in this finalization.
- **Executed offline proof:** `node --import tsx --test --test-isolation=none tests/*.test.ts`: **185/185 passed**, including **40 AWS tests** and the latest agent/history scenarios. Both `tsc -p tsconfig.investigation.json --noEmit` and `tsc -p tsconfig.aws.json` passed. `biome lint .` passed; scoped Biome format for AWS files, package/config and changed memory tests/demo passed. Commands used the installed Node 24 runtime. Replaced Linux-only temporary paths with `os.tmpdir()` in three memory tests and the warm demo so the full suite runs on Windows.
- **Review:** lockfile root metadata matches package configuration; conflict-marker/credential-pattern scan and `git diff --check` pass. Cache/safety snapshots and local environment files are excluded. Full `biome format .` remains nonzero due to checkout CRLF differences and pre-existing formatting in README, this execution plan, `docs/ZETARIS_HISTORY.md` and `docs/warm-learning-user-model.json` (confirmed against pristine upstream blobs); no broad formatting rewrite is included.
- **Remaining/next action:** authorized commit/push after staged review. Milad still needs to select the live provider and pass an aligned 14-day period in the currently mock-only CLI. Populated live metrics/billing and authoritative operations/dependency sources remain unverified/unconfigured; only authenticated empty discovery has live proof. Zetaris persistence remains Milad's responsibility. Separate opt-in live model integration tests were not run.

### AWS handoff reconciliation — 2026-10-23

- **Ownership confirmed by user/Milad:** Zayan's AWS tools only fetch/return evidence; Milad owns Zetaris history load/save and H-MEM integration. This supersedes older Zetaris assignments to Zayan below.
- **Git:** fetched `origin/main` at `7771335`. Backed up the local AWS changes under ignored `.cache/`, then reconciled working files with that source. Preserved Milad's implementation and development dependencies, plus our SDK dependencies/scripts. HEAD remains `257f87e`; no commit, merge, push or index change. Upstream-only files appear untracked until branch synchronization is authorized. Do not blindly pull over this prepared working tree.
- **Contract:** `src/contracts.ts` is byte-identical to fetched upstream. `src/tools/aws-agent.ts` exports all five names and returns runtime-validated `Observation` values. Detailed collector records remain separate; no verdict or shared-contract edits. Operations/dependencies explicitly return unavailable.
- **Offline verification:** `node --import tsx --test --test-isolation=none tests/*.test.ts`: **111/111 passed**. `tsc -p tsconfig.investigation.json --noEmit` and `tsc -p tsconfig.aws.json`: passed. Full repository Biome lint: passed after AWS formatting/lint cleanup. Commands used the installed bundled Node 24 runtime. Fixed an upstream Linux-only `/tmp` test helper to use `os.tmpdir()` on Windows.
- **User-executed live proof (earlier this chat):** `npm run demo:aws -- --live` equivalent using bundled Node returned `no_match`, `instanceCount: 0`, `issueCodes: []` in `eu-north-1`. This establishes authenticated empty discovery, not populated metrics or billing. No AWS, model or Zetaris network probes were run during reconciliation.
- **Remaining:** Milad selects the provider and supported observation window when enabling it in the CLI; current CLI is still mock-only and defaults to an unaligned 28-day period, while collector limits are 14 aligned days. Billing queries are opt-in; full metrics/cost data and operations/dependency integrations remain unverified/unconfigured. AWS tools perform no persistence. Existing upstream formatting findings in this document and `docs/ZETARIS_HISTORY.md` remain separate from AWS code validation.

Append after actual execution. Include date, command, result, `mock`/`fixture`/`live`/`stub` integration mode, owner and next action; sanitize secrets, account details and provider payloads. The following row records only a documentation event, **not a test**.

| Date       | Gate or integration       | Command / evidence                                                              | Mode         | Result or blocker                                               | Owner / next action                              |
| ---------- | ------------------------- | ------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- | ------------------------------------------------ |
| 2026-10-23 | Initial Day 2 inspection  | Static inspection previously recorded in this plan                              | Not executed | No runtime integration verified                                 | Both: run Day 2 prerequisites                    |
| 2026-10-23 | Approved design alignment | Team-approved MVP flows and corrected direct/Zetaris/Meterless responsibilities | Design only  | Supersedes cost-delta implementation slice; no executable proof | Both: align contracts and run integration probes |

### Executed first-loop slice — 2026-10-23

**Active gate:** Day 2 contradiction-first loop. **Outcome:** mock direct evidence + scripted/live NVIDIA planning now execute; the combined sponsor gate remains open. Real AWS adapters and warm Zetaris/H-MEM planning are not claimed. Existing document edits were preserved. No infrastructure mutation, generic agent SQL or production dependency was added; TypeScript and Node declarations are development-only dependencies.

| Gate / exact command                                                                                                                                         | Executed outcome / integration mode                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Owner / blocker / next action                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm test`                                                                                                                                                   | **54/54 passed**. Actual in-process CLI, B rejection, changed jobs/windows, partial/unavailable/invalid evidence, scope/UTC/units, high peaks, model failure, repeated action, budgets/timeouts, report citation tampering, local H-MEM and mocked NVIDIA boundary tests. No live API integration inferred from tests.                                                                                                                                                                                                                                           | Both: maintain these focused gates                                                                        |
| `npm run typecheck`                                                                                                                                          | **Passed**, strict `tsconfig.investigation.json`: CLI, investigation code, scripts and tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Milad: scoped investigation proof                                                                         |
| `npm run investigate -- --account demo --region us-east-1`                                                                                                   | **Exit 0**, mock direct evidence + scripted planner. Discovers 2 instances; selects highest matching running compute spend; proposes 00:00–06:00 UTC; later 02:00–03:00 critical batch rejects it. 2 discovery + 2 candidate tool attempts, 5 planner calls; savings `null`.                                                                                                                                                                                                                                                                                     | Both: scenario B basic behavior proven                                                                    |
| `node --import tsx cli.ts investigate --account demo --region us-east-1 --scenario missing --json`                                                           | **Exit 2**, mock/scripted, `partial` + `needs_verification`; operations `unavailable`, savings `null`.`--scenario clear` instead preserves `no_match`, queries dependencies and defers; tests also move the metrics window to change the targeted query.                                                                                                                                                                                                                                                                                                         | Both: unknown is not safe; positive clearance remains follow-on                                           |
| `NODE_TLS_REJECT_UNAUTHORIZED=1 node --import tsx cli.ts investigate --account demo --region us-east-1 --planner nvidia --json`                              | **Live NVIDIA model + mock direct evidence**: genuine bounded scenario B rejection with 5 model calls and 4 direct mock tool attempts. Model `nvidia/nemotron-3.5-lightning-30b-a3b`; fixed NVIDIA-hosted endpoint class; no third-party model SDK. Final run `d93ce923-63b5-4a78-b694-efd355972345`: `complete`, `not_recommended`, `hypothesis_contradicted`, **5973 ms**.                                                                                                                                                                                     | Milad: actual NVIDIA contribution proven; exact event-model approval still needs team/portal confirmation |
| `npm run probe:hmem`                                                                                                                                         | **Passed**: executed mock B summary → actual local Meterless reference add/persistence → new engine instance → query retrieves historical hypothesis/provenance. Engine source `vendor/hmem`; no hosted service, warm planner or Zetaris proof implied. Probe owns and removes its temporary directory.                                                                                                                                                                                                                                                          | Milad: store/retrieve prerequisite proven; integrate query priority in later D                            |
| Clean temporary source copy; `npm ci --ignore-scripts --no-audit --no-fund`, `npm test`, `npm run typecheck`, `npm run probe:hmem`, then documented JSON CLI | Fresh dependency install passed; 54 tests, typecheck, local H-MEM and mock B reproduced without working-tree modules or secrets. Node 24 selected explicitly because asdf does not inherit a version in `/tmp`. This is an isolated source-copy proof, not a committed clean Git checkout.                                                                                                                                                                                                                                                                       | Milad: final clean-checkout release gate still requires submitted revision                                |
| Legacy root `node_modules/.bin/tsc --noEmit`                                                                                                                 | **Pre-existing starter failure:** missing optional `@anthropic-ai/sdk` in `src/llm.ts`. Investigation typecheck passes separately; no new production dependency installed to satisfy the unrelated notebook path.                                                                                                                                                                                                                                                                                                                                                | Milad: optional starter decision outside this slice                                                       |
| Zetaris history append/query                                                                                                                                 | **History append/read not executed / blocked:** correction: all three required credentials are present in `.env`; earlier inspection checked only process environment. The configured endpoint is HTTP; the user subsequently authorized it. Live SELECT 1 and fixed read-only catalog/grant probes succeeded with explicit HTTP opt-in. No JDBC datasource or lakehouse is visible. Actual history schema, backing-store support and least-privilege append/read permissions remain unverified. No guessed SQL/write API or fake persistence was introduced. CLI honestly reports history `not_configured`. | Zayan: supply verified dedicated history contract and authorized connection, then prove append/read       |

**Model failure evidence:** the older Nemotron model returned HTTP 410; another catalog-listed model was not available for chat. Initial full-action prompts produced malformed actions and correctly stopped as incomplete. The model boundary now requests only an allowlisted action name and short reason; trusted code binds account/region, window, instance and retrieved IDs. Strict validation remains authoritative; no fallback or repair invents model success. During development an alternate live run also stopped partially when the model requested operations before proposing a window; this is not an adaptive live-success proof. Generation now limits choices to currently valid prerequisites as well as binding trusted arguments. Offline changed-evidence tests are the deterministic adaptation proof.

**Diff hygiene:** focused `git diff --check` on implementation, README, package files and rationale passed. Whole-tree checking still reports the pre-existing Markdown hard-break trailing spaces in the concurrent context/execution-plan edits.

**Remaining gate:** no current AWS integration, authorized Zetaris append/read, exact model event approval or warm D integration. H-MEM is tested as local reference persistence separately, while the first-run CLI uses no historical context. Do not advance the milestone or close the combined sponsor gate from the mock slice. A/C/D, multi-candidate expansion, numeric savings, measured full evaluation, slides/demo and submission are explicitly follow-on work in `plan.md`.

### OpenAI request compatibility correction (2026-10-23)

- **Gate/owner:** Day 2 approved-model access prerequisite, Milad. User reported
  HTTP 400 using the official OpenAI base and `gpt-6.1-sol`. Safe intended `.env`
  inspection confirmed that base/model, key presence, text response mode and no
  extra provider options; no credential values were logged or changed.
- **Change:** the exact official OpenAI base now defaults to
  `max_completion_tokens: 1024`, replacing the incompatible legacy `max_tokens`
  default. Other providers and explicit configured limits retain their behavior.
  Added mocked compatibility/override coverage, sanitized 400 guidance and README
  documentation. No production dependencies or model/API destination changes.
- **Executed:** `npm test`: **72/72 passed** (offline/mocked transport);
  `npm run typecheck`: passed; focused Biome lint/format on
  `src/investigation/model.ts`, `tests/config.test.ts` and
  `tests/integration/llm.test.ts`: passed.
- **Repeat-suite limitation:** a subsequent full run passed 71/72, failing the
  previously recorded timing-sensitive `total runtime bound applies across
  individual calls` assertion (2 tool attempts versus expected 1 with a 10ms
  total budget). No timing/runtime implementation was changed in this slice.
- **Live limitation/next action:** `npm run test:integration` was attempted here
  and failed with `model_transport_unavailable` before an HTTP response. Thus
  the reported 400's response detail and successful real OpenAI action remain
  unverified. User reruns the live test from their working network. Context7
  retrieval did not complete and was canceled; official OpenAI model/API pages
  were checked directly for Chat Completions support and token-limit semantics.
  Combined sponsor/model-approval gates remain open.
- **User-confirmed follow-up:** user reports the configured model works after
  this correction. This is user-confirmed live access, not an agent-executed
  successful integration run or proof of event-model approval.

### Environment/provider configuration verification (2026-10-23)

- **Slice/owner:** Day 2 configuration support, Milad. Native Node `.env` loading with shell precedence; configurable OpenAI-compatible planner; legacy NVIDIA preset retained; `.env.example` and sanitized fixed-query Zetaris probe added. No production dependencies or secret-file edits.
- **Executed:** `npm test`: **59/59 passed**; `npm run typecheck`: passed. Focused `node_modules/.bin/biome lint` and `biome format` on `src/config.ts`, `src/http.ts`, `src/investigation/{model,nvidia}.ts`, `src/tools/zetaris.ts`, `scripts/probe-zetaris.ts`, `tests/{config,nvidia}.test.ts`, `cli.ts`: passed. `npm run investigate -- --account demo --region us-east-1 --json`: exit 0, mock B rejection. The existing 10ms total-runtime test had one transient timing failure during development; final suite passed.
- **Mode/coverage:** arbitrary-provider transport is mocked; full B loop uses that transport plus mock evidence. Tests verify environment file reading/precedence, provider credential isolation, URL/body constraints, aliased model response IDs, request parameters and Zetaris sanitized failure/HTTP refusal. No new live provider or sponsor proof claimed.
- **Zetaris blocker:** `.env` contains all three required connection settings. Prior process-environment-only absence claim is corrected. The initial automatic review rejected HTTP transmission; the user subsequently authorized it. The helper now permits HTTP only with explicit opt-in. Connectivity is verified in the follow-up below; a dedicated writable target and effective append/read permissions remain needed. History remains unintegrated; owner Zayan, Milad integrates.

### Authorized Zetaris discovery and manual LLM test (2026-10-23)

- **Scope/owner:** Milad, with live AWS left to Zayan by user instruction. User authorized HTTP credential transmission for this connection. `ZETARIS_ALLOW_HTTP=true` enables the exception; HTTPS remains the default. No `.env` changes, infrastructure changes, grants, schema writes or production dependencies.
- **Live command:** `ZETARIS_ALLOW_HTTP=true NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:zetaris:history` passed. `SELECT 1` returned the expected value in the validated `headers`/`data`/`total` response shape. Catalog totals: **2 Lightning databases, 0 JDBC datasources, 0 lakehouses, 0 explicit grants**. Counts describe visible metadata, not proof that writes are denied or effective privileges are restricted. Raw responses, identities and endpoints were not logged.
- **History gate remains open:** no existing writable target was discovered. No append attempted against demo datasets. User requested practical guidance; [ZETARIS_HISTORY.md](ZETARIS_HISTORY.md) provides a preferred local durable lakehouse, administrator handoff, proposed compact table contract, and required append/read proof. Next: administrator confirms storage and provisions a restricted dedicated table; Milad validates schema/permissions and synthetic read-after-write. Do not claim sponsor history integration from connectivity.
- **Manual test added:** `npm run test:integration` discovers `tests/integration/llm.test.ts`, separate from `npm test`. It loads configured model settings, enforces TLS verification, performs one real planner request and validates its action without executing tools. Left for the user to run against the live provider. A discovery-check invocation during development hit the TLS guard before network access; it was not a live model success. The test now explicitly enables certificate verification.
- **Offline verification:** `npm test`: **59/59 passed**, excluding the integration file; `npm run typecheck`: passed. Focused Biome lint/format checks on the changed adapter, probe, configuration test, integration test and package scripts: passed. Focused diff whitespace check: passed. Existing repository-wide lint/format findings remain separate.

### Reported integration failure diagnosis (2026-10-23)

- User's manual LLM integration run failed with `model_http_405`. Safe inspection confirmed generic config loads from `.env`, no shell base override, and a configured Codex backend route. The adapter sends POST to base + `/chat/completions`; this route/protocol mismatch explains the failure. No credential or private hostname was logged, and no live model test was rerun. Matching Chat Completions API base/credential is required, or a separately implemented protocol adapter if only Codex/Responses is available. Added sanitized 405 guidance to the integration test and README; no automatic endpoint substitution or secret changes.
- User reported `/` rejected by the local-lakehouse form. Docs now distinguish the remote server/container filesystem from this workspace and give the exact administrator request for a dedicated durable writable directory. Exact UI validation rule and permitted deployment path remain unknown; no guessed directory was created.
- Verification: investigation typecheck and focused integration-file Biome lint/format passed. Live model success and history append/read remain unverified.

### User-confirmed local lakehouse setup (2026-10-23)

- **Evidence/mode:** user reported successful creation after moving the history directory under `/home/zetaris/customer-data/shared`, the configured `ZETARIS_LOCAL_FILE_SYTEM_ROOT_PATH` in driver and API. The earlier sibling path was rejected. This is user-confirmed deployment setup, not an independently executed post-creation catalog or append/read test.
- **Documentation/owner:** Milad recorded the required directory creation, group/mode, driver/API write checks, UI values, SQL registration alternative and persistence requirements in [ZETARIS_HISTORY.md](ZETARIS_HISTORY.md#required-local-docker-setup-history-lakehouse), linked from README. Verified the documentation diff with `git diff --check` on the changed docs; no runtime changes or tests needed for this documentation-only update.
- **Remaining gate:** verify the registered lakehouse independently, create the dedicated reviewed history table, validate effective app permissions and prove a synthetic append/read round-trip. Earlier zero-lakehouse catalog counts are historical observations before the user's setup, not the current claimed catalog state.

### Zetaris password configuration and history boundary (2026-10-23)

- **Slice/owner:** Milad; user requested username/password and lakehouse configuration in `.env.example`, and confirmed `CCI_HISTORY` exists with **no table yet**. Added actual login support, a dedicated v1 table SQL file, runtime-validated scoped read/append adapter, read-only schema probe and an explicit manual round-trip write probe. No production dependencies, `.env` edits, privilege changes or automatic CLI persistence/recall.
- **Verified auth contract:** same-origin public UI JavaScript uses POST `/api/auth/login` with `{username,password}`, then `idToken` and `orgId` (or token-payload `orgId`). Implemented that contract with bounded decoding/deadlines, org pinning, no redirects, no token persistence and no password-to-admin-token fallback. Actual new-user login remains unexecuted because the credentials have not been supplied locally.
- **Live read-only evidence:** existing configured bearer credential found `CCI_HISTORY` via SHOW DATALAKES; a fixed SELECT verified Spark UTF-8 hex literal decoding, including quote/backslash characters. DESCRIBE of `CCI_HISTORY.investigations.records` returned sanitized HTTP 400, consistent with the user's report that no table exists; no write was attempted. This is connectivity/catalog/encoding proof, not schema or permission proof.
- **Offline verification:** `npm test`: **68/68 passed**; `npm run typecheck`: passed. Focused Biome lint/format for both Zetaris modules, auth/history/config tests, both probes and package scripts: passed. Tests cover login contract and failure isolation, org mismatch, header injection, schema mismatch before writes, scoped reads, safely encoded values, append enablement/target restrictions, read-after-write, identical-ID reuse and uncertain insert failure without retries. No live model or history write probe run.
- **Next gate:** user runs `scripts/zetaris-history.sql` as provisioning admin, verifies the app user's effective table-scoped read/append permissions, fills the new `.env` fields, runs read-only schema verification, and explicitly enables appends before `npm run probe:zetaris:roundtrip`. Record actual append/read success separately. The adapter assumes a single writer; Iceberg uniqueness is not enforced and pre-read is not a concurrency lock. Warm CLI integration remains open.

### User-executed Zetaris history round-trip (2026-10-23)

- **Command/result:** user ran `npm run probe:zetaris:roundtrip` and supplied `result: pass`, `history_read_write_verified: true`, `evidence_mode: mock`, `historical: true`, `synthetic_record_retained: true`, `warm_planner_proven: false`. This supersedes the earlier unexecuted append/read status above; the agent did not independently rerun the write.
- **Proof boundary:** real Zetaris schema validation, append and exact scoped readback passed with the user's configured connection. The investigation evidence was synthetic/mock, and the retained record is historical context. The output does not identify the effective login principal or certify that broader write privileges are denied.
- **Owner/next action:** Milad integrates scoped history recall/persistence into the CLI and proves scenario D; Zayan/user verifies effective dedicated-user permissions. Single-writer limitation remains. Automatic CLI history use, warm planning, live AWS and the combined sponsor/release gates remain open.

### Development tooling verification (2026-10-23)

- **Slice/owner:** Day 2 reproducibility support, Milad; install development-only
  Biome 2.6.2 with npm and expose lint/format scripts. No runtime or integration
  behavior changes; mode: local tooling, no live sponsor/API proof.
- **Passed:** `node_modules/.bin/biome lint biome.json package.json` and
  `node_modules/.bin/biome format biome.json package.json`; configuration and
  package scripts are valid. `npm test`: 54/54 passed. `npm run typecheck`: passed.
  `git diff --check -- package.json package-lock.json biome.json`: passed.
- **Existing findings:** `npm run lint -- --max-diagnostics=0` exits 1 with
  2 errors, 26 warnings and 4 informational diagnostics. Both errors concern the
  intentional control-character validation regex in `src/contracts.ts`.
  `npm run format:check -- --max-diagnostics=0` exits 1 with 25 files requiring
  formatting. No existing source or documentation was bulk rewritten.
- **Next action/blocker:** Milad/team to review existing findings and agree on
  a formatting baseline separately; tool installation is complete. Live sponsor
  gates and milestone status remain as recorded above.

### Lint remediation verification (2026-10-23)

- **Slice/owner:** Day 2 tooling follow-up, Milad; resolve remaining lint
  diagnostics in notebook/engine types, contracts, planner, report validation,
  runner and their affected tests. Mode: local checks and offline fixtures.
- **Passed:** `npm run lint:fix` and `npm run lint`, 36 files, no diagnostics;
  `npm run typecheck`; `npm test`, 59/59 tests. Direct `textValue` regression
  probe rejects all 33 ASCII control characters and preserves Persian text.
- **Decision:** Preserve the intentional control-character regex through a
  declaration-local explained suppression. Retain fail-closed evidence checks;
  replace non-null assertions with checked lookups and narrowed locals.
- **Blocker/next action:** None for lint remediation. Existing formatting and
  live integration/release gates remain separately tracked; no gate advanced.

### Selected commit verification (2026-10-23)

- **Scope/owner:** selected scope, CLI, model, H-MEM, tooling and documentation changes; Zetaris connectivity/history implementation and setup changes excluded. Milad owns this Day 2 reproducibility check; combined sponsor gates remain open.
- **Method/mode:** exported the selected Git index to an isolated temporary directory and reused the installed Node 24.19.0 dependencies and local H-MEM reference. No project `.env` was copied and no live provider calls were made. An initial invocation was blocked by the temporary directory lacking an asdf version selection; explicit `ASDF_NODEJS_VERSION=24.19.0` resolved the tooling prerequisite.
- **Passed:** `npm test`, **58/58** offline tests; `npm run typecheck`; `npm run lint`, 36 files with no diagnostics.
- **Formatting limitation:** `npm run format:check -- --reporter=summary` exits 1 for `docs/EXECUTION_PLAN.md` and the inherited `src/tools/zetaris.ts`. No formatting fixes were applied; the Zetaris implementation changes remain outside these commits.
- **Remaining work:** integrate verified current AWS evidence and historical stores, prove warm-run influence, and complete the broader scenario/release gates already listed below. These checks do not establish live integration or project completion.

## 2. Owners and interfaces

| Area                                       | Driver                         | Deliverable                                                                                                                                                  |
| ------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Direct evidence adapters and mock datasets | **Zayan**                      | Read-only TypeScript logical tools for inventory, billing, utilization, operations/jobs and dependencies, shared typed observations with stable evidence IDs |
| Zetaris history                            | **Milad**                     | Dedicated append-only structured history schema, authorized write boundary, allowlisted read and append, actual read-after-write proof                       |
| Planner/evaluator, approved model, H-MEM   | **Milad**                      | Bounded evidence-dependent loop, real reasoning memory round-trip, validated report, decision trace                                                          |
| Shared data/report contract and tests      | **Both**                       | Runtime validation, scope/UTC/units/coverage, integration mode labeling, A/B/C/D fixtures, missing-source case                                               |
| CLI, README, evaluation and submission     | **Milad** (Zayan reviews data) | Detailed readable report/JSON, repeatable commands, measured evaluation, slides and demo                                                                     |

### Logical API handoff (proposed names; test semantics before parallel work)

```text
list_ec2_instances(account_id, region, window?)
get_ec2_billing(account_id, region, window, instance_filter?)
get_ec2_metrics(account_id, region, instance_id, window)
get_ec2_operations(account_id, region, instance_id, window)
get_ec2_dependencies(account_id, region, instance_id)
query_investigation_history(account_id, region, instance_filter?, limit)
append_investigation_history(validated_record)  # restricted append-only historical write
```

All sources return status `ok`/`no_match`/`partial`/`unavailable`/`error`, source, `mock`/`fixture`/`live`/`stub` mode, UTC observed/collected timestamps, scope, coverage, units and IDs. Missing means unknown, not zero; no matches from a non-authoritative source do not prove the absence of jobs/dependencies. Historical data is marked separately and cannot be cited as current operational evidence. Validate schemas at runtime.

**Write boundary:** only the history append is approved. No model-authored SQL may reach the generic Zetaris query helper; no AWS mutation and no general Zetaris DML or table-management actions exposed to the agent. Prove backing-store support, permissions and constrained inputs before claiming this gate.

## 3. Day-by-day execution and gates

### Day 1 — Thu Oct 22 (carry forward unverified prerequisites)

**Milad**
- [x] Runnable TypeScript investigation CLI using the existing starter, with mock provider and README usage.
- [x] Runtime-validated request, observation, hypothesis, trace and report contracts; account/region scope and UTC periods.
- [x] One genuine team-approved investigation-model call; Oct 24 configured NVIDIA-hosted Nemotron access and cold/warm proof recorded above, with model ID and modes.
- [x] Genuine Meterless H-MEM store -> retrieve round-trip for investigation memory.
- [x] Bounded planner -> executor -> evaluator -> finish/replan skeleton.

**Zayan**
- [ ] Document actual direct API inventory, billing, metrics, operations and dependency coverage, permissions and gaps.
- [x] Produce minimal labeled mock observations plus one unsafe scheduling fixture.
- [ ] Verify supported Zetaris historical read and narrowly scoped append path with a non-sensitive test record.

**Joint prerequisite gate:** One scoped CLI investigation retrieves evidence from a clearly labeled provider and emits a validated, honest JSON result. Sponsor/model calls remain separate **unverified** gates until genuinely executed.

### Day 2 — Fri Oct 23: first end-to-end contradiction slice

**Milad**
- [x] Candidate discovery from account/region, **without a supplied instance ID or history prerequisite**.
- [x] Model chooses an initial scheduling question; a later tool choice changes based on the returned evidence.
- [x] Evaluator identifies a conflict, **rejects** the specific proposed shutdown window, and logs the transition.
- [x] Runtime validation, maximum calls/steps/time, repeated-action protection, graceful partial failures, clear modes.
- [x] Detailed CLI + JSON report with current evidence references, gaps, no fabricated savings.

**Zayan**
- [x] Build read-only mock-backed direct tools for candidate discovery, billing, utilization, job/change and dependency lookups.
- [x] Build scenario B: low apparent overnight CPU but a critical scheduled batch or dependency overlapping the initial shutdown window.
- [x] Define and test source timestamps, UTC windows, missing-data statuses and coverage fields.
- [ ] Implement only _approved, scoped_ Zetaris historical record read and append if access/support allows; otherwise log a blocker, do not fake it.

**Joint gate:** Scenario **B** runs from a CLI over **explicitly labeled mock data**, discovers a candidate, attempts a safety challenge, revises and rejects a plausible but unsafe schedule, with valid retrieved evidence IDs and a readable trace. A missing-critical-source variation yields `needs_verification` or an explicit incomplete report within budgets and `null` savings. In addition, separately verify one approved model call, H-MEM round-trip, and actual Zetaris history read/append. **A mock-only slice can prove investigation behavior but does not close live sponsor integration gates.** Record commands, results and unresolved owner actions; do not check gate boxes early.

### Days 3–4 — Sat–Sun Oct 24–25: full user flows and sponsor proof

**Milad**
- [ ] Scenario A: evidence-gated conditional off-hours recommendation, including a concrete UTC schedule and approvals/unknowns.
- [ ] Scenario C: justify required continuous operation **and** independently test a missing-source/unknown outcome.
- [x] Scenario D: Oct 24 real-model second run retrieves actual H-MEM reasoning and remote typed Zetaris history; query order changes, fresh mock evidence controls the verdict. Exact proof above; live AWS remains separate.
- [ ] Deterministic compute-only savings when verifiable, otherwise `null`; explicitly handle commitment/retained charges and incomplete billing granularity.
- [ ] Model failure, tool timeout, memory/history errors, partial responses, invalid outputs, budget exhaustion; all bounded.
- [ ] Expose full trace and JSON report with validation and provenance; measure latency and tool counts.

**Zayan**
- [ ] Replace/mock-swap direct providers with live read-only API-backed adapters wherever access permits; **truthfully label** remaining mocks.
- [ ] Verify historical Zetaris append/read with the approved narrow permissions on non-sensitive records and baseline optionality.
- [ ] Finalize A/B/C/D fixture observations, expected verdicts, coverage and source-specific failure cases.
- [ ] Test account/region/instance isolation, time zones, data completeness, joins and no raw secret payloads.
- [ ] Verify actual AWS compute pricing/billing coverage and commitment assumptions before allowing any savings number.

**Joint gate:** Reproducibly distinguish A, B and C, show a meaningful warm D run, and test unavailable data. A changed current schedule must change the conclusion when supported even if old memory disagrees. Sponsor integrations must be real, traced and accurately documented. Compare to a simplistic average-CPU rule and record actual measured behavior, including false positives.

### Day 5 — Mon Oct 26: freeze and submission assets

**Milad**
- [ ] Fresh-checkout CLI installation, mock seeding, execution and test instructions in project-specific README.
- [ ] Display readable decision trace: initial window -> conflicting live/mock evidence -> revision; plus warm run with different investigation context.
- [ ] Slides and **1–4 minute demo** showing B first, then D sponsor contributions; document NVIDIA, Zetaris, Meterless and Cursor accurately.
- [ ] Publish measured disposition/evidence validity/safety false positives, runtime and tool count; no invented numbers.

**Zayan**
- [ ] Independently reproduce provider and historical-store paths from documented instructions.
- [ ] Confirm integration modes and data provenance in slide/demo fixtures; review assumptions behind any savings.
- [ ] Scan artifacts for credentials, sensitive AWS exports, unsafe write tools and raw secrets.

**Joint gate:** A clean environment reproduces the demo without undocumented manual fixes; required assets are ready. No optional dashboard work until this holds.

### Day 6 — Tue Oct 27: contingency and submission

- [ ] Verify recorded event deadline/portal fields, materials, reusable-component declarations and accessible repository. **Milad**
- [ ] Run final A/B/C/D and failure checks; avoid late architecture changes. **Both**
- [ ] Submit before **23:45 UTC**, then record confirmation. **Milad**

## 4. First vertical slice / proposed acceptance tests

**Slice:** One discovered EC2 instance, one scheduling hypothesis, one fresh contradictory observation, one rejected recommendation, one validated report, one missing-source test. Reuse TypeScript/Node.js and H-MEM; do not add dependencies without need and agreement.

| Test                                                   | Expected result                                                                        | Owner |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- | ----- |
| B, realistic mock                                      | Evidence-driven next query exposes critical job; agent rejects overlapping stop window | Both  |
| Alternate source result                                | Tool choice or verdict responds to new evidence; not a hard-coded narrative            | Milad |
| Missing job/dependency source                          | `needs_verification`; absence is not interpreted as safety                             | Both  |
| `no_match` versus `unavailable`                        | Distinct statuses and recorded coverage/authority                                      | Zayan |
| Invalid scope, UTC period, malformed observation       | Report refuses to combine unrelated/invalid data                                       | Both  |
| Model unavailable / repeated action / budget exhausted | Stops within configured limits with explicit incomplete/partial outcome                | Milad |
| History empty on first run                             | Current investigation still completes using direct evidence                            | Milad |
| H-MEM historical warning contradicts current evidence  | Fresh evidence decides; past warning prompts verification only                         | Milad |
| Historical Zetaris append + query                      | Real typed record read-after-write, correct scope and provenance                       | Zayan |
| History write denied or Meterless unavailable          | Clear degraded context behavior without inventing a successful write/read              | Both  |
| A, conditional schedule                                | Adequately checked window; approval, caveats and justified savings or `null`           | Both  |
| C, justified continuous operation                      | Supported refusal, not falsely marked as waste                                         | Both  |
| Baseline: low average CPU                              | Record unsafe suggestion vs risk-aware verdict on B                                    | Both  |

## 5. Release checklist

- [ ] Direct API adapter path for current evidence actually runs; mocks/fixtures/live sources are clearly labeled.
- [ ] Genuine Zetaris history read and constrained authorized append; stored observation is useful on a subsequent run.
- [ ] Genuine Meterless H-MEM context store and retrieve; retrieved memory affects a subsequent query choice without being current evidence.
- [ ] Approved model call verified; NVIDIA contribution genuine; Cursor use described accurately.
- [ ] One real evidence-dependent replanning/rejection visible in B; all report citations reference actually retrieved current records.
- [ ] Conditional recommendations honor peaks/jobs/dependencies and human approval; no AWS changes.
- [ ] Unknown savings are `null`, and any numeric estimates are reproducible and scoped to marginal compute.
- [ ] A/B/C/D plus missing-source, timeout, invalid-output and history/memory failure reproducible.
- [ ] Measured evaluation and rule-based baseline comparison with actual denominators and uncertainty.
- [ ] No credentials, sensitive exports, or raw secret-bearing provider responses in code/fixtures/reports.
- [ ] README, reproducible clean setup, slide deck, sponsor explanation and **1–4 minute demo** ready.
- [ ] Submission portal verified and entry submitted before deadline.

## 6. Cut list and operational coordination

**Priority:** Direct-tool correctness + bounded reasoning/rejection -> actual sponsor read/append and memory round-trips -> A/C/D and failure evaluation -> detailed readable report -> polish. Cut multi-cloud, Kubernetes, changing infrastructure, EC2 downsizing, elaborate viewers, enterprise auth, forecasting and extra roles, never provenance, sponsor integration or safety tests.

**Parallel work protocol:** Both agree on schemas and representative tool responses before divergent implementation. Zayan owns data-source truth; Milad owns verdict/report truth. Preserve concurrent changes. When a provider is blocked, record sanitized request/error metadata and use a separately labeled mock for development; a stub is not a live integration. Keep rationale in `memory.md` and **all progress** in this execution plan; do not infer completion from documentation.
