# CLI reference

[What](../README.md) · [How](HOW.md)

## Run

Install dependencies using [How](HOW.md#run-the-demo) first.

```bash
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

## Capture and read the decision trace

The CLI prints a final readable report, or one JSON report with `--json`, to stdout. It does not automatically create `logs/` files or stream JSONL. Capture a fresh, isolated B run with no model, AWS or historical-service calls:

```bash
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario B > /tmp/cci-B.txt
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario B --json > /tmp/cci-B.json
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

JSON `investigation_id` correlates the report and its ordered `trace[]`. Each trace entry has `step`, `phase`, `reason`, `evidence_ids`, and optional validated `action`, `status` or failure diagnostics. Report timestamps, evidence collection times, source modes and aggregate `budget` supply provenance and bounds. Per-step timestamps, numerical confidence, retry counters and target-agent fields from the quality-bar example are not emitted. Do not manufacture them.

For three reproducible input/output cases, run the same JSON command with `--scenario A`, `B` and `C`: expect respectively `conditional_recommendation`, `not_recommended` and `not_recommended`. A has explicit synthetic clearance and qualified pricing; C cites continuous-operation requirements. With `--scenario missing`, expect `needs_verification`, `partial`, and exit **2**; retain the JSON even though the exit is nonzero. These scenarios compute reports from fixture observations; they do not return stored final answers. [Evaluation](evaluation/README.md) owns comparative measurements and D's memory proof.

## Failure behavior

| Trigger | Actual response |
| --- | --- |
| Invalid flags/request or invalid planner configuration | Exit 1 with a bounded message; no silent planner/evidence fallback. |
| Tool error, timeout or invalid observation | Record the failed attempt without accepting its payload; use remaining bounded checks, then defer unresolved safety. |
| `no_match`, partial or unavailable operational source | Preserve its distinct status; absence cannot establish authority or eliminate dependencies. |
| Model transport/HTTP/schema failure | Record a sanitized failure and stop planning. Earlier evidence can yield a partial report (exit 2); no usable evidence yields failure (exit 1). |
| Repeated action or exhausted tool/model/runtime budget | Stop rather than loop; preserve finished candidates and explicitly defer unresolved candidates. |
| Historical-store read/write failure | Disclose it separately; current verdicts still require fresh evidence. No automatic retry after an uncertain append. |
| Missing pricing, commitment or retained-resource assumptions | Savings stay `null`; current spend is not automatically avoidable cost. |

A live investigation has a 15-minute total limit and 60-second model-call cap,
with five seconds reserved for report finalization. Model, tool, pacing and history
waits consume the same total budget. Exhaustion retains completed findings and
returns partial results; unresolved candidates remain `needs_verification`.
A timed-out history write may have completed remotely; inspect history before retrying.

Deadlines and attempt limits are defined in [runtime bounds](components.md#runtime-ownership-and-bounds). Recovery means a bounded next check or explicit uncertainty; no automatic mock fallback or speculative retries are implied.

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
`model_state_too_large`. No retries or scripted fallback were added. These codes
describe new runs; exact causes cannot be reconstructed from older generic
`planner_unavailable_or_invalid` results.

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

## Inherited starter

The original notebook remains available with `npm run notebook -- ...`. Its `.notebook/` state is independent of investigation memory. Avoid `npm run setup` unless intentionally refreshing the vendored starter; it downloads an upstream copy.

[Reproduce evaluations and warm-run demos](evaluation/README.md).
