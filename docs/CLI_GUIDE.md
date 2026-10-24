# CLI guide and recorded results

[Documentation index](README.md)

[Project overview](../README.md) · [Components](components.md)

## Memory and decision follow-through

| Component | Responsibility | What it must not establish |
| --- | --- | --- |
| **Meterless H-MEM** | Reuse scoped investigation lessons: which operational question to verify first | Current facts or permission to shut down |
| **Zetaris** | Query recommendations, explicit operator decisions, due reviews and reported outcomes | Current telemetry or planner check order |
| **Direct tools** | Fetch and validate evidence for the present conclusion | A history of human intent that telemetry cannot reconstruct |

**Measured honestly:** on eight equally weighted workloads, H-MEM **tied both
fixed check orders**: each matched 8/8 expected verdicts, with 47 planner calls
and 38 tool calls (7 complete investigations, 1 expected partial deferral).
Recurring blockers can benefit; changed blockers can make remembered ordering
worse. The prior investigations used to teach memory cost another 45 planner
calls / 37 tools if run solely for training. This does not establish general
superiority over rules. [Full comparison](memory-order-evaluation.json).

**Zetaris contributes a different capability:** the same current telemetry can
correspond to a deferred recommendation or an accepted one. The database retains
that intent and its follow-through. A [real Zetaris demonstration](follow-up-zetaris.json)
passed all eight checks: retrieve a due deferral → investigate fresh evidence →
record the changed verdict; retrieve an acceptance → append an attributed rollback
outcome. Evidence and operator decisions in this demonstration are **synthetic**;
Zetaris persistence is real. Outcomes are **operator-reported**, not independently
verified implementation or measured savings. Nothing modifies AWS.

```bash
npm run --silent evaluate:memory > /tmp/memory-evaluation.json
# Explicit live Zetaris append/readback; retains seven labeled synthetic records:
npm run --silent demo:followup > /tmp/follow-up.json
npm run followup -- --help
```

[Manual decision and follow-up workflow](FOLLOW_UP.md) covers both paths,
validation, source labels and limitations. No new production dependencies or
remote table creation are required.

### Preserved warm-run demonstration

**Meterless H-MEM lets an investigation remember which operational check mattered
last time, verify it again, and reach the correct conclusion with less work.**
Our adapter stores a typed lesson from a cited contradiction; H-MEM persists and
retrieves it between runs. The planner uses that lesson to order fresh checks.
The deterministic evaluator still decides the outcome from current evidence.

| Run | Operational checks | Result | Planner / tool calls |
| --- | --- | --- | --- |
| Cold, no memory | Jobs → dependencies | Reject: dependency requires continuous operation | 6 / 5 |
| Warm, recalled lesson | Dependencies first | Same rejection, backed by fresh evidence | 5 / 4 |
| Changed evidence | Dependencies → jobs | Old conflict cleared; conditional recommendation | 6 / 5 |

**In this recurring-dependency fixture: 16.7% fewer planner calls and 20% fewer
tool calls on the warm case.** The scripted three-phase proof passes all 15 checks, including
fresh citations and persisting the corrected conclusion. Real local H-MEM is
reopened between phases; Zetaris is disabled to isolate its contribution.

