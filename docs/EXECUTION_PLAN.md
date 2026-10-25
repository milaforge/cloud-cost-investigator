# Cloud Cost Investigator — Execution Plan (Milad + Zayan)

[What](../README.md) · [How](HOW.md)

> **Sole execution tracker.** Event requirements are recorded in [`RULES.md`](RULES.md); approved product and safety contracts are in [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md); agent workflow in [`../AGENTS.md`](../AGENTS.md). A task is complete only with executed evidence. Preserve the distinction between team decisions, planned work, mocks and verified live integrations.

**Hackathon track:** 02 — The Agent That Can Explain Why.  
**Approved scope (2026-10-23):** AWS EC2 off-hours scheduling safety; direct current-evidence tools; Zetaris structured history; Meterless reasoning memory; no infrastructure modification. The older cost-increase/snapshot-comparison workflow is superseded.  
**Deadline:** 2026-10-27 23:45 UTC in recorded event notes; verify portal. Target freeze: Oct 26.  
**Active milestone:** Days 3–4 — full user flows and live-evidence integration, reconciled Oct 25, 2026. Day 2's mock B/failure gate and separate real-model, H-MEM and Zetaris round-trips have linked historical proof. This advances the work stage, not the combined live-evidence or release gates.

## Current status and next actions — reconciled 2026-10-25

### Actionable unresolved recommendation checks — 2026-10-25

- **Gate/owner/mode:** report usefulness, Milad; synthetic/fixture evidence.
  Policy assessment now returns both existing positive proof and actionable
  reasons. Unresolved reports name workload/service-owner reviews, missing CPU
  coverage/resolution, calendar/recovery confirmation, expired clearance and
  conflicting clearance details, then request a fresh run and human approval.
  Existing thresholds, authority requirements and savings guards are preserved.
- **Verification:** focused investigation, broader-scenario, AWS-adapter and
  report tests passed **84/84**; `npm run typecheck` and scoped Biome lint passed.
  Assertions cover the concrete next action for each existing clearance failure.
- **Limits/next action:** no live calls or infrastructure changes. Continue
  independent policy/report-boundary regression proof. Operational collection is
  awaiting identification of the available job/dependency systems; current AWS
  adapter still defers missing operational sources.

### Recommendation wording — 2026-10-25

- **Gate/owner/mode:** recommendation clarity, Milad; UI wording only. Verdicts
  now distinguish a conditional recommendation requiring human approval, rejection
  of the evaluated window, and a withheld recommendation pending evidence. CPU
  checks identify potential off-hours windows rather than assert inactivity.
  The durable authority rule is recorded in `AGENTS.md` and `memory.md`.
- **Verification:** `node --check src/web/app.js` passed;
  `node --import tsx --test --test-isolation=none tests/report.test.ts` passed
  **7/7**, synthetic evidence; scoped `git diff --check` passed.
- **Limits/next action:** no browser visual or live-service proof; safety policy,
  citations and verdict values are unchanged. Continue actionable unresolved
  checks, policy regression proof, then operational-source integration.

### Clean-checkout validation and coding-agent runbook — 2026-10-25

- **Gate/owner/status:** clean-checkout local runtime reproduction, Milad —
  **PASSED** at revision `391cdef38bba8a8fc0eb3ac2b9f5f02632b68062`.
  Created a separate `git clone --no-local` of the local Git repository with a
  fresh home, npm cache and temp directory. No `.env`, `.aws`, `node_modules`,
  credentials or prior memory were copied/inherited. This proves the recorded
  local revision, not remote GitHub cloning/visibility or an independent human.
