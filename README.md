# Cloud Cost Investigator

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

Read-only EC2 off-hours scheduling investigation for **Track 02 — The Agent That Can Explain Why**. This implements the first contradiction-first slice in [plan.md](plan.md). Current evidence is explicitly **synthetic mock data**. No AWS API is called and no infrastructure can be changed.

An engineer supplies an account and region. The CLI discovers running instances, ranks matching compute spend, inspects utilization, proposes an observed UTC window, then challenges that exact window with operational evidence. In scenario B, a critical batch job rejects the proposal. No previous investigation is required. Savings are always `null` in this slice.

## Run

Requires Node.js **24+** and npm. The repository already uses `package-lock.json`; no production dependencies were added. The H-MEM reference is checked into `vendor/hmem`; investigation runs do not require downloading or setting up H-MEM.

```bash
npm ci
npm run investigate -- --account demo --region us-east-1
npm run investigate -- --account demo --region us-east-1 --scenario missing
```

The first command shows the detailed report and trace. The missing-source variation returns `needs_verification`, `partial`, and exit status **2**. `--scenario clear` supplies an empty job query and continues to dependencies; it still defers positive clearance. This slice does not implement scenario A. Supported flags:

```text
--account ID          required, labeled scope for the synthetic provider
--region REGION       required
--lookback-days N     1–90; default 28 UTC days ending at invocation
--max-candidates 1    one discovered candidate only
--scenario B|clear|missing
--planner scripted|nvidia
--json
```

For machine-readable stdout without npm's script banner:

```bash
node --import tsx cli.ts investigate --account demo --region us-east-1 --json
```

Exit codes: **0** completed scoped rejection/no eligible candidates; **2** partial; **1** failed investigation, invalid invocation, or planner configuration. `complete` concerns the investigated window; it does not mean the project or sponsor gates are finished.

## Model configuration

The executable loads `.env` from the current working directory automatically; existing shell variables take precedence. Copy [.env.example](.env.example) to `.env` only if you do not already have one, then select the generic adapter:

```bash
npm run investigate -- --account demo --region us-east-1 --planner model
```

Set `LLM_BASE_URL` (including `/v1` when required), `LLM_MODEL`, and `LLM_API_KEY` for your OpenAI-compatible Chat Completions provider. The adapter appends `/chat/completions`. Local loopback HTTP servers can omit the key; remote endpoints require HTTPS. Generic configuration never inherits an NVIDIA key. Keep provider credentials server-side.

`LLM_RESPONSE_FORMAT` defaults to `text` (JSON is still required in the response). Choose `json_object` or `json_schema` only if supported. `LLM_EXTRA_BODY` accepts JSON provider options, including either `max_tokens` or `max_completion_tokens` (1–4096); it cannot override messages, model, tools or streaming. Remove NVIDIA-specific options when switching providers. Provider compatibility depends on Chat Completions and instruction-following support; arbitrary providers were tested with mocked transport, not live credentials.

With no `LLM_*` settings, `--planner model` falls back to `NVIDIA_API_KEY` and optional `NVIDIA_MODEL`. The legacy `--planner nvidia` selects that NVIDIA preset explicitly. Model IDs are configurable; event approval of a selected model remains a separate gate. The default `scripted` planner runs offline.

All model paths preserve bounded requests, validated actions, trusted argument binding and deterministic verdicts. Redirects are refused. Failures return incomplete results without scripted fallback. Current evidence remains mock regardless of the selected model. See [the execution plan](docs/EXECUTION_PLAN.md) for actual integration proof.

## Safety and ownership

- `src/contracts.ts` validates requests, actions and observations at runtime, rejecting scope/period mismatches, stale collection times, malformed data, unsupported fields and units.
- `src/investigation/run.ts` owns candidate ranking and the bounded planner → executor → evaluator loop. Only five read-only logical tools exist. The model chooses an allowlisted question; trusted code binds scope, window and current IDs. Model prose cannot authorize a verdict or infrastructure write.
- `src/investigation/mock.ts` owns synthetic direct evidence and B/clear/missing scenarios. Metrics summarize the suggested daily UTC window across the observed lookback. These are application contracts, not claims about available AWS endpoints.
- `src/investigation/report.ts` validates the final report, retrieved-current citations and the chronological proposed → contradicted/unresolved transition; it renders the detailed CLI trace.

Hard bounds: two discovery tool attempts; six candidate tool attempts; two discovery plus seven candidate planner calls (nine total); 5s per tool; 15s per planner call; 120s overall. Every attempted call counts, including failures. Identical repeated tool actions stop the run. The native model request also has a 20s cancellation deadline and 32KiB response limit. Unsupported/missing evidence never becomes zero or proof of safety. Daily same-day UTC windows only are supported; overnight windows must be split by a future adapter.

A rejected window requires a later retrieved current conflict. Empty/non-authoritative sources cannot clear scheduling safety. Conditional recommendations, calendar exceptions and deterministic savings are deliberately left to follow-on work in the plan. Human review remains required for any eventual shutdown.

## H-MEM and Zetaris

```bash
npm run probe:hmem
```

This performs a genuine **local Meterless H-MEM reference** store → disk persistence → new engine instance → retrieval, using a compact summary of an executed mock B investigation. It uses and removes its own temporary directory. Summaries carry scope, timestamp, hypothesis, decision reason, unresolved risks and provenance; historical IDs never become current evidence. The adapter supports caller-owned persistent directories, isolated per account/region, and validates stored data on read and write. The reference uses local deterministic embeddings and single-writer JSON persistence. This proof does **not** establish a hosted service or warm-run query-priority behavior.

The investigation CLI does not read/write historical context yet and labels both history services `not_configured`. Zetaris history append/query remains blocked pending a verified dedicated schema, endpoint behavior and least-privilege append/read permissions. The existing generic SQL connectivity helper is not exposed to the planner. Connectivity and history-storage preparation are separate work; they do not prove integrated sponsor history persistence.

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

Product scope, rationale and executed milestone evidence live in [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md), [memory.md](memory.md), and [EXECUTION_PLAN.md](docs/EXECUTION_PLAN.md). AWS live adapters, authorized Zetaris history, warm history/memory planning, event-model approval, A/C/D evaluation and submission assets remain separate gates.