The [user-run live-model artifact](warm-learning-user-model.json), using
`gpt-6.1-sol`, records cold **49.656 s** → warm **39.336 s**: **10.320 s (20.8%)**
less elapsed time in one pair. Its changed phase failed with
`model_transport_unavailable`, so the full live attempt **failed**. Separate
[NVIDIA evidence and changed-phase recovery](#learn-a-check-finish-earlier-then-change-the-conclusion)
are recorded below. Neither attempt establishes an uninterrupted live three-phase
pass or a general latency guarantee; elapsed times include deliberate call pacing.

```bash
npm run demo:warm
# Configured live model; progress on stderr, final report on stdout:
npm run --silent demo:warm -- --planner model --json > /tmp/warm-learning.json
```

**Evidence is synthetic in both modes; H-MEM persistence is real.** This proves
memory-guided investigation behavior, not live AWS integration, model training,
or production accuracy. The selected fixture rewards checking dependencies first;
this is a cold-versus-warm comparison, not a claim to beat every fixed rule order.
See the [full methodology and retained results](#learn-a-check-finish-earlier-then-change-the-conclusion).

## Fresh-machine setup

1. Install Node.js **24+** and npm, clone this repository, and run `npm ci`
   from its root. H-MEM is already vendored.
2. Create local configuration with `cp .env.example .env` **only if `.env`
   does not exist**. Otherwise merge the needed keys; keep credentials untracked.
   The CLI loads this file from the working directory; shell settings take precedence.
3. For a credential-free smoke run, use
   `npm run investigate -- --evidence mock --account demo --region us-east-1`.
   To use AWS, configure a read-only SDK profile/SSO or workload role following
   [AWS authentication](AWS_TOOLS.md#authentication-and-live-smoke-check).
   For real-model planning, complete [model configuration](#model-configuration).
4. To retain Zetaris history, complete [lakehouse provisioning](ZETARIS_HISTORY.md#required-local-docker-setup-history-lakehouse)
   on the Zetaris server before running its probes: create persistent storage,
   register `CCI_HISTORY`, create the dedicated table, and configure the app user.
   Set `ZETARIS_CCI_HISTORY_PATH` in `.env` as your provisioning reference;
   **the app does not consume this variable**. Use that path in the server setup
   and lakehouse registration. `ZETARIS_HISTORY_TABLE` is the runtime SQL target.
   Keep `ZETARIS_HISTORY_ALLOW_APPEND=false` until permissions are reviewed;
   the guide explains the explicit write/readback probe and its retained record.

History is optional. To run without a provisioned Zetaris service, leave
`ZETARIS_HISTORY_TABLE` empty in `.env`; the example's nonempty table enables
history reads. Leave `HMEM_PERSIST_DIR` unset to disable local reasoning memory.
`LARGE_LLM_MODEL` is an unused legacy local key; use `LLM_MODEL` for the planner.

## Run

Requires Node.js **24+** and npm. The repository uses `package-lock.json`; AWS SDK clients are installed from that lockfile. The H-MEM reference is checked into `vendor/hmem`; investigation runs do not require downloading or setting up H-MEM.

```bash
npm ci
npm run investigate -- --evidence mock --account demo --region us-east-1
npm run investigate -- --evidence mock --account demo --region us-east-1 --scenario missing
npm run investigate -- --evidence mock --account demo --region us-east-1 --scenario mixed --max-candidates 3
```

The first command shows the detailed report and trace. The missing-source variation returns `needs_verification`, `partial`, and exit status **2**. `--scenario clear` supplies an empty job query and continues to dependencies; it still defers positive clearance. Scenario A supplies explicit owner/calendar/recovery clearance and compute pricing for a conditional recommendation; C supplies a continuous-operation dependency. `mixed` investigates A/B/C in ranked order from four synthetic instances. Supported flags:

```text
--account ID          required; AWS mode requires the actual 12-digit account
--region REGION       required
--lookback-days N     mock: 1–90, default 28; aws: 1–14, default 14 complete UTC days
--max-candidates N    1–3 ranked candidates; default 1
--evidence mock|aws   default aws; mock requires explicit selection
--scenario A|B|C|mixed|clear|missing   mock evidence only
--planner scripted|model|nvidia
--json
```

For machine-readable stdout without npm's script banner:

```bash
node --import tsx cli.ts investigate --evidence mock --account demo --region us-east-1 --json
```

For read-only AWS setup, billing opt-in and source limitations, see the
[AWS tools guide](AWS_TOOLS.md#investigation-cli).

Exit codes: **0** completed scoped recommendations/rejections/no eligible candidates; **2** partial; **1** failed investigation, invalid invocation, or planner configuration. `complete` concerns the investigated window; it does not mean the project or sponsor gates are finished.

## Model configuration

The executable loads `.env` from the current working directory automatically; existing shell variables take precedence. Copy [.env.example](../.env.example) to `.env` only if you do not already have one, then select the generic adapter:

```bash
npm run investigate -- --evidence mock --account demo --region us-east-1 --planner model
```

Set `LLM_BASE_URL` (including `/v1` when required), `LLM_MODEL`, and `LLM_API_KEY` for your OpenAI-compatible Chat Completions provider. The adapter appends `/chat/completions`. Local loopback HTTP servers can omit the key; remote endpoints require HTTPS. Generic configuration never inherits an NVIDIA key. Keep provider credentials server-side.

`LLM_RESPONSE_FORMAT` defaults to `text` (JSON is still required in the response). Choose `json_object` or `json_schema` only if supported. `LLM_EXTRA_BODY` accepts JSON provider options, including either `max_tokens` or `max_completion_tokens` (1–4096); it cannot override messages, model, tools or streaming. Remove NVIDIA-specific options when switching providers. Provider compatibility depends on Chat Completions and instruction-following support; arbitrary providers were tested with mocked transport, not live credentials.

For `https://api.openai.com/v1`, the default limit is
`max_completion_tokens: 1024`; other providers retain `max_tokens: 1024`.
Either explicit limit in `LLM_EXTRA_BODY` overrides the default. OpenAI reasoning
models such as `gpt-6.1-sol` need `max_completion_tokens`. If reasoning consumes
the limit before producing JSON, the planner reports `model_incomplete_response`;
raise the limit within the supported 4096-token cap if needed.

With no `LLM_*` settings, `--planner model` falls back to `NVIDIA_API_KEY` and optional `NVIDIA_MODEL`. The legacy `--planner nvidia` selects that NVIDIA preset explicitly. Model IDs are configurable; the team confirmed `nvidia/nemotron-3-ultra-550b-a55b` for this event on Oct 24. Runtime access is a separate gate. The default `scripted` planner runs offline.

All model paths preserve bounded requests, validated actions, trusted argument binding and deterministic verdicts. Redirects are refused. Failures return incomplete results without scripted fallback. Evidence selection is independent: read-only AWS by default, synthetic evidence with `--evidence mock`. See [the execution plan](EXECUTION_PLAN.md) for actual integration proof.

## Safety and ownership

- `src/contracts.ts` validates requests, actions and observations at runtime, rejecting scope/period mismatches, stale collection times, malformed data, unsupported fields and units.
- `src/investigation/run.ts` owns candidate ranking and the bounded planner → executor → evaluator loop. Only five read-only logical tools exist. The model chooses an allowlisted question; trusted code binds scope, window and current IDs. Model prose cannot authorize a verdict or infrastructure write.
- `src/investigation/mock.ts` owns synthetic direct evidence and A/B/C/mixed/clear/missing scenarios. Metrics summarize the suggested daily UTC window across the observed lookback. These are application contracts, not claims about available AWS endpoints.
- `src/investigation/report.ts` validates the final report, retrieved-current citations and the chronological proposed → supported/contradicted/unresolved transition; it renders the detailed CLI trace.

Hard bounds: two discovery tool attempts; six tool attempts per candidate; two
discovery plus seven planner calls per candidate (23 maximum); 5s per tool.
Scripted planning defaults to 15s per call and 120s overall. Live planning allows
5 minutes per call, with an aggregate deadline based on the bounded call count
and configured pacing plus two minutes. Explicit shorter limits still apply.
Model responses are capped at 32 KiB. Every attempted call counts, including
failures. Identical repeated tool actions defer the active candidate. A later
failure preserves completed candidates; exhausted aggregate budgets explicitly
defer the remainder. Missing evidence never becomes zero or proof of safety.
Only daily same-day UTC windows are supported; overnight windows must be split
by a future adapter.

A rejected window requires a later retrieved current conflict. Empty/non-authoritative sources cannot clear scheduling safety. Conditional recommendations require complete authoritative discovery, at least seven days of low-average/low-peak utilization at ≤5-minute aggregation, both targeted operational challenges, no overlapping jobs, no continuous dependency, and matching positive owner/calendar/recovery clearance. Empty job queries alone never suffice. Human review remains required for any eventual shutdown.

## Savings assumptions

`src/investigation/policy.ts` computes a **USD compute-only estimate for the UTC calendar month following the observation window**. Both operations and dependencies must explicitly clear that month, the daily window, reviewed excluded dates and stop/start recovery overhead. Billing must provide a valid marginal on-demand hourly rate, known commitment treatment, billing granularity and explicit exclusion of retained costs. Other currencies, commitments, expired prices and missing assumptions produce `null`; prices are never inferred from historical total spend.

The calculation subtracts excluded days, subtracts per-window overhead, rounds daily avoided time down to billing units, then multiplies by the hourly compute rate and rounds down to USD cents. Fixture A uses 00:00–06:00 UTC, one excluded date, 30 minutes overhead, 60-minute billing units and **synthetic** USD 0.50/hour. For October that is `(31 − 1) × 5 × 0.50 = USD 75`. EBS, networking and other retained charges remain excluded. This is a conditional planning estimate; human approval and revalidation are required before any eventual scheduling.

## H-MEM and Zetaris

With both stores configured, applicable structured rollback outcomes automatically
teach H-MEM check ordering on the next matching investigation. See the
[outcome-learning example and limits](FOLLOW_UP.md#automatic-learning-from-outcomes).
This new path has offline fixture proof; earlier live sponsor proofs do not verify
outcome learning against the live deployment.


```bash
npm run probe:hmem
```

This performs a genuine **local Meterless H-MEM reference** store → disk persistence → new engine instance → retrieval, using a compact summary of an executed mock B investigation. It uses and removes its own temporary directory. Summaries carry scope, timestamp, hypothesis, decision reason, unresolved risks and provenance; historical IDs never become current evidence. The adapter supports caller-owned persistent directories, isolated per account/region, and validates stored data on read and write. The reference uses local deterministic embeddings and single-writer JSON persistence. This proof does **not** establish a hosted service or warm-run query-priority behavior.

The CLI reads historical recommendations for audit and recalls H-MEM lessons after fresh inventory/billing selects an instance, then persists
a validated summary after evaluation. Set `HMEM_PERSIST_DIR=.cci-memory` for local
reasoning memory. Setting `ZETARIS_HISTORY_TABLE` enables scoped history reads;
appends still require the explicit opt-in below. The Zetaris adapter provides validated, account/region-scoped reads and explicitly
enabled append/read-back, restricted to the `CCI_HISTORY` lakehouse. No generic SQL
or credentials are exposed to the planner.

Configure the Zetaris section of [.env.example](../.env.example) in your local `.env`:
use the **Web UI origin** as `ZETARIS_BASE_URL`, your dedicated app user's
`ZETARIS_USERNAME`/`ZETARIS_PASSWORD`, `ZETARIS_AUTH_MODE=password`, and
`ZETARIS_HISTORY_TABLE=CCI_HISTORY.investigations.records`. The login response supplies
the organisation ID; an optional `ZETARIS_ORG_ID` must match it. Legacy bearer-token
mode remains supported. The app never needs the lakehouse filesystem path.

**Required setup:** follow the [local Docker lakehouse and table setup](ZETARIS_HISTORY.md#required-local-docker-setup-history-lakehouse).
For a new installation, run [the dedicated table SQL](../scripts/zetaris-history.sql) once as administrator,
verify the app user's table-scoped read/append permissions, then enable
`ZETARIS_HISTORY_ALLOW_APPEND=true` when ready for writes. Existing `.env` values
are never overwritten by these scripts. HTTP requires `ZETARIS_ALLOW_HTTP=true`,
which the user authorized for this deployment; HTTPS remains preferred.

Manual checks (outside normal tests and the LLM integration test):

```bash
NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:zetaris
NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:zetaris:history
# After table provisioning, permission review and explicit append enablement:
NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:zetaris:roundtrip
```

The first validates SELECT 1; the second checks the configured table schema (or
catalog metadata when no table is configured). The round-trip probe writes one
synthetic mock-B history record and verifies a scoped readback; it retains that
labeled record. The user reported a successful real Zetaris round-trip on
2026-10-23 with mock investigation evidence; effective least-privilege permissions
remain a deployment responsibility. Warm CLI history use is now independently verified
with the configured Zetaris service and local H-MEM reference over mock AWS evidence.
The adapter is an MVP with one writer, not an atomic uniqueness guarantee under
concurrent writers. Failed or ambiguous inserts are never automatically retried.

Run the configured integration proof explicitly:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:warm
# Same two-run assertions with the configured real model (no scripted fallback):
NODE_TLS_REJECT_UNAUTHORIZED=1 npm run probe:warm -- --planner model
```

It runs the CLI twice under a unique synthetic account, retains two labeled mock
history records in Zetaris, and removes its temporary H-MEM directory. Run 1
checks operations first and learns to recheck the overlapping critical job. Run 2
reads both stores and rechecks operations first using the H-MEM lesson. Zetaris records are audit context and no longer set check order. Both verdicts cite fresh
mock evidence. The scripted planner follows this priority deterministically;
the model planner receives the same bounded hints and instruction, with its
actual action visible in the trace. The earlier real-model cold/warm pair passed on
Oct 24 with `nvidia/nemotron-3-ultra-550b-a55b`, remote Zetaris and local H-MEM
over mock current evidence; see the execution plan for timings and calls.
Historical text and old evidence IDs are
excluded from planner hints. A cleared or unavailable fresh job source cannot
inherit the old rejection. Source read statuses and write outcomes are reported
separately; unavailable history never substitutes for operational evidence.
Do not run concurrent writers against the same local memory directory.

### Learn a check, finish earlier, then change the conclusion

```bash
# Offline planner, real vendored H-MEM on disk, synthetic current evidence:
npm run demo:warm
# Real configured model; five-second pacing before every planner call:
npm run --silent demo:warm -- --planner model --json > /tmp/warm-learning.json
```

Progress goes to stderr immediately; final JSON is written after the proof ends.
The three-run demonstration uses a temporary, isolated H-MEM directory and never
enables Zetaris or AWS calls, even if they are configured in `.env`:
1. **Cold C:** check jobs, then discover a dependency requiring continuous
   operation. Persist a typed `dependency_continuous_operation` lesson with
   instance scope, the UTC shutdown window and its original evidence reference.
2. **Warm C:** reopen H-MEM, retrieve the lesson and check that dependency first.
   Reject from newly retrieved evidence, saving one planner call and one tool
   call when the model follows this path. The proof fails if it does not.
3. **Changed A:** recall the same lesson, retrieve fresh evidence that clears
   the dependency, then verify operational clearance. Issue a conditional
   recommendation and persist the updated summary. Reopening memory must select
   that correction without reviving the older conflict.

The default scripted demonstration measures 6 → 5 planner calls and 5 → 4 tool
calls from cold to warm. Wall-clock improvement is measured separately and can
vary; call savings are not a guaranteed latency reduction. The changed run needs
both safety checks and therefore uses six planner calls. Fresh evidence IDs must
be disjoint across runs, and every full report passes runtime validation.
Real-model failures are retained, produce exit 1 and never trigger scripted
fallback. Temporary memory is removed; the JSON retains the lesson, correction,
full reports and acceptance checks. These are designed fixtures, not production
accuracy or live operational-integration proof.

Only authoritative, cited contradictions teach a lesson. Recalled lessons are
scoped to account, region, instance, evidence mode and matching proposed window.
Historical evidence IDs and free-form memory text stay out of model hints.
The trace records `confirmed`, `not_observed` or `unresolved` against fresh
evidence. Clearing one old conflict does not by itself establish scheduling
safety; missing or partial fresh evidence still defers. Legacy summaries without
lessons remain readable.

Recorded live results with `nvidia/nemotron-3.5-super-vl-120b-a12b`: cold/warm
rejections used **6 → 5 planner calls**, **5 → 4 tools**, and **148.0 → 55.2 s**.
The third phase hit HTTP 500, so that [full attempt failed](warm-learning-model-attempt1.json).
An [explicit changed-phase recovery](warm-learning-model-recovery.json)
later passed all nine checks, issuing a conditional recommendation in **88.2 s**
and persisting the correction. A first recovery exposed repeated mock IDs across
processes; UUID evidence IDs fixed that provenance check. All failed measurements
remain linked in the execution plan. These results demonstrate the intended
behavior and preserve the provider reliability limitation.

### Measured fixture evaluation

```bash
npm run evaluate
# Explicit opt-in: real configured model, up to eight bounded investigations:
NODE_TLS_REJECT_UNAUTHORIZED=1 npm run evaluate -- --planner model
```

The evaluation compares the investigation against a fixed average-CPU <=10%
heuristic on eight labeled synthetic cases: A/B/C, missing operational data,
empty jobs without clearance, high peaks, partial operations and unknown
commitments. Both paths share discovery ranking and independently retrieve mock
observations. Evaluation never enables history or remote appends. The default
uses the existing scripted planner to measure deterministic safety policy;
`--planner model` uses the real configured planner without fallback. Failed or
absent predictions remain in the denominator. The command exits nonzero for
any label mismatch, failed investigation or planner failure, even when a failure
incidentally produces the expected deferral label. A correct partial deferral
without planner failure can still pass the evaluation.
Scenario D is a separate two-run `probe:warm` proof.

New evaluation output reports `execution.complete`, `execution.partial` and
`execution.failed` independently of `investigation.disposition_correct`.
`execution.planner_failure_cases` counts affected cases;
`execution.matching_dispositions_with_planner_failure` exposes incidental label
matches, and `execution.failure_code_counts` counts failure events by code.
Each case includes `investigation.planner_failures` with trace step and code.
Existing stored measurements predate these fields and remain unchanged.
The [new diagnostic measurement](evaluation-model-diagnostics.json) captured
three `planner_timeout` cases at the existing 15-second per-call limit: C,
clear-without-authority and unknown commitments. It reports 6/8 matching labels,
2 complete, 6 partial and one matching label reached after timeout. It remains
a failed evaluation; no retry or timeout increase was used to hide the failures.

Capture a fresh diagnostic run without npm's banner in the JSON:

```bash
npm run --silent evaluate -- --planner model --verbose > /tmp/evaluation.json
```

`--verbose` prints elapsed time, case number, planner calls and their timeout,
tool/trace steps, sanitized failure codes and each case's completion on **stderr**.
Progress stays visible in the terminal when stdout is redirected. The JSON file
stays empty until all eight cases finish; live-model evaluation can take several
minutes. Without `--verbose`, the evaluator is silent until the final JSON.
To save progress too, add `2> /tmp/evaluation-progress.log` (or watch that file
with `tail -f`). Interrupting the run leaves no final JSON report. This switch
also works with the default scripted planner.

HTTP failures now retain `provider_error: { body, truncated }` in
`rows[].investigation.planner_failures[]` and `trace[]`. The same diagnostic
appears immediately on stderr with `--verbose`, and in readable CLI reports.
JSON error fields such as `message`, `detail`, `code` and `type` are retained;
plain-text/HTML error responses are also supported. Credentials, configured
scope identifiers, URLs, request/header objects and stack fields are redacted
or omitted. Reads stop at 8 KiB or one second, and the sanitized excerpt is
limited to 2048 characters. Empty or unreadable bodies are labeled explicitly;
`truncated` flags incomplete capture. The original `model_http_NNN` code remains
unchanged. This supersedes the earlier behavior of dropping all error bodies;
older measurements cannot recover discarded details. No extra requests or retries
are made to collect an error body.

Run one case at a time to diagnose a free endpoint:

```bash
npm run --silent evaluate -- --planner model --case missing --verbose > /tmp/evaluation-missing.json
```

Case IDs: `A`, `B`, `C`, `missing`, `clear_without_authority`, `high_peak`,
`partial_operations`, `unknown_commitments`. With `--case`, scores and denominators
cover only that case; `selected_cases` records the selection. Omitting it runs
all eight cases sequentially. Within one process there are no parallel model
calls. Avoid starting multiple evaluation processes at once.

Live evaluation now pauses **5 seconds before every planner call**, including the
first call of each case. Use `--delay-ms 15000` for a longer pause (allowed range
0–60000). Scripted evaluation defaults to no pause. The report records
`planner_delay_ms`; verbose output shows each pause.

Live planner and HTTP request deadlines are now **5 minutes per call**. The
aggregate deadline scales with the bounded planner-call count and pacing, plus
two minutes for other work (47 minutes 45 seconds for one evaluation case with
the default pacing). Explicit shorter runner deadlines still apply; tool timeouts
and call-count budgets are unchanged. These settings supersede the limits used
by the historical measurements above. A five-minute timeout ends our wait; it
does not establish that the provider stopped processing.

An HTTP 500 response still fails immediately: increasing timeouts cannot repair
an error the server has already returned. Overload is a possible cause, but the
sanitized status alone cannot establish it. No automatic retries or fallback
were added; preserve failed results when making a separate diagnostic run.

The readable CLI trace displays `[failure_code]`; JSON reports include optional
`trace[].failure_code`. Older reports without codes still validate. Codes are
runtime-validated against fixed values or `model_http_NNN` (HTTP 100–599).
No raw provider body, exception message, URL, prompt, credential or stack trace
is copied into the diagnostic field. Relevant codes include:
- `planner_timeout`: the investigation's per-planner-call wait expired;
  `investigation_deadline_exceeded`: the shared total deadline expired.
- `model_http_403`, `model_http_429`, etc.: actual non-200 HTTP status;
  `model_transport_unavailable`: connection/transport failure.
- `model_timeout`: the model adapter's native request deadline expired;
  `model_cancelled`: its supplied signal was cancelled. The orchestrator reports
  its own timeout code when its shorter deadline ends the wait.
- `model_invalid_response`: malformed response envelope/body;
  `model_incomplete_response`: missing or non-complete model output;
  `model_invalid_action_json`: action content could not be parsed as JSON;
  `model_invalid_choice`: parsed JSON violates the allowed action schema/choices.
- `planner_invalid_action`: returned executor action fails runtime validation;
  `planner_unknown_failure`: an exception has no recognized public code.

TLS refusal and oversized input retain `model_tls_verification_required` and
`model_state_too_large`. No retries or scripted fallback were added. These codes
describe new runs; exact causes cannot be reconstructed from older generic
`planner_unavailable_or_invalid` results.

[Recorded scripted results](evaluation-scripted.json) and
[real-model results](evaluation-model.json) include expected and
actual verdicts, unsafe and unverified positives, candidate/hypothesis citation
validity, elapsed milliseconds, tool attempts and planner calls. These are a
small designed fixture set, not production accuracy or evidence that a model
outperforms rules. Model cost is unknown because the planner does not capture
usage/billing. The Oct 24 real-model measurement matched 5/8 dispositions with
no unsafe positives, but only 1/8 investigations completed and five had planner
failures. Two matching deferrals also had planner failures, so matching verdicts
must not be presented as successful investigations. The real-model cold/warm
integration proof separately passed. See the execution plan for exact evidence.

## Linting and formatting

After `npm install`, use the development-only [Biome](https://biomejs.dev/)
toolchain:

```sh
npm run lint          # Check lint rules without changing files
npm run lint:fix      # Apply safe lint fixes
npm run format:check  # Check formatting without changing files
npm run format        # Format supported project files
```

Biome respects `.gitignore` and excludes `vendor/` and `package-lock.json`.
The initial installation preserves existing source formatting and lint findings;
the write commands can affect existing work, so review their diff.

## Verify

```bash
npm test
npm run typecheck
npm run probe:hmem
```

Tests cover actual discovery/rejection, changed jobs and suggested windows, missing/partial/error data, scope/UTC/units, invalid model actions, forged citations, repetition, budgets, timeouts and H-MEM persistence/isolation failures. NVIDIA HTTP tests are mocked; live proof is recorded separately. The test runner disables process isolation for the managed environment's process restrictions. Typecheck covers the investigation CLI, contracts, adapters, scripts and tests. The inherited notebook's optional Anthropic SDK is outside this check; the legacy root typecheck still needs that uninstalled optional SDK.

### Manual LLM integration test

```bash
npm run test:integration
```

Run this explicitly when checking access. It loads `.env`, uses the same `LLM_*`
configuration (or legacy NVIDIA preset) as the CLI, makes **one real model call**,
and validates the returned planner action. No AWS or Zetaris tools execute.
It verifies TLS, refuses redirects, times out within 25 seconds, and reports
sanitized failures rather than provider response bodies. Provider charges may apply.
Missing configuration or unavailable access fails the test; nothing is silently skipped.
`model_http_400` indicates a rejected request; a valid key alone does not establish
parameter compatibility. Check for an explicit `max_tokens` on an OpenAI reasoning
model or provider-specific options retained in `LLM_EXTRA_BODY`.
`model_http_405` means the selected route rejected the POST method. Check that
`LLM_BASE_URL` is the provider's Chat Completions base URL; the adapter appends
`/chat/completions`. Codex backend and Responses-only routes are different
protocols and are not supported by this Chat Completions adapter. Obtain the
provider's documented compatible base URL and matching credential; do not guess
another destination for the existing key.

`npm test` runs only offline tests in `tests/*.test.ts`; the live test lives in
`tests/integration/llm.test.ts` and runs only via explicit integration-test invocation.
No integration command was added to normal tests or build hooks.

The original notebook remains available with `npm run notebook -- ...`. Its `.notebook/` state is independent of investigation memory. Avoid `npm run setup` unless intentionally refreshing the vendored starter; it downloads an upstream copy.

Product scope, rationale and executed milestone evidence live in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), [memory.md](../memory.md), and [EXECUTION_PLAN.md](EXECUTION_PLAN.md). AWS live adapters, effective least-privilege deployment permissions, live-model A/C/D evaluation and submission assets remain separate gates. Scripted fixture evaluation is recorded above; selected-model approval is team-confirmed.