- **Agent entry point:** [How → AI agent clean checkout](HOW.md#ai-agent-clean-checkout),
  linked from `AGENTS.md`, gives ordered commands, expected exits/verdicts,
  service-mode checks, failure handling and an explicit human-approval table.
  Local setup proceeds under the task request; paid calls, live scope access,
  remote provisioning/retained writes, secrets and publishing require their
  specific authorization. Existing approvals persist. No product code changed;
  these guide changes were checked separately from the clean revision.
- **Install/proof:** Node **24.19.0**, npm **11.17.0**;
  `npm ci --no-audit --no-fund` installed **38 packages in 9s**, exit **0**.
  The first registry attempt failed with sandbox DNS `EAI_AGAIN`; the permitted
  attempt passed. An isolated-home version-manager shim initially returned 126;
  selecting the already installed Node bin resolved the environment issue.
  npm warned about pending esbuild install-script review; no bulk approval,
  global policy change or dependency/lockfile edits were made.
- **Executed:** the runbook's scripted/mock CLI B/A/C all exited **0**, with
  rejection/conditional recommendation/rejection; missing exited **2**, partial
  `needs_verification`. History was disabled, citations resolved, and B/C showed
  fresh proposal contradictions. `npm test` passed **235/235** with local
  loopback/subprocess permission. `npm run typecheck`, `npm run typecheck:aws`,
  `npm run lint` all exited **0**. Scripted `evaluate` returned **8/8 correct**,
  **0 unsafe positives**, **44/44 valid citations**. Scripted `demo:warm --json`
  passed cold/warm/changed with real temporary local H-MEM. The verification
  harness initially merged progress stderr into JSON; parsing the existing
  successful result separately resolved that harness error without rerunning it.
- **Web/cleanliness:** `npm run demo:web -- --no-open` served loopback HTTP **200**;
  `/api/config` reported no configured model or Zetaris. Stopped only that server.
  Final `git diff --exit-code` and `git status --short` were clean. Full
  [command/result receipt](history/clean-checkout-2026-10-25/summary.json),
  [tests](history/clean-checkout-2026-10-25/tests.txt),
  [evaluation](history/clean-checkout-2026-10-25/evaluation.txt) and
  [installation](history/clean-checkout-2026-10-25/install-network-enabled.txt) retained.
- **Limits/next action:** no paid inference, live AWS or remote Zetaris calls;
  browser visual review, a separate reproducer/OS, remote clone availability,
  artifact-wide security review and final assets/submission remain open.
  The existing README is **189 lines**, conflicting with the 10-line AGENTS
  rule; preserved the team's current README rather than changing its presentation
  in a validation task. This is a separate documentation conflict, not a runtime
  setup failure. The runbook review passed **108 local links/anchors**, balanced
  fences, entry-point/approval assertions and receipt consistency. Retained
  receipts had no credential-pattern matches; recorded rules JSON is unchanged.
  `git diff --check` passed. Continue integrated source verification and final
  deck/video.

### Concise captured trace example — 2026-10-25

- **Gate/owner/mode:** submission trace clarity, Milad; documentation only.
  Added [trace example](TRACE_EXAMPLE.md), linked from the CLI guide, using six
  exact projected events from a retained live NVIDIA / synthetic-evidence B run.
  Includes the contradiction citation, unresolved checks, separate failed-run
  evidence and an offline stdout/`logs/` capture command; rationale in `memory.md`.
- **Verification:** inline Node assertions with `validateReport` passed exact
  excerpt/source equality, citation resolution, captured success/failure behavior
  and a fresh offline report. `ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run
  --silent investigate -- --evidence mock --planner scripted --account demo
  --region us-east-1 --scenario B --json` exited **0**, `complete`,
  `not_recommended`, histories disabled. Python local-link/anchor, fence and
  whitespace checks passed; scoped `git diff --check` passed.
- **Limits/next action:** no new live model, AWS, Zetaris or H-MEM calls; no
  runtime changes. Use the example in the demo; existing release gates remain.

### Zetaris installation and storage guide — 2026-10-25

- **Gate/owner/mode:** reproducible service setup documentation, Milad; documentation only.
  Added [Zetaris setup](ZETARIS_SETUP.md), linked from README Setup and How, with
  official installation sources and the existing server-side persistent directory
  and lakehouse procedure. The history guide links there and retains the canonical
  table, restricted account, connection and read/append verification instructions.
- **Verification:** official Docker/deployment links opened successfully. A Python
  documentation check passed new/changed local links and anchors, balanced code
  fences, required storage instructions and new-file whitespace.
  `git diff --check -- README.md docs/HOW.md docs/ZETARIS_SETUP.md docs/ZETARIS_HISTORY.md docs/EXECUTION_PLAN.md memory.md`
  passed. Existing history-guide storage anchor remains available.
- **Limits/next action:** no installation, provisioning, secret edits or service/model
  calls performed. Follow the guide against the deployed Compose version; the
  restricted-identity permission gate remains open as recorded below.

### Visitor-facing agent overview — 2026-10-25

- **Gate/owner/mode:** submission architecture clarity, Milad; documentation only.
  Filled the requested README Mermaid with decision authority, shared state,
  sponsor boundaries, bounded replanning, explicit sample selection, failure
  handling and stdout trace capture. No runtime or integration claim changed.
- **User-directed refinement:** decision diamonds and a shaded agentic loop
  foreground dynamic action selection and evidence-driven replanning. Zetaris
  now shows recommendation follow-through, reviews/outcomes and validated
  rollback feedback teaching H-MEM. Dotted arrows mark cross-run state.
- **Additional abstraction:** added a seven-node at-a-glance diagram before the
  existing view, grouping execution and shared evidence while retaining dynamic
  decisions, replanning, sponsor roles and outcome learning. Python checks of
  both overview blocks and `git diff --check` passed; no renderer proof added.
- **Zetaris emphasis:** highlighted the durable decision record in four README
  diagrams and grouped it with H-MEM under long-term improvement in the overview.
  The explanation connects retained decisions/outcomes to future check priority.
  Python diagram checks and `git diff --check` passed; documentation only.
- **Overview consolidation:** removed the duplicate introductory diagram and
  sentence from `components.md`, replacing them with a README link. Python checks
  confirmed the link resolves and all responsibility/technical content remains
  verbatim; `git diff --check` passed. Documentation only; no runtime change.
- **Verification:** a Python README check passed coverage of the seven requested
  topics, decision notation, learning feedback, balanced node delimiters and
  local link targets; `git diff --check` passed after refinement. Mermaid
  rendering was not checked. Next action: visual review in the
  README renderer; live-integration and release blockers remain unchanged.

### Zetaris deployment permission review — 2026-10-25

- **Gate/owners/status:** effective least privilege — **OPEN; current admin identity
  does not meet the gate**. User confirmed they control the deployment and that
  the current account has an administrator role with read/write access. This is
  administrator-reported identity evidence; role membership was not independently
  enumerated. User provisions/reviews the replacement identity; Milad verifies it.
- **Live read-only checks:** loaded the project `.env` without printing credentials
  or private endpoints. Password auth, dedicated history target and append enablement
  are configured. Under the configured identity, `verifyZetarisHistorySchema()`
  passed. `SHOW GRANT ON CCI_HISTORY.investigations.records` and the existing
  `SHOW GRANT ON ALL` inspection each returned sanitized **zetaris_http_400**.
  Those responses do not distinguish SQL support from permission enforcement and
  do not prove access is restricted. No writes, grants, account changes, secret
  edits or destructive denial probes were performed.
- **Requested documentation change:** the [canonical account setup](ZETARIS_HISTORY.md#4-configure-the-app-identity-and-environment)
  explicitly requires a new **general/non-admin** account, table-only SELECT/INSERT
  for `CCI_HISTORY.investigations.records`, Grant Option disabled, inheritance review
  and backend/server-policy overwrite restriction. Keep the provisioning admin
  separate and configure the new credentials locally. Token mode must also use
  the restricted identity. Official Zetaris SQL/user/role documentation was checked;
  Context7 resolution had no relevant Zetaris documentation match.
- **Verification:** new setup requirements, added local links and scoped
  `git diff --check -- docs/ZETARIS_HISTORY.md docs/EXECUTION_PLAN.md memory.md`
  passed. The wider link check found the pre-existing missing;
  repository-wide whitespace checking found a concurrent README trailing-space
  edit. Both remain outside this slice. Documentation only; no product-code
  change or new model calls. Existing successful administrator append/read
  measurements remain functionality proof, not restricted-identity proof.
- **Next action:** user creates and configures the dedicated account with appends
  disabled, supplies non-secret effective permission/role/overwrite evidence,
  then Milad verifies reads and an explicitly enabled retained synthetic append
  with that identity. Close only after those conditions pass. Deployment version
  and actual append-only enforcement remain unverified.

### Real-model reliability gate — 2026-10-25

**Current provider gate: CLOSED with OpenAI, 9/9 complete.** See the
[executed OpenAI gate](#openai-reliability-gate-closed--2026-10-25) below. The NVIDIA
measurements and focused comparison remain separately retained historical evidence.

- **Gate/owner:** repeated real-model A/B/C completion, Milad. **Historical NVIDIA initial measurement:**
  [three-round CLI measurement](evaluation/model-reliability-2026-10-25/summary.json)
  exited **1**, with **8/9 complete, 1/9 partial**; A **3/3**, B **3/3**, C
  **2/3**. The failed [round 2 C report](evaluation/model-reliability-2026-10-25/round-2-C.json)
  timed out on planner call 2 after inventory, before billing or candidate
  selection: `planner_timeout`, **301187 ms**, CLI exit **2**, no recommendation.
  All **57/57** candidate/hypothesis citation references resolve; the partial
  run has no candidate references. All complete B/C reports show the expected
  fresh operations/dependency contradiction. There were **47 planner attempts**
  and **434943 ms** aggregate investigation time, including the timeout.
- **Executed command/mode:** `LLM_EXTRA_BODY='{"chat_template_kwargs":{"enable_thinking":false}}' NODE_TLS_REJECT_UNAUTHORIZED=1 node --import tsx scripts/probe-model-reliability.ts /tmp/cci-real-model-gate-2026-10-25`,
  with authorized network access. The configured NVIDIA-hosted model was
  `nvidia/nemotron-3.5-super-vl-120b-a12b`, text JSON output, existing 1024-token
  default. Nine fresh serial CLI processes used explicit mock evidence,
  unchanged CLI pacing, no history, retries or fallback. The probe retains every
  report and refuses an existing output directory. [Progress log](evaluation/model-reliability-2026-10-25/gate-progress.log)
  and [reproduction procedure](evaluation/README.md#repeated-real-model-cli-gate).
- **Pre-gate diagnostics retained:** `NODE_TLS_REJECT_UNAUTHORIZED=1 npm run --silent evaluate -- --planner model --case A --verbose`
  first [failed in the sandbox](evaluation/model-reliability-2026-10-25/diagnostic-A-sandbox.json)
  with `model_transport_unavailable`; the [network-enabled run](evaluation/model-reliability-2026-10-25/diagnostic-A-network-enabled.json)
  reached call 3, then returned HTTP 500, `Failed to generate completions`.
  The [thinking-disabled A run](evaluation/model-reliability-2026-10-25/diagnostic-A-thinking-disabled.json)
  completed with the same command-local override as the gate. These are three
  separate diagnostics, **1 complete / 1 partial / 1 failed**, not replacements
  for gate attempts. Across those diagnostics and the gate: **12 investigations,
  9 complete / 2 partial / 1 failed**. The setting does not prove the cause of
  HTTP 500 and does not establish reliable completion.
- **Failure isolation:** after all nine runs finished, a single 25-second-bounded
  [replay of the reconstructed timed-out planner state](evaluation/model-reliability-2026-10-25/state-replay.json)
  returned validated `get_ec2_billing` in **1497 ms**, without executing any tool.
  This is a separate diagnostic call. The same state can produce an action, so
  a consistently invalid state/request is not demonstrated; the cause of the
  intermittent timeout remains unknown. No planner fix or automatic retry was
  introduced to manufacture a pass.
- **Local proof:** `npm test` **227/227 passed** with loopback permission;
  `node --import tsx --test --test-isolation=none tests/model-reliability.test.ts`
  **4/4 passed**; `npm run typecheck`, `npm run lint`, scoped formatting and
  `git diff --check` passed. A negative invocation verified that an existing
  output directory is rejected before model execution and preserves its files.
  Retained artifacts were checked for the configured model credential and
  endpoint without printing either. No production dependency, `.env` or planner
  behavior changed.
- **Availability diagnosis before rerun:** [DNS/TLS/catalog and planner controls](evaluation/model-network-2026-10-25/network-diagnosis.json)
  recorded three successful DNS lookups, three verified TLS 1.3 handshakes,
  authenticated catalog HTTP **200 in 614 ms**, and **8/8** serial planner-only
  calls in **1074–3517 ms**, alternating initial and reconstructed after-inventory
  states. Command: `LLM_EXTRA_BODY='{"chat_template_kwargs":{"enable_thinking":false}}' NODE_TLS_REJECT_UNAUTHORIZED=1 node --import tsx docs/evaluation/model-network-2026-10-25/diagnose.mjs /tmp/cci-model-network-diagnosis-new.json`.
  These controls establish availability at those times, not sustained inference
  reliability. Catalog response cancellation was intentional, not an outage.
- **Latest nine-run rerun:** [retained summary](evaluation/model-network-2026-10-25/gate-rerun/summary.json)
  exited **1**: **4/9 complete, 2/9 partial, 3/9 failed**; A **2/3**, B **2/3**,
  C **0/3**. C timed out on planner calls **6** (after operations, before
  dependencies) and **3** (after billing, before metrics). Final-round A/B/C each
  failed on call 1 with HTTP **500** and sanitized `Failed to generate completions`.
  All **36/36** candidate/hypothesis references resolve, including partial runs;
  there were **34 planner attempts**, **669096 ms** aggregate investigation time.
  No failed or partial attempt was counted as a pass. A concurrent
  [catalog control](evaluation/model-network-2026-10-25/concurrent-catalog-control.json)
  returned HTTP **200 in 553 ms** during the first C stall; a general service
  reachability outage at that moment is not supported.
- **Rerun command/instrumentation limit:** the initial gate command above used
  `/tmp/cci-real-model-gate-instrumented-2026-10-25` and additionally attempted
  `NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--import=./scripts/model-request-timing.mjs"`.
  [Progress](evaluation/model-network-2026-10-25/gate-rerun/gate-progress.log) and
  all reports are retained. The execution environment did not propagate that
  variable: **all nine stderr timing files are empty**, so the stalled request
  phases cannot be determined retrospectively. The gate now explicitly preloads
  the observer in each child; a local native-fetch success/cancellation test
  verifies actual event delivery with `tsx`. Planner behavior is unchanged.
- **One targeted instrumented diagnostic after rerun:**
  `LLM_EXTRA_BODY='{"chat_template_kwargs":{"enable_thinking":false}}' NODE_TLS_REJECT_UNAUTHORIZED=1 node --import ./scripts/model-request-timing.mjs --import tsx docs/evaluation/model-network-2026-10-25/replay-c.mjs /tmp/cci-model-network-c-replay-new.json`
  reconstructed the first stalled C state and returned validated
  [get_ec2_dependencies in 1276 ms](evaluation/model-network-2026-10-25/c-state-replay.json).
  Its [request timing](evaluation/model-network-2026-10-25/c-state-replay.stderr.txt)
  shows verified TLS, body write at **437 ms**, HTTP **200** headers at **1260 ms**
  and body complete at **1261 ms**. This separate single call used a 45-second
  diagnostic bound and executed no tool. It cannot explain the earlier timeout
  or close the failed gate. No further inference reruns were made.
- **Final local proof:** `npm test` **230/230 passed** with loopback/subprocess
  permission; focused observer/gate tests **7/7 passed**. Typecheck, lint, scoped
  formatting, syntax, documentation hierarchy/link and diff whitespace checks
  passed. Artifacts were scanned for configured credentials and endpoint without
  printing either. No production dependency, secret or planner transport changed.
- **OpenAI focused comparison, requested to conserve quota:** after the user
  changed project configuration to OpenAI `gpt-6.1-sol`,
  `NODE_TLS_REJECT_UNAUTHORIZED=1 node --import ./scripts/model-request-timing.mjs --import tsx docs/evaluation/model-network-2026-10-25/compare-openai.mjs /tmp/cci-openai-focused-2026-10-25`
  exited **0**. [Selected comparison](evaluation/model-network-2026-10-25/openai-focused/summary.json)
  passed **3/3** distinct failed-state replays: initial inventory (**3870 ms**),
  after billing → metrics (**2272 ms**), and after operations → dependencies
  (**2225 ms**). Then one fresh actual [CLI C investigation](evaluation/model-network-2026-10-25/openai-focused/C.json)
  completed in **11466 ms**, **6 planner calls**, expected `not_recommended`,
  fresh dependency contradiction and valid current-run citations. All **9/9**
  model requests returned HTTP **200** with verified TLS and completed bodies;
  [replay timings](evaluation/model-network-2026-10-25/openai-focused/comparison-progress.log)
  and [CLI timings](evaluation/model-network-2026-10-25/openai-focused/C.stderr.txt)
  are retained. No retries/fallback, separate A/B investigations, successful
  standalone checks, network controls, history or AWS calls were repeated.
  C necessarily repeated its discovery prerequisites against fresh mock evidence.
  Actual token usage/provider cost is unrecorded, not zero.
- **Comparison interpretation/limits:** the same planner/executor/evaluator can
  complete these formerly failing paths with the new provider/model. This
  supports provider/model-specific instability in the earlier NVIDIA path;
  it does not prove its timeout cause or establish absence of implementation
  defects. This is not a controlled provider-only experiment: model, timing and
  generation settings differ. OpenAI used configured text output, no extra-body
  overrides and the existing official-OpenAI `max_completion_tokens: 1024`
  default; NVIDIA used its legacy token parameter and thinking-disabled override.
  Existing compatible transport was reused without product code changes.
  [Official model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
  supports Chat Completions without native tool calling; this planner returns
  action JSON, and the executor owns tool execution. The selected comparison
  does **not** replace the failed nine-run gates or establish OpenAI A/B/repeated
  reliability, event approval, or new NVIDIA sponsor contribution.
- **Focused comparison verification:** report/gate acceptance checks passed;
  syntax, lint, typecheck, docs hierarchy/links, whitespace and artifact credential
  scan passed. The previous **230/230** full-suite result remains separate;
  no product code changed and the full suite was not repeated for this probe.
- **Blocker/next action:** original intermittent inference failures remain: actual HTTP
  500 responses establish API errors, while the two timeout phases/root causes
  remain unknown. The requested focused OpenAI comparison is complete and green;
  at that point the repeated release gate remained open on the chosen release
  provider. No full rerun was made during that focused comparison, per the
  quota-saving scope. The later OpenAI gate below closes that separate gate. Provider/API owner logs are needed
  to explain the earlier NVIDIA time windows; do not infer queueing, overload,
  rate limiting or a client defect. Preserve both
  nine-run measurements. Model/event eligibility, live AWS evidence and Zetaris
  effective permissions remain separate gates; these runs use synthetic EC2
  evidence and histories disabled, not live AWS or production reliability proof.

### OpenAI reliability gate closed — 2026-10-25

- **Gate/owner/status:** repeated real-model A/B/C completion, Milad — **CLOSED**
  on the configured official OpenAI API using **gpt-6.1-sol**. Three independent
  serial rounds passed **9/9**, A/B/C each **3/3**. Every CLI exited **0**, returned
  `complete`, matched the expected verdict and cited fresh retrieved evidence.
  All B/C reports show proposed → contradicted transitions with the correct
  operations/dependency source. [Full summary](evaluation/openai-reliability-2026-10-25/summary.json),
  [independent saved-report verification](evaluation/openai-reliability-2026-10-25/verification.json)
  and [progress log](evaluation/openai-reliability-2026-10-25/gate-progress.log).
- **Command:** `NODE_TLS_REJECT_UNAUTHORIZED=1 node --import tsx scripts/probe-model-reliability.ts docs/evaluation/openai-reliability-2026-10-25`
  exited **0** with authorized network access. Loaded project `.env` while keeping
  shell precedence; verified official OpenAI destination and key presence without
  printing secrets. Text response format, no extra-body overrides, unchanged
  generation defaults and CLI pacing. Executed revision **cd0f793** includes runtime
  fix **c92ce34**; model-call cap **60000 ms**, total **900000 ms** per investigation.
- **Measurement:** **51/51** real model requests returned HTTP **200**, verified
  TLS and completed bodies. Request times **1354–3274 ms**; investigations
  **9555–15847 ms**, **105094 ms** combined. **63/63** candidate/hypothesis citation
  references resolve; all investigation/evidence IDs are disjoint across runs.
  No planner failures, retries or scripted fallback. No earlier diagnostics or
  state replays were repeated; every one of these nine attempts is retained.
- **Independent verification:** revalidated all nine full reports, expected
  dispositions, gate checks, model identity, distinct IDs, report/summary budgets,
  per-process request counts, HTTP/TLS/body completion and runtime bounds.
  Scanned retained artifacts for the configured API key and private-key markers
  without printing them. Local gate-assessment tests passed **4/4** with
  `node --import tsx --test --test-isolation=none tests/model-reliability.test.ts`.
  The verifier's first local metadata collection encountered sandbox `spawnSync
  git EPERM`; revision capture through the shell then completed verification.
  No paid requests were rerun and no product code was changed.
- **Modes/limits/next action:** real OpenAI planning over explicit **mock EC2
  evidence**, histories disabled. This closes the designed-fixture release gate,
  not production reliability, live AWS coverage, effective Zetaris permissions,
  event/model eligibility or a full warm-memory flow on OpenAI. Token usage and
  billed cost are unrecorded. Earlier NVIDIA failures remain intact and their
  cause remains unresolved. Next: integrated live-source verification with Zayan,
  independent clean-checkout/artifact review, final deck/video and portal checks.

### Implementation verification audit — 2026-10-25

- **Gate/owner:** core implementation correctness review, Milad. User requested
  proof of a defect-free implementation. **Failed:** an independently reproduced
  runtime/report contract mismatch prevents that claim. No product fix was made
  in this verification-only audit; earlier provider comparison remains distinct.
- **Confirmed defect:** `runInvestigation` permits up to **8400000 ms** aggregate
  runtime and defaults to **7020000 ms** for a live three-candidate run, while
  `validateReport` accepts `budget.elapsed_ms` only up to **3600000 ms**.
  A valid slow investigation can complete its evidence checks within all engine
  limits and then throw `Invalid integer`, losing the returned report instead
  of returning its completed/partial findings. Locations:
  [`run.ts`](../src/investigation/run.ts), [`report.ts`](../src/investigation/report.ts).
- **Independent reproducer:**
  `node --import tsx --test --test-isolation=none docs/evaluation/implementation-audit-2026-10-25/reproduce-runtime-limit.test.ts`
  failed **0/1 passed**, with the retained [stack/output](evaluation/implementation-audit-2026-10-25/runtime-limit-failure.txt).
  Fake Date/timers simulate **13 calls × 290000 ms = 3770000 ms** (**62m50s**),
  each below its 300000-ms deadline, using the existing mixed mock provider and
  scripted choices behind a simulated live-planner interface. No network/model,
  real-hour wait, history or AWS access. The failure occurs at report validation
  after the investigation, not in a provider request.
- **Passing baseline, separately retained:**
  `node --import tsx --test --test-isolation=none --experimental-test-coverage tests/*.test.ts`
  passed **230/230** with local loopback/subprocess permissions;
  [output/coverage](evaluation/implementation-audit-2026-10-25/regression-and-coverage.txt).
  Core observed line/branch coverage: model **100% / 93.41%**, engine
  **99.18% / 94.69%**, policy **100% / 93.42%**, report **98.99% / 90.04%**.
  These are coverage measurements, not completeness/correctness proofs.
  `npm run --silent evaluate -- --planner scripted` passed the eight designed
  cases, **8/8 correct**, **0 unsafe positives**, with valid current-run citations;
  [retained evaluation](evaluation/implementation-audit-2026-10-25/scripted-evaluation.json).
  `npm run typecheck`, `npm run typecheck:aws`, `npm run lint`, focused formatting
  and whitespace checks passed. The final docs hierarchy check **failed** its
  README length assertion: a concurrent, unrelated README edit increased it to
  **14 lines**, above the recorded 10-line cap; that edit was preserved.
  Retained logs were scanned for the configured model credential without printing it.
- **Scope/limits/next action:** reviewed planner output binding, executor scope
  and attempt/deadline boundaries, report evidence registration and chronology,
  deterministic safety/savings, and existing failure tests. No new paid calls;
  previous nine-request OpenAI proof is reused. Align runtime/report bounds and
  keep the adversarial reproducer as a regression before claiming this defect
  resolved. Live AWS coverage, remote Zetaris effective permissions, browser
  visual behavior, independent clean-checkout proof and repeated real-model
  reliability remain separate unclosed gates. This audit cannot establish the
  absence of other defects.

### Runtime budget defect fixed — 2026-10-25

- **Gate/owner:** bounded runtime and report preservation, Milad. **Verified fixed**
  for the runtime/report mismatch that could discard findings after an hour.
  User replaced the prior long
  timeout policy with a maximum **15 minutes overall** and **60 seconds per model
  call**. This supersedes the old audit reproducer's long-run completion expectation;
  its original failure and measurements remain historical evidence.
- **Change:** `src/investigation/limits.ts` owns the shared 900000-ms cap and
  5000-ms finalization reserve; `run.ts` uses one work deadline for model calls,
  evidence, pacing and bounded history recall/persistence. Small custom budgets
  reserve 10%. Completed verdicts/citations survive exhaustion; remaining
  candidates defer, persistence is skipped or disclosed as uncertain, and no
  retry occurs. `report.ts` accepts truthful safe-integer elapsed measurements
  rather than discarding older reports at one hour. Model adapter/runner share
  the 60000-ms cap. The single model web-investigation watchdog shares the
  15-minute cap; multi-investigation learning stays separate.
- **Executable regression:** `tests/runtime-budget.test.ts` checks oversize-budget
  rejection, a slow three-candidate investigation stopping at **895000 ms** while
  retaining conditional recommendation/rejection and deferring the last candidate,
  noncooperative recall/persistence stopping at **900 ms** of a 1000-ms custom
  budget, cancellation, unchanged returned reports after late adapter mutation,
  and truthful historical 3770000-ms elapsed validation. Original timeout,
  provenance, safe-deferral and model-error tests remain passing.
- **Verification:** `npm test` passed **235/235**, with local loopback/subprocess
  permissions; [retained output](evaluation/implementation-audit-2026-10-25/runtime-fix-regression.txt).
  The restricted first run had six EPERM fixture/subprocess failures; these all
  pass with the required permissions. `npm run typecheck`, `npm run typecheck:aws`,
  `npm run lint`, focused `npx biome format` and `git diff --check` passed.
  `npm run --silent evaluate -- --planner scripted` returned **8/8 correct**,
  **0 unsafe positives**, **44/44 valid citations**;
  [retained evaluation](evaluation/implementation-audit-2026-10-25/runtime-fix-evaluation.json).
- **Mode/limitations/next action:** fake timers, mock current evidence and local
  fixture histories; **zero new paid model calls** or live AWS/Zetaris probes.
  The five-second reserve covers ordinary finalization; Node timers cannot
  guarantee a wall-clock deadline through a blocked event loop or cancel remote
  work that ignores abort. Repeated real-model reliability, live source coverage,
  effective permissions and release proof remain open. The concurrent README
  edit is preserved and currently exceeds the documented 10-line cap; this
  runtime fix does not resolve that separate documentation conflict.

### Browser live-source diagnosis and history recall — 2026-10-24

- **Gate/owner:** demo presentation and live-source diagnosis, Milad; AWS data-source access remains Zayan/team. The browser now explains that account ID is a scope check, adds explicit read-only Zetaris recall on Investigate, and displays allowlisted AWS source issue codes. Follow through retains the separate acknowledged append path.
- **Proof/mode:** `npm test` passed 223/223 with loopback permission; `npm run typecheck`, `npm run lint`, and `git diff --check` passed. The browser suite verifies history read through a local HTTP fixture with zero additional append records. The default sandbox's first full run had three `listen EPERM` failures only. A live STS diagnostic failed with DNS `EAI_AGAIN` before authentication; `NODE_TLS_REJECT_UNAUTHORIZED=1 node --import tsx src/aws-demo.ts --live` returned `NETWORK_UNAVAILABLE` without resource details. No live AWS investigation or remote Zetaris call was proven by this change.
- **Next action:** run the web server where AWS SDK profile/credentials and network access are available, verify authenticated account and populated evidence, then show the Zetaris history read result and separately acknowledged follow-through in the demo. Do not interpret an account field or configured service as connectivity proof.

This table summarizes the release checklist below. [Historical execution receipts](history/execution-log.md) retain original commands and failed measurements; they are not current instructions. Acceptance criteria live in the [product contract](PROJECT_CONTEXT.md#9-test-and-release-acceptance).

| Gate | Verified state and proof | Remaining work / owner |
| --- | --- | --- |
| Day 2 engine and B | Complete with mock evidence, including safe missing-source deferral; [first-loop proof](history/execution-log.md#executed-first-loop-slice--2026-10-23) and [broader scenarios](history/execution-log.md#broader-ac-three-candidates-and-savings-proof--2026-10-23). | Live operational coverage is separate; Zayan. |
| AWS CLI | Live AWS default, explicit mock mode; AWS integration recorded `npm test` **204/204**, typechecks and lint passed. [Integration](history/execution-log.md#aws-merge-and-cli-integration-verification-2026-10-24), [default correction](history/execution-log.md#default-evidence-correction-2026-10-24). Live proof is limited to authenticated empty discovery. | Verify populated metrics and opted-in billing; configure authoritative jobs/dependencies and pricing/commitment coverage. Zayan/team; Milad verifies integrated reports. |
| Real model and both historical stores | Genuine NVIDIA call, remote Zetaris append/readback and local H-MEM recall in a real-model warm run over mock evidence; [proof](history/execution-log.md#successful-real-model-access-retry-and-warm-proof--2026-10-24). [Decision follow-through](history/execution-log.md#distinct-memory-roles-and-decision-follow-through--2026-10-24) also has real Zetaris proof. Oct 25 [OpenAI gate](#openai-reliability-gate-closed--2026-10-25): **9/9 complete**, 51 HTTP 200 model requests, 63/63 valid citations, mock evidence/history disabled. Earlier NVIDIA gates remain retained separately. | Repeated OpenAI A/B/C gate closed; Milad. Current admin identity fails least privilege; user provisions the dedicated account and Milad verifies it ([permission review](#zetaris-deployment-permission-review--2026-10-25)). Live evidence and event eligibility remain separate. |
| Learned investigation checks | Full scripted cold/warm/changed proof; live cold/warm plus separately recovered changed phase. [Proof](history/execution-log.md#learned-operational-check-cold-warm-and-changed-evidence--2026-10-24). Eight-workload H-MEM comparison ties both fixed orders; teaching cost retained. | No general advantage demonstrated. Prioritize live evidence; richer memory only with measured benefit. Milad. |
| Evaluation and reporting | A/B/C/failure fixtures, deterministic savings/null guards, validated trace and measured baselines recorded. [Evaluation](history/execution-log.md#measured-fixture-evaluation-and-earlier-failed-real-model-warm-attempt--2026-10-24), [diagnostics](history/execution-log.md#sanitized-failure-diagnostics-and-separate-execution-metrics--2026-10-24). Real-model failures remain in denominators. | Do not claim reliable real-model completion or live pricing from fixture results. Milad. |
| Release | Local isolated clean-checkout runtime proof passed at `391cdef` ([receipt](#clean-checkout-validation-and-coding-agent-runbook--2026-10-25)); release is **not complete**. | Independent reproducer/visual review, README policy reconciliation, final artifact security review, accurate sponsor/Cursor documentation, slides, 1–4 minute demo and portal/submission verification. Milad; Zayan reviews sources. |

**Next slice:** Zayan/team verifies populated live CloudWatch and opted-in Cost Explorer and supplies authoritative operational sources; Milad runs the integrated CLI against those sources, retaining `needs_verification` wherever critical coverage is missing. The repeated OpenAI A/B/C gate is closed; retain prior failures and complete the Oct 26 freeze assets. No positive live scheduling or numeric savings claim before its evidence gate passes.

## Owners

| Area                                       | Driver                         | Deliverable                                                                                                                                                  |
| ------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Direct evidence adapters and mock datasets | **Zayan**                      | Read-only TypeScript logical tools for inventory, billing, utilization, operations/jobs and dependencies, shared typed observations with stable evidence IDs |
| Zetaris history                            | **Milad**                     | Dedicated append-only structured history schema, authorized write boundary, allowlisted read and append, actual read-after-write proof                       |
| Planner/evaluator, approved model, H-MEM   | **Milad**                      | Bounded evidence-dependent loop, real reasoning memory round-trip, validated report, decision trace                                                          |
| Shared data/report contract and tests      | **Both**                       | Runtime validation, scope/UTC/units/coverage, integration mode labeling, A/B/C/D fixtures, missing-source case                                               |
| CLI, README, evaluation and submission     | **Milad** (Zayan reviews data) | Detailed readable report/JSON, repeatable commands, measured evaluation, slides and demo                                                                     |

## Schedule

- **Oct 24–25:** close populated live-evidence coverage and model reliability gaps in the status table.
- **Oct 26:** target freeze; independent clean-checkout reproduction, artifact security review, sponsor/Cursor explanation, slides and 1–4 minute demo.
- **Oct 27:** final verification, portal reconciliation and submission before the recorded 23:45 UTC deadline. Portal confirmation remains required.

## Release checklist

- [x] GitHub repository is public: Oct 24 `gh repo view milaforge/cloud-cost-investigator --json visibility,url` returned `PUBLIC`.
- [x] API-backed AWS provider is wired and default; injected-transport tests pass and authenticated empty discovery has live proof. Modes remain explicit.
- [ ] Verify populated live metrics/billing and authoritative operational coverage through the integrated CLI; disclose unavailable sources and keep unsafe/unknown opportunities deferred.
- [x] Genuine scoped Zetaris history append/readback and useful subsequent-run recall demonstrated with synthetic records.
- [ ] Verify effective least-privilege deployment permissions separately from successful history functionality: [current admin identity requires a new restricted app account](#zetaris-deployment-permission-review--2026-10-25); deployment owner is the user, verification owner Milad.
- [x] Genuine local H-MEM store/retrieve changes fresh query order; changed evidence corrects stale lessons. Eight-workload comparison ties fixed ordering; no general benefit claimed.
- [x] Team-approved real-model call and genuine NVIDIA contribution recorded; organizer/portal verification is separate.
- [ ] Describe actual Cursor use accurately in submission assets.
- [x] B evidence-dependent rejection demonstrated with real model calls over labeled mock evidence; validated current-run citations. No live operational-source proof implied.
- [x] Conditional-recommendation guards for peaks/jobs/dependencies and human approval tested with mock evidence; AWS adapter path is read-only. Live operational authority remains open.
- [x] Null-savings guards and reproducible marginal-compute arithmetic verified with synthetic pricing; live rates/commitment coverage remain open.
- [x] A/B/C/D and bounded source/model/history/memory failure paths reproducible offline; real sponsor warm proof recorded separately.
- [x] Demonstrate repeated real-model A/B/C execution: Oct 25 [OpenAI three-round gate](#openai-reliability-gate-closed--2026-10-25) passed **9/9 complete** under the 15-minute total / 60-second call limits, with mock evidence and histories disabled. Earlier failed NVIDIA measurements remain retained.
- [x] Measured evaluation against CPU heuristic and H-MEM against both fixed orders recorded with full denominators, failures, teaching cost and limitations.
- [ ] No credentials, sensitive exports, or raw secret-bearing provider responses in code/fixtures/reports.
- [ ] README, reproducible clean setup, slide deck, sponsor explanation and **1–4 minute demo** ready. Use [demo/deck preparation](DEMO.md) and [trace capture](CLI_GUIDE.md#capture-and-read-the-decision-trace); final artifacts and independent reproduction remain required.
- [ ] Submission portal verified and entry submitted before deadline.

## Adopted quality-bar release checks

Apply [`the_bar.md`](../the_bar.md) as illustrative quality guidance without changing the approved architecture or safety constraints. This table adds review criteria to the existing release gates; it is not a second milestone.

| Review criterion | Acceptance evidence / owner |
| --- | --- |
| Understandable agent behavior | [Role authority/shared state diagram](components.md), real-model trace showing evidence-dependent choices and evaluator critique; Milad. Scripted policy proof alone is insufficient for model behavior. |
| Reproducible output and failures | [CLI trace walkthrough](CLI_GUIDE.md#capture-and-read-the-decision-trace), A/B/C examples, missing-source result, exact modes and exits; local isolated clean-checkout proof recorded above; separate reproducer review remains; Milad/Zayan. |
| Sponsor and development claims | [Canonical explanation and reused components](components.md#sponsor-technology-explanation), real service receipts, actual development-tool attribution, permission and portal verification; existing open gates remain open; both. |
| Final presentation | Exported eight-topic slide deck and reviewed 1–4 minute video showing run, critique, sponsor proof, output and limitations; [storyboard](DEMO.md) is preparation only; Milad. |

## Documentation review — 2026-10-24

- **Gate/owner:** release documentation, Milad. Root README begins with hackathon participation, answers What and links only to Why and How, within 10 lines.
- **Ownership:** How owns setup; CLI owns invocation/model/diagnostics; components owns runtime structure; product context owns safety/contracts; H-MEM and follow-up own their distinct mechanisms; evaluation owns reproduction methodology. Current status stays here, with prior receipts under `docs/history/`.
- **Review:** removed duplicate guide pages, repeated setup, repeated memory-role tables, copied result summaries and stale status embedded in contracts/provisioning. Preserved the recorded rules JSON and historical failed measurements.
- **Executed proof:** `python3 /tmp/verify-cci-doc-hierarchy.py` passed: README 9/10 lines, hackathon participation first, only Why/How entry links, all 159 local links/anchors valid, all project docs reachable, no duplicate maintained prose paragraphs of at least 25 words, recorded rules JSON unchanged and dated execution receipts preserved. `git diff --check` passed. The three-second reading goal is editorial, not a timed user-study result.
- **Mode/limits:** documentation only. No new service access, runtime verification or completed release gate. Next action: finish the existing live-evidence and release checklist.

## Submission documentation clarification — 2026-10-24

- **Gate/owner:** release documentation, Milad. User highlighted the mandatory README setup/usage/dependencies and Zetaris/Meterless/NVIDIA sponsor explanation.
- **Changed:** root README now includes prerequisites, clone/install direction and an explicit synthetic-demo command within 10 lines. How links to the canonical sponsor explanation in components, which distinguishes actual integrations from scripted planning and mock operational evidence.
- **Executed:** `gh repo view milaforge/cloud-cost-investigator --json visibility,url` returned `PUBLIC`; this was a read-only live GitHub metadata check. README dependency/setup/usage assertions and all three sponsor entries passed. `python3 /tmp/verify-cci-doc-hierarchy.py` passed: README 10/10 lines, mandatory opening, only Why/How root links, 166 local links/anchors, document reachability, duplicate-prose checks and unchanged rules JSON/historical receipts. `git diff --check` passed.
- **Limits/next action:** no runtime/model/AWS/Zetaris probe or repository-visibility change. Final clean-checkout reproduction, assets and portal reconciliation remain open.

## External dependency clarification — 2026-10-24

- **Gate/owner:** release documentation, Milad. README dependencies now explicitly include a Zetaris service for history and decision follow-up, optional for the standalone demo. Zetaris is accessed through the existing HTTP adapter, not installed by npm. Preserved the user's current README wording and layout.
- **Proof/mode:** static inspection of `package.json` and `src/tools/zetaris.ts`; targeted assertion verified the README service requirement and optional-demo qualifier. No runtime or live-service probe executed. Existing release gates remain open.

## Quality-bar alignment verification — 2026-10-24

- **Gate/owner:** existing release documentation gate, Milad; implementation behavior traced before editing. `the_bar.md` is now required contributor reading, applied to current architecture rather than copied as a template.
- **Changed:** root README restored to 10 lines with mandatory participation first; How routes to demo/deck preparation; components documents shared state, role authority, feedback and reused components; CLI reference documents report capture, actual trace fields, B critique and failure behavior. Evaluation links three complete generated A/B/C reports. No source code, dependencies, secrets or infrastructure changed; pre-existing worktree edits preserved.
- **Executed runtime proof:** `ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario SCENARIO --json`, separately for A/B/C/missing. A returned `conditional_recommendation`, B/C `not_recommended`, all complete with exit 0; missing returned `needs_verification`, partial with exit 2. The readable B variant also passed, showing proposal → evaluator challenge → retrieved job conflict → rejection. A/B/C outputs retained under `docs/evaluation/examples/`; missing and readable captures were temporary validation artifacts.
- **Executed checks:** `npm test` **215/215 passed**; `npm run typecheck`, `npm run typecheck:aws`, `npm run lint` passed. Documentation hierarchy/link check passed, including the 10-line root, only Why/How root links, reachable project docs, unchanged recorded rules JSON and preserved historical receipts. `git diff --check` passed.
- **Mode/limits:** synthetic evidence, scripted planner, historical stores disabled; no AWS/model/Zetaris access. No claim of an independent clean checkout, finished slides/video, Cursor activity, new sponsor integration proof or completed release. Follow the existing live-evidence/model/permission and final-asset gates above.

## Initial local A/B report viewer — 2026-10-24

The execution-only restrictions in this receipt are superseded by the guided browser demo below; the original verification evidence is retained.

- **Gate/owner:** release presentation surface, Milad; no advancement of the
  populated-live-evidence or final submission gates. User approved A/B scenario
  selection and loading generated single investigation reports.
- **Implemented:** `npm run demo:web` generates fresh synthetic A/B reports,
  starts a loopback server on an available port and opens a browser. The minimal
  viewer presents verdicts, scheduling conflicts, qualified savings, human
  actions and critical unknowns, with progressive evidence/trace/history detail.
  Report upload/drop reuses the full runtime validator and retains the current
  display after invalid input. No new production dependencies.
- **Executed:** `npm test` passed **216/216** after the HTTP test was added;
  final `node --import tsx --test tests/demo-web.test.ts` passed **2/2** after
  adding browser-launch success/missing-opener coverage. `npm run typecheck`,
  `npm run lint`, `node --check src/web/app.js` and `git diff --check` passed.
  Loopback tests require execution outside this environment's network sandbox;
  the initial sandbox startup failed with `EPERM`, not a product failure.
- **Browser proof:** `node --import tsx /tmp/cci-web-browser.mjs` passed using
  available external Playwright tooling and system headless Chromium. Verified
  A/B switching, disclosures, evidence dialogs, keyboard Enter/Escape, valid,
  malformed, oversized, partial, failed, empty, C and mixed-candidate uploads,
  drag-and-drop, retained loaded tab, safe text rendering, 390px mobile overflow
  and no page errors. Desktop/mobile screenshots were visually inspected.
  The failed-report harness initially omitted its planner's required model
  metadata; corrected the fixture and reran successfully without changing the
  production engine. Actual `npm run demo:web` started and its default browser
  opener exited successfully; URL fallback also has focused test coverage.
- **Security/mode:** all demo evidence is mock, planner scripted, histories
  disabled; no `.env` loading, AWS/model/Zetaris access or history persistence.
  Host/origin rejection, non-allowlisted paths, invalid citations, forged
  savings, oversized payloads and no-store/CSP headers were verified. Imported
  reports remain untrusted evidence claims even after consistency validation.
- **Limits/next action:** Chromium desktop/mobile emulation is not physical
  device, Firefox/Safari or Windows verification. The browser harness/screenshots
  are temporary verification artifacts; API/launcher tests are retained in the
  repository. Use the viewer for the existing demo/deck gate; final recorded
  assets, populated live evidence and independent clean-checkout proof remain
  outstanding. Setup lives in [How](HOW.md#open-the-web-demo).

## Execution-event tree presentation — 2026-10-24

- **Gate/owner:** release demo presentation, Milad. This is a browser-only
  presentation change; the underlying investigation and progress contract are
  unchanged. Planner calls now render as expanded branches with indented
  steps, while other event text remains visible.
- **Proof/mode:** `node --check src/web/app.js`, `npm run lint`, `npm run
  typecheck`, and `git diff --check` passed. Focused
  `node --import tsx --test --test-isolation=none tests/demo-web*.test.ts`
  passed **7/7** with loopback access; its first sandbox run had three
  environment-only `listen EPERM` failures. Headless Chromium ran the mock B
  investigation, rendered five planner branches, showed the first branch's two
  child steps without a second click, and reported no page errors; screenshot
  visually inspected.
- **Limits/next action:** this verifies local synthetic presentation, not live
  AWS/model/Zetaris evidence. Final demo recording and release gates remain open.
- **Presentation refinement:** removed planner boxes and per-call counts. An
  expanded plain tree now replaces explicit `ok` with an inline green tick and
  other explicit statuses with an inline red cross; the exact status remains in
  accessible text and the source event. Unreported results have no mark.
  `node --check src/web/app.js`, `npm run lint`, `npm run typecheck`, and
  `git diff --check` passed. Local Chromium verified the mock B green ticks,
  missing-evidence red cross, absence of branch borders, and no page errors;
  screenshot inspected. Live integration gates are unchanged.

## Guided browser demo — 2026-10-24

- **Gate/owner:** release presentation and reproducibility, Milad. User approved
  offline demo defaults with explicit real-service controls after judging the
  report-only surface insufficient. Existing live-evidence gates remain open.
- **Implemented:** browser-started A/B/C/missing/multi-candidate investigations,
  configurable explicit live model/read-only AWS options, real local H-MEM
  cold/warm/changed learning, and explicitly acknowledged real Zetaris synthetic
  follow-through. Report import/export, current evidence inspection, partial
  outcomes and progressive trace/history details are retained. One worker runs
  at a time with deadlines, stop, bounded progress and refresh/reconnect recovery
  that never replays writes. No new dependency or replacement investigation loop.
- **Executed proof:** `npm test` passed **222/222**. Final focused
  `node --import tsx --test --test-isolation=none tests/demo-web*.test.ts` passed
  **7/7**, covering opt-ins, single-worker exclusion, request-ID reuse/conflict,
  cancellation, actual offline investigations and H-MEM learning, local fixture
  Zetaris append/readback (seven records), model HTTP failure without fallback,
  HTTP boundaries, uploads and browser launching. Typecheck, lint, JS syntax,
  documentation links/anchors and diff whitespace checks passed.
- **Browser proof:** `node --import tsx /tmp/cci-workflow-browser.mjs` passed with
  installed external Playwright tooling and system Chromium. Clicked through
  investigation, actual cold/warm/changed H-MEM, report inspection/download,
  partial outcome, explicit model/write opt-ins, follow-through via a local HTTP
  ledger fixture, seven retained fixture records, refresh without duplicate
  append, cancellation and 390px mobile layout. Learning desktop and follow-through
  mobile screenshots were visually inspected. The first harness assertion read
  a collapsed event panel; expanding it fixed the harness, not product behavior.
- **Mode/limits:** no real remote model, AWS or Zetaris call was made by this
  verification. H-MEM used real isolated local persistence; Zetaris used its real
  adapter against an HTTP fixture; model failure used an HTTP fixture. This
  proves browser integration, not new live sponsor/evidence coverage. Browser
  simulation is not physical-device or cross-browser proof. Configuration
  presence is deliberately labeled unverified. Interrupted remote writes can
  remain and must be inspected before retry; no infrastructure is changed.
- **Next action:** use [How](HOW.md#open-the-web-demo) to run the presentation,
  explicitly opt into configured services when recording the real-service demo,
  and continue the existing populated-evidence, permissions and release gates.
  The local UI now loads `.env` for optional server configuration; it does not
  contact any service until the relevant explicit browser action.

## Coordination

Zayan owns data-source truth; Milad owns verdict/report truth. Agree on shared contracts before concurrent changes and preserve unrelated work. Record new executable evidence here with command, outcome, mode, owner, blocker and next action. Keep rationale in `memory.md`; historical receipts are retained, not a second active tracker.

## Verdict-first visual restructuring — 2026-10-24

- **Gate/owner:** release presentation, Milad. Visual-only pass on `src/web/`:
  prominent green/red/amber verdict, concise candidate-specific timeline,
  evidence collection times and run boundaries, accessible info controls,
  progressive detail and native motion with reduced-motion support. Preserved
  engine behavior, report contracts, service opt-ins and existing worktree work.
- **Executed:** `node --import tsx --test --test-isolation=none tests/demo-web*.test.ts`
  **7/7 passed**; `npm run typecheck`, `npm run lint`, `node --check src/web/app.js`
  and `git diff --check` passed. Temporary `node --import tsx
  /tmp/cci-ui-render-check.mjs` passed DOM-level A/B/C/missing/multi-candidate
  rendering, conditional approval, timestamp provenance, proposal-before-rejection,
  evidence-dialog wiring, tooltip focus/blur/Escape, candidate focus retention
  and reduced-motion checks. HTML IDs and JS element bindings also checked.
- **Mode/limits:** synthetic/scripted reports; focused existing tests additionally
  use isolated H-MEM and local HTTP fixtures. No new live-service verification.
  The browser connector returned no available browsers, so this pass has **no
  browser-rendered screenshot, mobile-layout or visual verification**. Prior
  browser receipts describe the previous layout only. No extra dependencies.
- **Next action/blocker:** visually review desktop/mobile rendering and hover/tap
  behavior when a browser is available; final video/deck and live-evidence gates
  remain open. No individual reasoning timestamps were invented.

## Explicit demo selection — 2026-10-24

- **Gate/owner:** demo presentation, Milad. Startup has no selected scenario/report;
  scenario/source changes clear stale output, empty mock runs prompt for selection,
  and prior completed jobs require **View last result**. Active-job recovery and
  independent learning/follow-through/live-AWS controls retain their behavior.
- **Proof:** `node --import tsx /tmp/cci-ui-selection-check.mjs` passed DOM checks
  for startup, empty-run guard, explicit preview, stale-report clearing and manual
  prior-result display, plus the earlier rendering checks. Typecheck, lint, JS
  syntax and diff whitespace checks passed. Synthetic DOM simulation only;
  browser visual review remains unavailable, with no new live-service proof.

## Scenario validation toast — 2026-10-24

- **Gate/owner:** demo presentation, Milad. Missing-scenario feedback now appears
  in a fixed, dismissible, politely announced toast. It clears on selection,
  preview/import or workflow changes and retains focus guidance to the selector.
- **Proof/mode:** `node --import tsx /tmp/cci-ui-toast-check.mjs` passed notification
  display/dismissal/selection cleanup and existing DOM checks; lint, format, JS
  syntax and diff whitespace checks passed. DOM simulation only; visual browser
  verification remains pending. No backend or dependency changes.

- **Toast countdown follow-up:** auto-dismiss after 10 seconds with a horizontal
  remaining-time bar; repeat notifications restart both, manual dismissal clears
  both, and reduced motion uses one-second steps. `node
  /tmp/cci-toast-countdown-check.mjs` passed simulated-clock expiry, restart,
  cleanup and focus checks; existing DOM checks, lint, formatting, JS syntax and
  diff checks passed. Browser visual verification remains pending.
