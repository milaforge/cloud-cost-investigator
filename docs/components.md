# Architecture

[What](../README.md) · [How](HOW.md)

See the [README diagrams](../README.md) for the system overview. This page
documents component authority, runtime boundaries and integration details.

## Responsibilities and shared state

| Role | Responsibility and authority | Feedback visible to judges |
| --- | --- | --- |
| **Planner** | Chooses the next check or proposes a window. The optional real model cannot authorize a verdict or modify infrastructure; the default scripted planner exercises the same engine offline. | Receives candidate-scoped observations, current hypothesis, prior attempts and scoped lesson hints on each turn. |
| **Executor** | Owns validated tool execution and current-evidence registration. Invalid scope, malformed observations and exhausted budgets cannot become usable facts. | Tool action, status and evidence IDs enter shared run state before the next decision. |
| **Safety evaluator** | Trusted deterministic code can block a positive recommendation, reject a contradicted window, or defer unknown safety. It is not another model agent. | Requires targeted checks after a proposal; remaining gaps feed the next planner turn. B ends when fresh evidence disproves the proposal. |
| **Report validator and renderer** | Revalidates citations, chronological hypotheses, positive safety proof and savings before emitting human-readable or JSON output. | Shows the proposed → supported/contradicted/unresolved transition, limitations and next human actions. |

