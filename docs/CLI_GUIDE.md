# CLI reference

[What](../README.md) · [How](HOW.md)

When partial or unavailable metrics prevent an initial window, the report uses
`metrics_evidence_incomplete` and explains that targeted jobs/dependency checks
were not reached. This is a prerequisite stop, not evidence that those workloads
are absent. Metric sample counts and affected fields appear in the report;
optional inventory metadata is separate from resource discovery coverage.
[Owner statements captured in the web UI](HOW.md#open-the-web-demo) are separate,
unverified report context and do not change the verdict.

## Run

Install dependencies using [How](HOW.md#run-the-demo) first.

```bash
npm run --silent investigate -- --evidence mock --account demo --region us-east-1
npm run --silent investigate -- --evidence mock --account demo --region us-east-1 --verbose
npm run --silent investigate -- --evidence mock --account demo --region us-east-1 --scenario missing
npm run --silent investigate -- --evidence mock --account demo --region us-east-1 --scenario mixed --max-candidates 3
```

The default text leads with each candidate's verdict, proposed UTC window, reason,
decisive source statuses, next human action and savings (or unknown). It labels
mock evidence and conditional estimates, shows sample counts when available,
and retains run status and the stop reason. Rejection applies to the evaluated
window; human approval is still required for any change. `--verbose` prints the
comprehensive report: full evidence, citations, checks, assumptions, actions,
owner context, trace, history and budgets. `--silent` suppresses npm's own script
banner; direct Node invocation also emits only the application's output.

The missing-source variation returns `needs_verification`, `partial`, and exit status **2**. `--scenario clear` supplies an empty job query and continues to dependencies; it still defers positive clearance. Scenario A supplies explicit owner/calendar/recovery clearance and compute pricing for a conditional recommendation; C supplies a continuous-operation dependency. `mixed` investigates A/B/C in ranked order from four synthetic instances. Supported flags:

```text
--account ID          required; AWS mode requires the actual 12-digit account
--region REGION       required
--lookback-days N     mock: 1–90, default 28; aws: 1–14, default 14 complete UTC days
--max-candidates N    1–3 ranked candidates; default 1
--evidence mock|aws   default aws; mock requires explicit selection
--scenario A|B|C|mixed|clear|missing   mock evidence only
--planner scripted|model|nvidia
--verbose             comprehensive human-readable report
--json
--trace-jsonl
```

For machine-readable stdout without npm's script banner:

```bash
node --import tsx cli.ts investigate --evidence mock --account demo --region us-east-1 --json
```

For read-only AWS setup, billing opt-in and source limitations, see the
[AWS tools guide](AWS_TOOLS.md#investigation-cli).

Exit codes: **0** completed scoped recommendations/rejections/no eligible candidates; **2** partial; **1** failed investigation, invalid invocation, or planner configuration. `complete` concerns the investigated window; it does not mean the project or sponsor gates are finished.

## Capture and read the decision trace

See the [strong trace example](TRACE_EXAMPLE.md) for an actual model-driven proposal, evaluator challenge and evidence-backed rejection.

The CLI prints a concise final summary by default, the full readable report with
`--verbose`, one JSON report with `--json`, or readable decision events with
`--trace-jsonl` to stdout. The three flags are mutually exclusive; invalid or
duplicate output flags fail before any service call. JSON and JSONL retain their
complete existing schemas. JSONL is emitted after report finalization; it does
not stream events or automatically create files. Capture a fresh, isolated B run
with no model, AWS or historical-service calls:

```bash
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario B --verbose > /tmp/cci-B.txt
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario B --json > /tmp/cci-B.json
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario B --trace-jsonl > /tmp/cci-B.jsonl
```

Empty command-local history settings override `.env`; other commands can use configured stores. These are separate investigations with different run/evidence IDs. Read each file's own citations; never combine them as one trace. Keep real-account reports private: they contain resource identifiers and operational details. Synthetic reports are suitable for demo capture.

An abridged B run has this decision sequence (evidence IDs omitted here; inspect the captured report to resolve them):

```text
8. planner: Observed low average and peak CPU suggest this window; challenge it before any decision.
9. evaluator: Plausible window proposed. Require a fresh targeted operations challenge; low CPU is not scheduling authority.
10. planner: Try to falsify the proposed window with overlapping critical jobs.
11. tool (ok): Validated current-investigation observation registered.
12. evaluator: A retrieved critical job overlaps the proposed shutdown window; reject this window.
13. finish: hypothesis_contradicted
```

The proposed daily **00:00–06:00 UTC** window conflicts with the synthetic critical job at **02:00–03:00 UTC**. Locate `candidates[0].hypotheses` for `proposed` then `contradicted`; match `contradicting_evidence_ids` to the retrieved operations observation in `evidence`. The result is `not_recommended`, with unsupported savings `null`. This is the critique moment: the evaluator blocks the initially attractive schedule using a newly retrieved fact. Default scripted planning proves the policy and state transitions; use the [configured model](#model-configuration) and retain its actual trace to demonstrate model decisions.

Every new `trace[]` entry carries an actual UTC emission `timestamp`, `trace_id` (equal to `investigation_id`), ordered `step`, `confidence`, and `retry_count`, alongside the existing reason, citations, action/status and sanitized diagnostics. `(trace_id, step)` identifies a step. CLI text, live progress and the full web trace expose correlation, evidence support and retry metadata.

In the full report, `confidence` describes evidence support for that step: `supported` requires cited, complete, authoritative observations without missing fields; `insufficient` identifies failed attempts or cited evidence gaps; `unassessed` means no current evidence is cited. A supported low-CPU observation still cannot establish scheduling safety. `retry_count` is retries already made for the same action: initial call **0**, then **1**, **2**, **3** for evidence retries. Evaluator/finish steps use 0. Legacy reports without metadata get a correlated ID, `unassessed` confidence and `null` (unknown) counters when loaded; no historical receipt is rewritten. Missing step timestamps remain `null`.

The readable JSONL view uses `timestamp`, `trace_id`, `step`, `agent_name`, `action`, `input_summary`, `reasoning`, `output_summary`, numeric `confidence`, `evidence_support`, `retry_count`, `status` and `evidence_ids`. Role names describe responsibilities in the existing loop, not separate autonomous agents. `reasoning` is the recorded concise decision rationale, not hidden model thinking; output summaries describe retrieved facts without retaining raw provider payloads.

JSONL `confidence` is measured evidence coverage: the count of distinct complete, authoritative, gap-free checks already retrieved for the current candidate divided by **5** (inventory, billing, metrics, operations and dependencies). Thus **0.6** means three checks are complete. Discovery checks are shared; candidate checks never transfer between instances. Failed attempts do not add coverage; future evidence never raises an earlier step's score. The categorical report value appears as `evidence_support` in this view. Coverage is not a calibrated probability, policy clearance or a verdict threshold: a fresh contradiction can reject a window at 0.8, and an owner-authority gap can still defer a run with all sources retrieved. Historical traces without captured step times export `null` timestamp/confidence rather than invented measurements.

For three reproducible input/output cases, run the same JSON command with `--scenario A`, `B` and `C`: expect respectively `conditional_recommendation`, `not_recommended` and `not_recommended`. A has explicit synthetic clearance and qualified pricing; C cites continuous-operation requirements. With `--scenario missing`, expect `needs_verification`, `partial`, and exit **2**; retain the JSON even though the exit is nonzero. These scenarios compute reports from fixture observations; they do not return stored final answers. [Evaluation](evaluation/README.md) owns comparative measurements and D's memory proof.

## Failure behavior

For `needs_verification`, `missing_checks` identifies the evidence or clearance
that failed policy, and `next_human_actions` names the owner review, source
retrieval or recovery check needed before a fresh investigation. Source statuses
remain explicit; "no validated observation" can include a failed or rejected
retrieval and does not claim the tool was never attempted. Resolving a checklist
does not itself approve shutdown: rerun with fresh evidence and obtain authorized
human approval before an infrastructure change.

| Trigger | Actual response |
| --- | --- |
| Invalid flags/request or invalid planner configuration | Exit 1 with a bounded message; no silent planner/evidence fallback. |
| Required inventory/billing discovery unavailable, error, timeout or invalid observation | Retry the same read-only call up to three times after the initial attempt, within budgets; on exhaustion stop with `required_tool_failed:<tool>`, a named diagnostic and exit 1. No advance to another planner/tool. Invalid scoped observations are terminal. Inventory must precede billing; usable partial metadata is retained. Authenticated empty inventory finishes without billing. |
| Operational tool error, timeout or invalid observation | Retry the same read-only call up to three times after the initial attempt, within budgets. Retain every failed attempt; exhausted or invalid results leave safety unknown. |
| `no_match`, partial or unavailable operational source | Preserve its distinct status; absence cannot establish authority or eliminate dependencies. |
| Model transport/HTTP/schema failure | Retry transient failures within the existing budgets; permanent errors or invalid output stop planning. Exhaustion retains earlier evidence as a partial report (exit 2); no usable evidence yields failure (exit 1). |
| Repeated action or exhausted tool/model/runtime budget | Stop rather than loop; preserve finished candidates and explicitly defer unresolved candidates. |
| Historical-store read/write failure | Disclose it separately; current verdicts still require fresh evidence. No automatic retry after an uncertain append. |
| Missing pricing, commitment or retained-resource assumptions | Savings stay `null`; current spend is not automatically avoidable cost. |

A live investigation has a 15-minute total limit and 60-second model-call cap,
with five seconds reserved for report finalization. Model, tool, pacing and history
waits consume the same total budget. Exhaustion retains completed findings and
returns partial results; unresolved candidates remain `needs_verification`.
A timed-out history write may have completed remotely; inspect history before retrying.

Deadlines and attempt limits are defined in [runtime bounds](components.md#runtime-ownership-and-bounds). Recovery means a bounded next check or explicit uncertainty; no automatic mock fallback or speculative retries are implied.

### Evidence-tool retries

The executor owns three retries after the initial evidence call (**four attempts total**), without another planner decision or changed arguments. Backoff is 2s, 4s, then 8s with 0–25% positive jitter. Every call consumes the physical attempt budget: eight discovery calls maximum (two logical discovery actions), twelve calls per candidate. The shared deadline and finalization reserve may stop retries sooner. A retry never resets the deadline or an attempt cap. Budgets count logical provider invocations; an AWS collector may perform multiple bounded SDK requests internally.

Thrown source failures, per-call timeouts and validated `error`/`unavailable` responses retry. Malformed/scoped-invalid output and explicit cancellation stop immediately. `partial` and `no_match` are successful responses with distinct evidence semantics and are not retried. Failed attempts remain in the trace with status and counter; only the final response enters the evidence registry, so a recovered call is not shadowed by an earlier outage. Recovery may complete the investigation, but does not erase attempts or their cost. Uncertain Zetaris/H-MEM writes are never automatically replayed.

## Model configuration

After the [environment setup](HOW.md#configure-your-investigation), select the generic adapter:

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

For the NVIDIA-hosted Nemotron 3.5 Super VL configuration, see the
[tested generation setting and repeated CLI gate](evaluation/README.md#repeated-real-model-cli-gate).
Generic `LLM_*` configuration uses its own options; it does not inherit the
legacy NVIDIA preset's thinking-disabled setting.

## Diagnostics

HTTP failures now retain `provider_error: { body, truncated }` in
`rows[].investigation.planner_failures[]` and `trace[]`. The same diagnostic
appears immediately on stderr with the evaluation script’s `--verbose` option, and in readable CLI reports. The investigation CLI does not accept `--verbose`.
JSON error fields such as `message`, `detail`, `code` and `type` are retained;
plain-text/HTML error responses are also supported. Credentials, configured
scope identifiers, URLs, request/header objects and stack fields are redacted
or omitted. Reads stop at 8 KiB or one second, and the sanitized excerpt is
limited to 2048 characters. Empty or unreadable bodies are labeled explicitly;
`truncated` flags incomplete capture. The original `model_http_NNN` code remains
unchanged. This supersedes the earlier behavior of dropping all error bodies;
older measurements cannot recover discarded details. No extra requests or retries
are made to collect an error body.

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
`model_state_too_large`. No scripted fallback is used. These codes
describe new runs; exact causes cannot be reconstructed from older generic
`planner_unavailable_or_invalid` results.

### Planner recovery and live progress

The runner retries HTTP 408/429/5xx, transport failures and per-call timeouts
at most twice for the same next decision (three attempts total). Backoff starts
at 2s then 4s, each with 0–25% positive jitter; a valid numeric or HTTP-date
`Retry-After` can extend that wait. Attempts and waits consume the existing
planner-call and aggregate runtime budgets, including the finalization reserve.
If the required wait cannot fit, defer immediately. Authentication, validation,
TLS/configuration errors, explicit cancellation and unknown failures are terminal.

Each failure remains in the report trace, including failures recovered by a later
attempt. Evaluation still counts those failures; recovery never erases them or
turns an earlier failed measurement into a pass. Retrying generation may incur
provider usage, and aborting our wait cannot guarantee remote generation stopped.
Tools and historical writes are never replayed by planner recovery.

The web status displays the active planner call, evidence tool, history operation
or retry wait, with elapsed and remaining wait time refreshed every two seconds.
These are waiting limits, not predicted completion times. Heartbeats update the
current status without filling the execution tree; retry notices remain in the
tree. Stop run terminates the worker, including a pending backoff. Verbose
evaluation also shows these progress messages.

### Request-phase timing

The optional [Node preload](../scripts/model-request-timing.mjs) observes native
fetch diagnostics and writes one `model_request_timing` JSON line per Chat
Completions request to stderr. It does not change requests, deadlines or retries.
It records request numbers, elapsed milliseconds, TLS authorization, HTTP status
and allowlisted network error codes. It omits hostnames, IPs, headers, credentials,
prompts, model output and exception messages. Enable it only for diagnosis;
[the repeated-gate procedure](evaluation/README.md#repeated-real-model-cli-gate)
shows the invocation and artifact locations.

- `sent_ms` records the point immediately before headers are written to a socket;
  `body_sent_ms` records completion of the request-body write.
- `headers_ms` records receipt of HTTP response headers; `status` is the actual
  response status. `body_complete` means the response stream ended, not that its
  content passed the planner's validation.
- A failed request with `body_sent_ms` and verified TLS but no `headers_ms`
  waited after transmission. This excludes an initial DNS/TLS setup failure for
  that request; it cannot distinguish a remote queue/generation/gateway stall
  from a post-connection network stall without provider-side evidence.
- A request with headers but no completed body stopped during response delivery.
  `other` means an error code was not allowlisted; the report's planner failure
  code still distinguishes the investigation deadline or cancellation.

Missing timing fields are unobserved phases, not zero-duration phases. Request
numbers restart in each CLI process and correspond to its ordered model calls.
[Undici's channel reference](https://undici.nodejs.org/api/DiagnosticsChannel)
defines these event boundaries. A healthy catalog read demonstrates service
reachability and authentication, not availability of a particular model request.

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
npm run typecheck:aws
npm run lint
```

Tests cover actual discovery/rejection, changed jobs and suggested windows, missing/partial/error data, scope/UTC/units, invalid model actions, forged citations, repetition, budgets, timeouts and H-MEM persistence/isolation failures. NVIDIA HTTP tests are mocked; live proof is recorded separately. The test runner disables process isolation for the managed environment's process restrictions. Typecheck covers the investigation CLI, contracts, adapters, scripts and tests. The inherited notebook's optional Anthropic SDK is outside this check; the legacy root typecheck still needs that uninstalled optional SDK.

### Manual LLM integration test

```bash
npm run integration:modal
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
The former `npm run test:integration` remains a model-only compatibility alias;
it never invokes the cloud suite.

### Manual AWS integration tests

```bash
AWS_PROFILE=your-read-only-profile AWS_REGION=your-region npm run integration:cloud
# Explicit opt-in to potentially charged resource-level Cost Explorer queries:
AWS_PROFILE=your-read-only-profile AWS_REGION=your-region AWS_ENABLE_COST_EXPLORER=true npm run integration:cloud
```

For the configured dedicated CCI profile in Paris, the verified command is:

```bash
AWS_PROFILE=cci AWS_REGION=eu-west-3 AWS_ENABLE_COST_EXPLORER=true npm run integration:cloud
```

Shell variables override `.env`. A bare command can therefore select another
profile/region or leave billing disabled; use explicit selectors when checking
this scope. The suite keeps unavailable billing as a failure until scoped records
are actually returned.

This separate live suite loads `.env` with shell precedence, verifies TLS and
uses the production AWS collectors and observation adapter. It authenticates
through the Node SDK credential chain, discovers real inventory/scope, and then
tests billing, CPU metrics, SSM maintenance and ELBv2 dependencies. Set
`AWS_EXPECTED_ACCOUNT_ID` to guard the authenticated account. An inventory
failure stops all downstream reads; an empty account passes the inventory access
check but fails the suite because resource checks cannot be verified. No resource
IDs are fabricated. Billing queries cover at most one discovered instance;
without explicit Cost Explorer opt-in that check fails without a billing request.

The suite bounds each collector to 20 seconds, pagination to three pages per
read, and total runtime to 150 seconds. Missing credentials, denied access,
unavailable sources or unusable observations fail the suite rather than skip.
Partial inventory metadata and incomplete metric history are printed as gaps;
successful empty SSM/ELBv2 reads can pass access checks while remaining
non-authoritative for safety. Diagnostics contain statuses and codes, not account
IDs, resource IDs, costs or raw provider responses. No model, historical-store or
AWS write calls run. `npm test` remains offline.

The billing collector normalizes date-only and UTC-midnight response periods,
while rejecting invalid dates, shifted times and out-of-scope or non-daily
periods. AWS's [DateInterval contract](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_DateInterval.html)
and [resource-cost response example](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsageWithResources.html)
include both date and timestamp forms.

## Inherited starter

The original notebook remains available with `npm run notebook -- ...`. Its `.notebook/` state is independent of investigation memory. Avoid `npm run setup` unless intentionally refreshing the vendored starter; it downloads an upstream copy.

[Reproduce evaluations and warm-run demos](evaluation/README.md).
