# Cloud Cost Investigator — Execution Plan (Milad + Zayan)

[What](../README.md) · [Why](WHY.md) · [How](HOW.md)

> **Sole execution tracker.** Event requirements are recorded in [`RULES.md`](RULES.md); approved product and safety contracts are in [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md); agent workflow in [`../AGENTS.md`](../AGENTS.md). A task is complete only with executed evidence. Preserve the distinction between team decisions, planned work, mocks and verified live integrations.

**Hackathon track:** 02 — The Agent That Can Explain Why.  
**Approved scope (2026-10-23):** AWS EC2 off-hours scheduling safety; direct current-evidence tools; Zetaris structured history; Meterless reasoning memory; no infrastructure modification. The older cost-increase/snapshot-comparison workflow is superseded.  
**Deadline:** 2026-10-27 23:45 UTC in recorded event notes; verify portal. Target freeze: Oct 26.  
**Active milestone:** Days 3–4 — full user flows and live-evidence integration, reconciled Oct 24, 2026. Day 2's mock B/failure gate and separate real-model, H-MEM and Zetaris round-trips have linked historical proof. This advances the work stage, not the combined live-evidence or release gates.

## Current status and next actions — reconciled 2026-10-24

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
| Real model and both historical stores | Genuine NVIDIA call, remote Zetaris append/readback and local H-MEM recall in a real-model warm run over mock evidence; [proof](history/execution-log.md#successful-real-model-access-retry-and-warm-proof--2026-10-24). [Decision follow-through](history/execution-log.md#distinct-memory-roles-and-decision-follow-through--2026-10-24) also has real Zetaris proof. | Effective dedicated-user least privilege remains unverified; Zayan/user. Reliable real-model A/B/C completion remains open; Milad. |
| Learned investigation checks | Full scripted cold/warm/changed proof; live cold/warm plus separately recovered changed phase. [Proof](history/execution-log.md#learned-operational-check-cold-warm-and-changed-evidence--2026-10-24). Eight-workload H-MEM comparison ties both fixed orders; teaching cost retained. | No general advantage demonstrated. Prioritize live evidence; richer memory only with measured benefit. Milad. |
| Evaluation and reporting | A/B/C/failure fixtures, deterministic savings/null guards, validated trace and measured baselines recorded. [Evaluation](history/execution-log.md#measured-fixture-evaluation-and-earlier-failed-real-model-warm-attempt--2026-10-24), [diagnostics](history/execution-log.md#sanitized-failure-diagnostics-and-separate-execution-metrics--2026-10-24). Real-model failures remain in denominators. | Do not claim reliable real-model completion or live pricing from fixture results. Milad. |
| Release | README/setup and retained proof exist; release is **not complete**. | Clean-checkout/independent reproduction, final artifact security review, accurate sponsor/Cursor documentation, slides, 1–4 minute demo and portal/submission verification. Milad; Zayan reviews sources. |

**Next slice:** Zayan/team verifies populated live CloudWatch and opted-in Cost Explorer and supplies authoritative operational sources; Milad runs the integrated CLI against those sources, retaining `needs_verification` wherever critical coverage is missing. Continue model reliability work with retained failures, then complete the Oct 26 freeze assets. No positive live scheduling or numeric savings claim before its evidence gate passes.

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
- [ ] Verify effective least-privilege deployment permissions separately from successful history functionality.
- [x] Genuine local H-MEM store/retrieve changes fresh query order; changed evidence corrects stale lessons. Eight-workload comparison ties fixed ordering; no general benefit claimed.
- [x] Team-approved real-model call and genuine NVIDIA contribution recorded; organizer/portal verification is separate.
- [ ] Describe actual Cursor use accurately in submission assets.
- [x] B evidence-dependent rejection demonstrated with real model calls over labeled mock evidence; validated current-run citations. No live operational-source proof implied.
- [x] Conditional-recommendation guards for peaks/jobs/dependencies and human approval tested with mock evidence; AWS adapter path is read-only. Live operational authority remains open.
- [x] Null-savings guards and reproducible marginal-compute arithmetic verified with synthetic pricing; live rates/commitment coverage remain open.
- [x] A/B/C/D and bounded source/model/history/memory failure paths reproducible offline; real sponsor warm proof recorded separately.
- [ ] Demonstrate reliable real-model A/B/C execution; retain all failed measurements and explicit safe partial outcomes.
- [x] Measured evaluation against CPU heuristic and H-MEM against both fixed orders recorded with full denominators, failures, teaching cost and limitations.
- [ ] No credentials, sensitive exports, or raw secret-bearing provider responses in code/fixtures/reports.
- [ ] README, reproducible clean setup, slide deck, sponsor explanation and **1–4 minute demo** ready. Use [demo/deck preparation](DEMO.md) and [trace capture](CLI_GUIDE.md#capture-and-read-the-decision-trace); final artifacts and independent reproduction remain required.
- [ ] Submission portal verified and entry submitted before deadline.

## Adopted quality-bar release checks

Apply [`the_bar.md`](../the_bar.md) as illustrative quality guidance without changing the approved architecture or safety constraints. This table adds review criteria to the existing release gates; it is not a second milestone.

| Review criterion | Acceptance evidence / owner |
| --- | --- |
| Understandable agent behavior | [Role authority/shared state diagram](components.md), real-model trace showing evidence-dependent choices and evaluator critique; Milad. Scripted policy proof alone is insufficient for model behavior. |
| Reproducible output and failures | [CLI trace walkthrough](CLI_GUIDE.md#capture-and-read-the-decision-trace), A/B/C examples, missing-source result, exact modes and exits; independent clean-checkout reproduction still required; Milad/Zayan. |
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