The runner owns shared state; roles do not exchange unrestricted messages. Before the first planner call it initiates required inventory discovery through the same executor, with the same validation, retry and deadline handling. The first turn receives that observation and attempt history; later turns receive the subsequent validated evidence. Empty inventory or failed discovery needs no model call. The automatic prerequisite is recorded as an evaluator action and executor attempts, rather than a model decision. This supports critique, shared state, branching and evaluator authority within one loop. It does not claim several autonomous model agents. Trace capture and a real scripted B excerpt are in the [CLI walkthrough](CLI_GUIDE.md#capture-and-read-the-decision-trace); bounds and failure policy are below and in the [CLI failure reference](CLI_GUIDE.md#failure-behavior).

`aws-operational.ts` owns bounded SSM and ELBv2 fact collection beneath the
existing AWS adapter. Shared contracts validate dated maintenance and target
registrations; the policy owns overlap decisions, reused by the runner and final
report validation. Native negative scans never supply positive safety proof.
[Source coverage and limits](AWS_TOOLS.md#native-operational-evidence) are canonical.

## Local report viewer

Live investigation Execution events include expandable model prompt and output
messages for each planner attempt. The adapter emits display copies of the actual
system/user messages before the request and assistant content before action parsing,
so malformed output remains inspectable. Credentials and private endpoints are
redacted before worker IPC; headers, provider envelopes and hidden reasoning are
excluded. Display text is bounded and rendered literally. These events stay in the
current local job, outside persisted reports/history and the metadata-only progress
contract. Failed calls retain their prompt and existing failure event without
inventing an assistant response. Scripted previews do not fabricate model messages.

`scripts/demo-web.ts` owns the dependency-free local HTTP surface and cached, on-demand
synthetic A/B/C/missing/mixed previews. Startup only serves the UI. Explicit
selection generates a preview; concurrent requests share its pending result,
and failed generation can be retried. `src/web/` separates preview-only Demo
content from Live investigation and decision recording across all
three tabs. Demo handlers reject run, decision and upload submissions. Live Learn
only displays the selected report's memory status; this web investigation path
does not enable live H-MEM recall/storage. Setup and interactions live in [How](HOW.md#open-the-web-demo).

`scripts/demo-web-jobs.ts` validates the allowlisted action, mode, scope and
service/write transport choices; it permits one isolated child worker at a time.
`scripts/demo-web-worker.ts` calls the existing investigator, H-MEM demonstration
or Zetaris follow-through functions directly. It never executes arbitrary shell
commands, accepts provider URLs/credentials from the browser, or exposes SQL.
The browser exposes only live investigations and live-report decisions.
For Live investigations the HTTP boundary binds the configured model, automatic
read-only Zetaris history when configured, and validated server `.env` AWS scope
(`AWS_EXPECTED_ACCOUNT_ID`, `AWS_REGION`, `CCI_MAX_CANDIDATES`, default limit 1).
Browser overrides are rejected; missing/invalid scope or model configuration fails
before worker startup. Clicking Run investigation is the explicit live-run action;
there is no configuration section or service checkbox. Setup errors use the existing
toast with `.env` and restart guidance, without showing a running job.
Only validated scope and configuration status are returned, never credentials. Existing
CLI/demo entry points and worker regression harnesses remain intact; optional
progress callbacks feed
bounded browser events. Offline investigations and learning never enable remote
history or models. Follow-through requires both server append configuration and
an explicit browser acknowledgment. The user-decision form reuses `recordDecision`
to validate and append a linked recommendation and attributed Accept/Defer event,
then verify exact readback. Its receipt exposes both record IDs. The separate
scripted demonstration uses a unique synthetic account.

Worker deadlines are 2 minutes for offline investigation/learning, 15 minutes
for a model investigation, 20 minutes for the multi-investigation model learning
demonstration, and 3 minutes for follow-through. Existing tool/model bounds
still apply. Stop/server shutdown terminates the worker; an IPC disconnect also
terminates an orphaned worker. Parent-owned temporary directories are cleaned on
worker exit, including cancellation. A cancelled or failed write can leave remote
records; history writes are never retried automatically. Latest job state,
current activity and at most 160 bounded progress events stay in server memory.
Job source mode is retained from the validated request before execution, so
failed/running live jobs remain identifiable without a result and synthetic jobs
cannot appear as live operations.
The runner emits active-stage heartbeats every two seconds; these replace current
activity rather than accumulating in the execution tree. Reconnecting polls that state without
starting another run; duplicate submissions of the current request ID reuse its
job only when their payload matches. Additional concurrent runs are rejected.

The upload boundary reuses `validateReport`; the browser renders text nodes,
never report-authored HTML. Only fixed assets and allowlisted API routes are
served. Exact Host/origin checks, loopback binding, restrictive content policy,
no-store responses, 2 MiB report uploads, 24 KiB ordinary action requests and bounded HTTP
requests protect the local boundary. Configuration status exposes booleans,
never credential or endpoint values. Uploaded reports are returned only to their
requesting page. A decision request may carry a report up to 2 MiB plus 24 KiB
of decision metadata; it uses the same report validator and requires explicit
write acknowledgment. Validation proves internal consistency, not external
authenticity or infrastructure approval. AWS remains read-only; remote writes
are limited to the acknowledged append-only decision flow and synthetic
follow-through demonstration.

## Sponsor technology explanation

| Technology | Integration and contribution | Recorded proof |
| --- | --- | --- |
| **Zetaris** | Dedicated, schema-validated history reads and explicitly enabled append/readback retain recommendations, operator decisions, due reviews and reported outcomes. This decision trail cannot be reconstructed from current telemetry. | [Real remote append/readback and decision follow-through](history/execution-log.md#distinct-memory-roles-and-decision-follow-through--2026-10-24) |
| **Meterless H-MEM** | The vendored local reference stores and retrieves scoped investigation lessons between runs. Relevant lessons prioritize fresh safety checks; linked structured rollback feedback can also teach a lesson. | [Real local persistence, cold/warm checks and changed-evidence correction](history/execution-log.md#learned-operational-check-cold-warm-and-changed-evidence--2026-10-24) |
| **NVIDIA** | A configured NVIDIA-hosted Nemotron model chooses the next allowlisted evidence check through the Chat Completions planner. Trusted code binds arguments and the deterministic evaluator decides the verdict. The default scripted demo makes no NVIDIA call. | [Actual NVIDIA model access and both-store warm investigation](history/execution-log.md#successful-real-model-access-retry-and-warm-proof--2026-10-24) |

These sponsor proofs use **synthetic operational evidence**. Real persistence and model calls do not establish live AWS scheduling safety. Reported outcomes are operator statements; the [memory comparison](evaluation/README.md#memory-order-comparison) does not establish a general speedup. The organizer's Nightshift wording remains a separate [event-compliance question](RULES.md#online-source-check--2026-10-24).

## Runtime ownership and bounds

- `src/contracts.ts` validates requests, actions and observations at runtime, rejecting scope/period mismatches, stale collection times, malformed data, unsupported fields and units.
- `src/investigation/run.ts` owns candidate ranking and the bounded planner → executor → evaluator loop. Only five read-only logical tools exist. The model chooses an allowlisted question; trusted code binds scope, window and current IDs. Model prose cannot authorize a verdict or infrastructure write.
- `src/investigation/mock.ts` owns synthetic direct evidence and A/B/C/mixed/clear/missing scenarios. Metrics summarize the suggested daily UTC window across the observed lookback. These are application contracts, not claims about available AWS endpoints.
- `src/investigation/report.ts` validates the final report, retrieved-current citations and the chronological proposed → supported/contradicted/unresolved transition; it renders the detailed CLI trace.

Candidate collection is independent of recommendation clearance: partial or unavailable metrics still permit operations/dependency reads, with no invented window. A tentative low-utilization window can cite partial observations. A conflict is retained while remaining checks run; complete evidence is still required for a recommendation. Model choices exclude finishing while candidate reads remain. Memory changes check priority, not whether the remaining checks run.

Hard bounds: two logical discovery actions, up to four attempts each (eight total);
twelve tool attempts per candidate; the existing aggregate planner cap of
`2 + 7 * max_candidates` (23 maximum), including recovery attempts, remains.
Automatic inventory consumes tool attempts but no planner call, so a successful
run uses one fewer planner call. Per-candidate planning still allows seven calls.
Tools allow 5s per mock call and 25s per AWS call (around the collector’s 20s deadline).
Scripted planning defaults to 15s per call and 120s overall. Live planning allows
60s per call and 15 minutes overall; explicit total limits above 15 minutes are
rejected. All model calls, evidence calls, pacing and history recall/persistence
share that deadline. External waits stop five seconds early for report
finalization (10% of the budget when the total is below 50s). Explicit shorter
limits still apply. Waiting is bounded even for adapters that ignore cancellation;
this cannot guarantee cancellation of remote work or survive a blocked event loop.
On exhaustion, preserve completed verdicts and evidence, defer unresolved candidates,
and return a partial report (failed if no evidence). Persistence timeout discloses
uncertain writes without retrying. Elapsed time records actual duration, including
scheduler delays; report validation also accepts truthful older measurements.
The runner alone owns transient planner retries: at most three attempts for one
decision, 2s/4s exponential waits with 0–25% jitter, honoring longer valid
`Retry-After` values. Attempts share the existing planner-call limits (including
seven per candidate); waits share the runtime deadline. No retry layer exists in
the model transport. Permanent errors and invalid output remain terminal; exhausted
retries preserve findings and defer unresolved work. See [recovery and live
progress](CLI_GUIDE.md#planner-recovery-and-live-progress).

Model responses are capped at 32 KiB. Every attempted call counts, including
failures. The executor retries failed read-only evidence calls up to three times after the initial attempt, with 2s/4s/8s backoff and positive jitter. Every retry consumes the existing twelve-attempt per-candidate cap and aggregate deadline; discovery has eight physical attempts for its two logical actions. Invalid/scoped output and cancellation remain terminal; partial/no-match are not failures. A planner repeating an already attempted action still defers the active candidate. Only the final response enters the evidence registry; all attempts remain in the trace. Every new step carries the run-correlating trace ID, evidence-support confidence and actual retry counter; see the [trace contract](CLI_GUIDE.md#capture-and-read-the-decision-trace). A later
failure preserves completed candidates; exhausted aggregate budgets explicitly
defer the remainder. Missing evidence never becomes zero or proof of safety.
Only daily same-day UTC windows are supported; overnight windows must be split
by a future adapter.

Decision and savings rules live in the [product contract](PROJECT_CONTEXT.md#6-decision-policy). Current integration proof and remaining gaps live in the [execution plan](EXECUTION_PLAN.md).

## Meterless design choices

**Extend reusable investigation methods through the existing H-MEM boundary.**
Today, `memory.ts` stores two typed operational lessons; `history.ts` recalls
scoped hints; the planner orders fresh checks; the runner and deterministic
policy validate evidence and decide the verdict. Zetaris separately owns the
operator decision trail and follow-through. Linked rollback outcomes with a typed
check can now teach H-MEM which question to verify first; raw history and prose
never order the planner. [Outcome learning](FOLLOW_UP.md#automatic-learning-from-outcomes). This implements the useful
core of the earlier memory recommendation.

The [recorded fixed-order comparison](evaluation/README.md#memory-order-comparison) does not establish a general speedup or justify richer memory. Next, evaluate any
proposed reusable method against the same fixed baselines, counting teaching
cost, completion, correctness and tool/model calls. Promote a method only after
it shows a repeatable benefit without weakening fresh safety checks.

| Earlier recommendation | Fit with this implementation |
| --- | --- |
| H-MEM and reusable methods | Best architectural fit; extend typed lessons only after measured benefit |
| Nightshift-style evaluation | Useful way to discover failure cases; extend `evaluate-memory.ts` before introducing a runtime or new agents |
| World Model | Defer until real dependency evidence needs relationships beyond the existing contracts |
| Markovian compression | Defer; current bounded scope has at most three candidates and capped planner calls |
| Local Meterless runtime | Optional provider experiment; protocol, model approval and behavior need separate verification |

## Reused components

The product entry point is the investigation CLI. It reuses the checked-in [Meterless H-MEM reference](../vendor/hmem/README.md) and retains the inherited notebook as a separate optional tool. Model planning supports NVIDIA-compatible requests; actual sponsor use is recorded in the [execution evidence](EXECUTION_PLAN.md). The inherited `notebook.ts` and vendored H-MEM reference are reused starter components, not newly authored sponsor engines. The investigation CLI, direct evidence adapters, policy, validated report and follow-up workflow are the project-specific extension; Git history must establish exact build-window attribution before submission. The notebook is optional and is not invoked by the demo. Preserve the upstream [H-MEM attribution](../vendor/hmem/README.md).
