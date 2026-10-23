# Cloud Cost Investigator — Execution Plan (Milad + Zayan)

> **Sole execution tracker.** Event requirements are recorded in [`RULES.md`](./RULES.md); approved product and safety contracts are in [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md); agent workflow in [`../AGENTS.md`](../AGENTS.md). A task is complete only with executed evidence. Preserve the distinction between team decisions, planned work, mocks and verified live integrations.

**Hackathon track:** 02 — The Agent That Can Explain Why.  
**Approved scope (2026-10-23):** AWS EC2 off-hours scheduling safety; direct current-evidence tools; Zetaris structured history; Meterless reasoning memory; no infrastructure modification. The older cost-increase/snapshot-comparison workflow is superseded.  
**Deadline:** 2026-10-27 23:45 UTC in recorded event notes; verify portal. Target freeze: Oct 26.  
**Active milestone:** Day 2 kickoff, Fri Oct 23, 2026. Do not advance from this checkpoint based on elapsed time or this documentation revision.

## 1. Decision change and current verification state

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

### Verification and blocker log

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
| Zetaris history                            | **Zayan** (Milad integrates)   | Dedicated append-only structured history schema, authorized write boundary, allowlisted read and append, actual read-after-write proof                       |
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
- [ ] One genuine approved investigation-model call; record actual model, endpoint class and NVIDIA contribution, no secrets.
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
- [ ] Scenario D: second run retrieves H-MEM historical reasoning and historical typed Zetaris rows; both influence planning or comparison, not current verdict authority.
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
