# Cloud Cost Investigator — Execution Plan (Milad + Zayan)

## Coherence slice 1 — narrative and scenario presentation (2026-10-26)

- **Gate/owner:** Days 3–4 product coherence, Milad. README, diagrams, scenario runbook, historical trace ordering, demo narrative and slides now lead with a cited rejection or actionable evidence gap. Current broader conditional-clearance behavior remains labeled honestly. Historical trace payloads remain unchanged.
- **Proof:** `git diff --check` passed. `npm run export:scenarios` and `node --import tsx --test --test-isolation=none tests/scenario-export.test.ts` were executed but failed because EC2-2 currently fails in the concurrently edited runtime. No generated export was published and no scenario pass is claimed for this slice.
- **Mode/blocker/next:** documentation-only changes; no service calls. Resolve runtime changes and outcome semantics in slice 2, rerun scenario proof, then regenerate the current export. Existing live/release gates remain open.

[What](../README.md) · [How](HOW.md)

> **Sole execution tracker.** Event requirements are recorded in [`RULES.md`](RULES.md); approved product and safety contracts are in [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md); agent workflow in [`../AGENTS.md`](../AGENTS.md). A task is complete only with executed evidence. Preserve the distinction between team decisions, planned work, mocks and verified live integrations.

**Hackathon track:** 02 — The Agent That Can Explain Why.  
**Approved scope (2026-10-23):** AWS EC2 off-hours scheduling safety; direct current-evidence tools; Zetaris structured history; Meterless reasoning memory; no infrastructure modification. The older cost-increase/snapshot-comparison workflow is superseded.  
**Deadline:** 2026-10-27 23:45 UTC in recorded event notes; verify portal. Target freeze: Oct 26.  
**Active milestone:** Days 3–4 — full user flows and live-evidence integration, reconciled Oct 25, 2026. Day 2's mock B/failure gate and separate real-model, H-MEM and Zetaris round-trips have linked historical proof. This advances the work stage, not the combined live-evidence or release gates.

### User-selected web lookback and measured partial reports — 2026-10-26

- **Owner/slice:** Milad web/runner integration within the active live-evidence milestone. Live toolbar accepts 1–14 complete UTC days (default 7); browser/server validation and worker forwarding reuse CLI period alignment. AWS scope/model/history remain server-controlled.
- **Verified:** `node --import tsx --test --test-isolation=none tests/demo-web-ui.test.ts tests/demo-web-jobs.test.ts tests/demo-web.test.ts` passed **21/21** with localhost access. Covers invalid input before job creation, Demo visibility, selected two-day worker output, existing lifecycle and isolated local fixture integrations. Initial sandbox attempt blocked localhost; a request-shape expectation was updated for the new field.
- **Policy proof:** `node --import tsx --test --test-isolation=none --test-name-pattern='EC2 4:|partial CPU observations' tests/investigation.test.ts tests/recommendation-boundary.test.ts` passed **2/2**. Low/peaky partial metrics retain citations, uncertainty and null savings; a two-day run remains deferred. `npm run typecheck`, scoped Biome lint and `git diff --check` passed.
- **Mode/limits/next:** synthetic/isolated local fixture proof only; no live AWS, paid model, remote writes or browser-layout verification. Partial-metric planner gate and seven-day recommendation minimum remain unchanged. SSM/ELBv2 cannot establish workload-wide absence; full live recommendation evidence remains a separate gate. Restart `npm start`, choose the period, and explicitly run Live to verify the intended account.


## Current status and next actions — reconciled 2026-10-25

### Task 3 final evidence and slide review — 2026-10-26

- **Gate/owner/mode:** Days 3–4 direct-evidence review, Zayan; offline code,
  retained live receipts and read-only slide review. Fast-forwarded the clean
  `task2-ec2-scenarios` checkout from `50fcd13` to `74a644c`; all three existing
  safety stashes retained. No commit/push, AWS/model calls or remote writes.
- **Small fix:** empty CloudWatch results now report the provider's default
  300-second requested period rather than 3600 seconds. Seven missing days mean
  2016 expected samples per metric, not 168. The unavailable source status and null
  data remain unchanged. Extended the intercepted-SDK coverage test for this path.
- **Verification:** `node --import tsx --test --test-isolation=none
  tests/aws-collector.test.ts tests/aws-agent.test.ts tests/aws-operational.test.ts
  tests/aws-cli.test.ts tests/evidence-diagnostics.test.ts
  tests/report.test.ts tests/trace-retry.test.ts`
  covered the seven existing files and passed **104/104**. The original invocation
  also included nonexistent `tests/recommendation-policy.test.ts`, which the
  runner ignored; no separate recommendation-policy file was tested.
  The changed test separately passed **1/1** with
  `--test-name-pattern='investigation requests five-minute'`. Both TypeScript
  projects passed (`node node_modules/typescript/bin/tsc -p
  tsconfig.investigation.json --noEmit` and `-p tsconfig.aws.json`); scoped Biome
  lint and `git diff --check` passed. All transports were local fixtures/mocks.
- **Live proof boundary:** the retained Oct 26 integrated CLI receipt used seven
  days and a scripted planner: 367/2016 samples per metric, partial billing,
  `needs_verification`, null savings, operational checks not reached. Separate
  fourteen-day source-access checks do not establish complete workload authority.
- **Slide handoff:** Downloads Markdown matches repository `slides.md`; all ten
  PDF pages rendered and inspected without editing either attachment. Milad:
  correct cover `Mila` to `Milad`, restore the CLI identifier `i-mock-primary`
  (or explicitly label an alias), separate overlapping stack rows on PDF page 5,
  preserve the decision-loop diagram and add factual development-tool attribution.
  Date the historical call-count benchmark; retain synthetic/live distinctions.
- **Blockers/next:** full live coverage/authority, effective Zetaris permission
  evidence and final release checks remain open. Finish the reviewed video,
  artifact/privacy review and portal reconciliation; no release gate advanced.
### Project AWS profile/region at web startup — 2026-10-26

- **Gate/owner:** Days 3–4 web setup usability, Milad. User requested plain `npm start` prefer `.env` values for `AWS_PROFILE` and `AWS_REGION` over conflicting inherited exports. Startup explicitly selects these two overrides through the shared native parser; workers inherit them. Missing file keys and other settings preserve shell precedence. Updated setup, agent guidance and rationale; no secrets changed or logged.
- **Executed proof:** `node --import tsx --test --test-isolation=none tests/config.test.ts` passed **10/10**, including file overrides, default precedence, worker-style reload, missing keys/files and sanitized unreadable-file errors. `npm run typecheck`, scoped Biome lint/format on `src/config.ts`, `scripts/demo-web.ts`, `tests/config.test.ts`, and `git diff --check` passed.
- **Limits/blocker/next:** Combined config/web/job tests with loopback access passed **21/22**; H-MEM `learned.passed` assertion at `tests/demo-web-jobs.test.ts:174` failed in the combined run but passed when rerun alone. Initial sandbox run also blocked local listeners with `EPERM`. The combined learning failure remains unresolved; no live AWS/model/Zetaris proof was attempted. Restart plain `npm start` to apply profile/region selection. Broader release gates remain open.


### Automatic inventory before model planning — 2026-10-26

- **Gate/owner:** Days 3–4 investigation efficiency, Milad. User removed the
  initial inventory-or-finish model turn. The runner binds inventory discovery
  and reuses the executor's scope/data validation, retries, cancellation,
  deadlines and evidence registry. The first planner prompt receives validated
  inventory and its attempt trace. Empty/failed inventory invokes no planner;
  partial inventory keeps its gaps. Automatic discovery is an evaluator action,
  not a model decision. Actual planner calls are counted; old reports retain
  their call-count validation. Later model failure retains inventory as partial
  evidence. Documentation, README flow and agent rules align; rationale is in
  `memory.md`.
- **Executed focused proof:** `node --import tsx --test --test-isolation=none
  tests/planner-diagnostics.test.ts tests/planner-retry.test.ts
  tests/trace-retry.test.ts tests/runtime-budget.test.ts tests/config.test.ts
  tests/provider-error.test.ts tests/model-messages.test.ts` passed **71/71**.
  Discovery/empty/partial/retry/repetition cases in `tests/investigation.test.ts`
  passed **9/9** using `--test-name-pattern='repeated identical|required
  inventory|initial inventory|empty inventory|partial inventory|list_ec2_instances'`.
  Updated evaluation and failed warm-model expectations passed **2/2** using
  `--test-name-pattern='real-model failure remains|demo retains a failed model phase'`
  on `tests/evaluation.test.ts tests/warm-learning.test.ts`.
- **Broader proof:** `npm test` completed **356 tests: 352 passed, 4 failed**
  on old first-turn expectations (evaluation tool count/completion, repeated-action
  target, first JSONL summary, and warm-demo failure index). All four expectations
  were corrected and their focused reruns passed: the 9-case discovery/repetition
  run and 2-case evaluation/warm run above, plus `node --import tsx --test
  --test-isolation=none tests/trace-jsonl.test.ts` (**4/4**). The newly added initial
  inventory recovery case ran separately after the full suite had loaded. No
  implementation failures remain from that run; the entire slow suite was not
  repeated after test-only corrections. The worker fixture confirms inventory
  is already in the first model request. `npm run typecheck`, targeted Biome
  lint/format and `git diff --check` passed.
- **Mode/limits:** fixture/synthetic evidence, mocked model transport and local
  HTTP worker/UI proof only; no live AWS, paid inference or remote Zetaris calls.
  Restart `npm start` for a new Live run. Broader release gates remain open.



### Inspectable model prompts and outputs — 2026-10-26

- **Gate/owner:** Days 3–4 web investigation transparency, Milad. Execution
  events now show expandable prompt/output display copies per planner attempt.
  Captured at the model adapter, redacted before IPC, bounded and rendered as
  literal text; disclosures stay open during polling. Includes invalid assistant
  content before parsing, with no fabricated response on transport failure.
  Metadata-only progress, persisted reports, planning policy and verdicts remain
  unchanged. Rationale: `memory.md`; contract: `components.md` local viewer.
- **Executed proof:** `node --import tsx --test --test-isolation=none
  tests/model-messages.test.ts tests/planner-diagnostics.test.ts
  tests/config.test.ts tests/demo-web-ui.test.ts tests/demo-web-jobs.test.ts
  tests/demo-web.test.ts` passed **48/48** with localhost access. Covers actual
  worker IPC from a local HTTP model fixture, literal text/XSS handling,
  disclosure state, redaction, malformed output, no-output transport failure,
  observer failure isolation and existing retry behavior. After adding the
  redaction disclosure note, `tests/demo-web-ui.test.ts` passed **8/8** again.
  `npm run typecheck`, targeted Biome lint/format, `node --check src/web/app.js`
  and `git diff --check` passed. Initial sandbox HTTP tests hit `listen EPERM`;
  rerun with localhost access passed. Test authoring errors were corrected before
  the passing run.
- **Mode/limits/next:** local fixtures and DOM handler tests, no live AWS,
  paid-model or remote Zetaris calls; no browser visual-layout proof. Messages
  are current-job display data, absent from old saved reports and scripted
  previews. No blocker for this slice. Restart `npm start` and run a new Live
  investigation to see messages; broader release gates remain open.



### Dynamic UI entrance motion and CTA loading — 2026-10-26

- **Gate/owner:** Days 3–4 web usability, Milad. `src/web/app.js` and
  `src/web/style.css` add short entrances for report sections, changed status,
  evidence details, disclosures and newly received execution events. Previously
  received events do not replay on polling. Reduced motion disables entrances
  and spinner rotation. Pending investigation, decision, stop, upload validation
  and preview buttons expose loading labels, spinners and `aria-busy`; completion,
  failure, cancellation and mode changes restore the applicable button state.
- **Executed proof:** `node --import tsx --test --test-isolation=none
  tests/demo-web-ui.test.ts tests/demo-web.test.ts tests/demo-web-jobs.test.ts`
  passed **14/14** with loopback access, including validation-without-start,
  pending/recovered/terminal action states, failed requests, mode isolation and
  new-event-only/reduced-motion behavior. `npm run typecheck`, `npm run lint`,
  scoped Biome format, `node --check src/web/app.js` and `git diff --check`
  passed; existing unrelated CSS warning and probe style info remain.
- **Mode/limits/next:** DOM-handler and local HTTP fixture verification only;
  no paid model, AWS or remote Zetaris calls. The initial sandbox run hit four
  loopback `listen EPERM` failures; the permitted rerun passed. Local startup
  succeeded, then the test server was stopped. Browser inspection was attempted,
  but no browser surface is available; rendered motion still needs visual review.
  Restart the viewer to reload its cached assets. Live/release gates stay open.

### Run-click configuration validation without a Live settings section — 2026-10-26

- **Gate/owner:** Days 3–4 web usability, Milad. User correction removes the entire
  Live configuration section and its service checkbox. Clicking Run investigation
  authorizes the read/model run. The server validates loaded AWS scope and model
  configuration before worker startup; failures name `.env` settings and request
  restarting `npm start`. The UI uses its existing toast, restores button focus
  and never presents a running job, Stop button or events for rejected setup.
  Separate decision-write acknowledgment remains. Removed unused panel styles;
  updated agent rules, setup, product context, architecture and rationale.
- **Executed proof:** `node --import tsx --test --test-isolation=none
  tests/demo-web-ui.test.ts tests/demo-web.test.ts tests/demo-web-jobs.test.ts`
  passed **17/17** with local loopback access. Includes missing/invalid scope and
  model configuration before worker startup, direct Run clicks, pending validation,
  successful starts, mode isolation and rejection of browser overrides.
  `npm run typecheck`, targeted `npx --no-install biome lint` (four changed JS/TS
  files), `npx --no-install biome format` (those files plus web CSS),
  `node --check src/web/app.js` and `git diff --check` passed.
- **Mode/limits/next:** synthetic/local HTTP fixture and DOM-handler proof only;
  no live AWS, paid-model or remote Zetaris calls and no `.env` edits. No blocker
  for this slice. Restart `npm start` to reload cached UI assets; configure the
  intended AWS account guard before a live run. Broader release gates remain open.


### Server-configured Live investigations — 2026-10-26

The newer Run-click correction above supersedes the displayed configuration and
separate investigation service acknowledgment in this earlier implementation.

- **Gate/owner:** Days 3–4 web usability, Milad. Removed browser planner,
  Zetaris-read and editable scope controls. Live always uses the configured model,
  automatically reads configured Zetaris history without appending, and displays
  validated server scope from `AWS_EXPECTED_ACCOUNT_ID`, `AWS_REGION` and
  `CCI_MAX_CANDIDATES` (1–3, default 1). The HTTP boundary rejects overrides and
  missing/invalid scope before worker startup. Explicit service/write safeguards
  remain. Setup, AWS references, project context, agent rules and memory align.
- **Executed proof:** `npm run typecheck` passed; `node --import tsx --test
  --test-isolation=none tests/demo-web-ui.test.ts tests/demo-web.test.ts
  tests/demo-web-jobs.test.ts tests/evidence-diagnostics.test.ts` passed **22/22**.
  Targeted `npx biome lint` and `npx biome format` on the six changed JS/TS files,
  plus `git diff --check`, passed. The first sandbox test run had four local
  `listen EPERM` failures; the complete rerun with loopback access passed.
- **Mode/limits:** synthetic/local HTTP fixtures only, no live AWS/model/Zetaris
  calls and no `.env` edits. Existing concurrent edits preserved. Configuration
  presence inspection found `AWS_REGION` present, account guard and candidate
  limit absent. **Next action:** set the intended `AWS_EXPECTED_ACCOUNT_ID`,
  optionally set `CCI_MAX_CANDIDATES`, and restart the server. Missing account
  configuration blocks Live execution; broader release gates remain open.

### Missing `.env` startup guidance — 2026-10-26

- **Gate/owner:** Days 3–4 web setup usability, Milad. `npm start` uses the
  existing environment loader's result to suggest copying or renaming
  `.env.example`, filling required service values and restarting when `.env`
  is absent. The notice does not block Demo or create configuration files.
- **Executed proof:** `npm run typecheck` and `git diff --check` passed. A
  Python subprocess check launched `node --import <installed tsx loader>
  scripts/demo-web.ts --no-open` from two temporary working directories, with
  an absent or empty `.env`. Both served HTTP 200; only the absent case printed
  setup guidance; neither modified configuration. Used installed Node's actual
  binary to avoid the version-manager shim's temporary-directory restriction;
  loopback permission was required for the server check.
- **Mode/limits:** local startup only; no cloud/model/history calls. Existing
  edits preserved. No blocker for this slice; broader release gates remain open.

### Live workflow tab prerequisites — 2026-10-26

- **Gate/owner:** Days 3–4 web usability, Milad. Learn and Follow through stay
  visible but disabled until a live report is selected from a run or validated
  upload. Navigation handlers enforce the same condition; Demo tabs stay enabled.
- **Executed proof:** `node --import tsx --test --test-isolation=none
  tests/demo-web-ui.test.ts` passed **6/6**, covering initial/pending/failed
  states, result selection, mode reset and live-report import. `npm run
  typecheck`, `npm run lint`, `node --check src/web/app.js` and
  `git diff --check` passed. Lint retains one pre-existing historical probe info.
- **Mode/limits/next:** local DOM-handler and synthetic fixture verification,
  without cloud/model/history calls or rendered-browser layout proof. No blocker
  for this slice; restart the viewer to reload cached assets. Combined live and
  release gates remain open.

### Remove optional owner-evidence input — 2026-10-26

- **Gate/owner:** Days 3–4 web usability, Milad. Removed the optional owner
  statement form, its submission/reset handlers and unused textarea styles.
  Saved reports still validate, display and export existing `owner_evidence`;
  investigation policy and safety checks are unchanged. Usage, product context,
  component documentation and decision rationale are aligned.
- **Executed proof:** `node --import tsx --test --test-isolation=none
  tests/demo-web-ui.test.ts tests/demo-web.test.ts tests/demo-web-jobs.test.ts
  tests/evidence-diagnostics.test.ts` passed **19/19** with loopback access.
  Coverage includes mode switches, validation/rejected starts, request omission
  of owner statements, saved-report round-trip and exclusion from planning,
  clearance, memory and history. `npm run typecheck`, `npm run lint`,
  `npx --no-install biome format src/web/app.js src/web/style.css
  tests/demo-web-ui.test.ts`, `node --check src/web/app.js` and
  `git diff --check` passed. Lint retains one pre-existing probe style info.
- **Mode/limits/next:** local fixtures and DOM-handler verification only; no AWS,
  paid-model or remote Zetaris calls. The sandbox initially blocked four HTTP
  fixtures with `listen EPERM`; the loopback-enabled rerun passed. Restart the
  viewer to reload cached assets. Existing live/release gates remain open.

### Preview-only Demo across all tabs — 2026-10-26

- **Gate/owner:** Days 3–4 demo usability, Milad. User clarified Demo is
  preview-only. The earlier visibility-only split left shared live controls and
  service-backed demonstrations reachable. All three tabs now have explicit
  Demo/Live content. Demo has generated synthetic previews and labeled learning/
  follow-through illustrations; no run, upload, owner-input, model or write
  controls. Live owns AWS investigation and attributed decision recording.
  Live Learn displays report memory status and explicitly states that live H-MEM
  recall/storage are not enabled in this browser workflow.
- **Verified:** `node --import tsx --test --test-isolation=none
  tests/demo-web-ui.test.ts tests/demo-web.test.ts tests/demo-web-jobs.test.ts`
  passed **11/11** with loopback access. Three shipped-HTML/DOM tests cover every
  tab, ancestor visibility, direct handler rejection, live opt-in, mismatched
  imports, preview failure/retry and late responses, and resumed/failed jobs.
  Jobs retain validated source mode before results exist. `npm run typecheck`,
  `npm run lint`, scoped Biome format, `node --check src/web/app.js` and
  `git diff --check` passed; existing CSS specificity warning and probe style
  info remain. Initial sandbox run hit four local `listen EPERM` blockers.
- **Mode/limits/next:** synthetic/scripted and local HTTP fixtures only; no paid
  inference, AWS access or remote Zetaris operations. DOM tests do not prove
  rendered layout; browser inspection remains unavailable in this session.
  Restart the web server to reload its cached assets. The earlier mixed-mode
  browser receipt below is superseded; live integration/release gates stay open.

### Web startup without preview investigations — 2026-10-26

- **Gate/owner:** Days 3–4 web usability, Milad. Startup now serves the UI
  without generating reports or fetching previews. Explicit selection loads only
  that synthetic scenario, sharing pending requests and caching successful
  reports until restart. Preview shortcuts use the same loader; loading/error
  feedback and late responses cannot overwrite a different scenario or Live mode.
- **Executed proof:** a real `npm start -- --no-open` smoke served HTTP **200**
  in **0.159 seconds** from process launch; selecting B returned its correctly
  rejected synthetic report in **0.022 seconds**. The local combined command
  `node --import tsx --test --test-isolation=none tests/demo-web.test.ts
  tests/demo-web-jobs.test.ts tests/demo-web-ui.test.ts` passed **12/12** at
  execution time, including fast startup, scenario allowlisting, shared requests,
  cached reports, late-response isolation and preview failure/retry handling.
  `npm run typecheck`, `npm run lint`, scoped Biome formatting, `node --check
  src/web/app.js` and `git diff --check` passed. Existing unrelated lint warning
  and style information remain.
- **Mode/limits/next:** loopback HTTP fixtures, synthetic/scripted reports and
  DOM-handler checks only; no external-service calls or rendered-browser proof.
  Missing-evidence preview retries remain intact and can delay that selected
  preview, never startup. Concurrent Demo/Live work preserved. Combined live and
  release gates remain open.

### Shared web startup command — 2026-10-26

- **Gate/owner:** Days 3–4 web entry point and release documentation, Milad.
  Replaced `demo:web` with `start` in `package.json`; current README, HOW,
  follow-through instructions and runtime usage now use `npm start`. Internal
  filenames and historical command receipts remain unchanged.
- **Executed proof:** `npm start -- --no-open` served HTTP **200**, with Demo
  and Live present in the page; `npm start -- --invalid` exited **1** with the
  updated usage. `node --import tsx --test --test-isolation=none
  tests/demo-web.test.ts tests/demo-web-jobs.test.ts` passed **8/8** with loopback
  access after four sandbox `listen EPERM` failures. `npm run typecheck` and
  `npm run lint` passed. Existing lint CSS specificity warning and
  historical-probe style info remain. `git diff --check` passed.
- **Mode/limits:** local startup and synthetic previews only; no live AWS,
  paid inference or remote history access. Initial sandbox listening failed;
  the startup smoke passed with loopback access. Startup policy and service
  acknowledgments are unchanged. Combined live and release gates remain open.

### Practical submission README — 2026-10-26

- **Gate/owner:** release documentation, Milad. Reworked the root README using
  the user's eleven-section template: actual role authority, one decision/feedback
  diagram, sponsor contributions, setup, CLI input/output, sample scenarios,
  failure handling, licensing, limitations and starter attribution. Reconciled
  `AGENTS.md` and recorded the superseded ten-line policy in `memory.md`.
- **Executed proof:** `npm run test:scenarios` passed **84/84**. Inline Python
  assertions verified all eleven numbered sections and **18 local links/anchors**.
  Fresh `npm run --silent investigate` runs with `--evidence mock --planner
  scripted --account demo --region us-east-1 --scenario A|B|C|missing|mixed --json`
  (three candidates for mixed, historical stores explicitly disabled) matched
  every documented verdict and exit: A/B/C/mixed **0**, missing **2**. A fresh
  text B run matched every abridged README output line in order.
- **Mode/limits:** synthetic evidence and scripted planning; local memory and
  history fixtures in the scenario suite. No live AWS, paid model, remote
  Zetaris, new installation or clean-clone validation. Concurrent UI and other
  documentation edits preserved. Whitespace checked with `git diff --check`.
- **Remaining/next:** final documentation review and the existing independent
  reproduction, live-evidence, permission, Cursor attribution and submission
  artifact gates remain open. README policy reconciliation is complete; this
  receipt does not close the combined release checklist item.

### Eight-slide Markdown deck — 2026-10-26

- **Gate/owner:** release presentation, Milad. [Deck](../slides.md) covers all
  eight required topics with horizontal slide separators, an editable Mermaid
  workflow, actual CLI output, a synthetic evidence table and sourced speaker
  notes. [Demo preparation](DEMO.md) links to the deck as canonical slide content.
- **Verification:** the documented offline B command in slide 7 exited **0**,
  rejecting the proposed window with explicit mock/scripted labels, unknown
  savings and human approval. Histories were disabled; no service calls.
  Local Python assertions passed: eight ordered slides, balanced speaker-note
  blocks and code fences, local source links/anchors and exact quoted scenario,
  evaluation and memory-comparison figures. Final JSONL coverage was checked
  against the recorded B trace. `git diff --check` passed.
- **Limits/next:** Markdown content only; no slide renderer/export, browser
  screenshot, video recording, live-service probe or submission performed.
  The CLI excerpt and recorded NVIDIA evidence panel are explicitly separate
  synthetic runs. Cursor attribution, final exported presentation/video review
  and existing live-evidence/portal gates remain open. Concurrent UI and related
  documentation changes were preserved.

### Browser Demo / Live separation — 2026-10-26

- **Gate/owner:** Days 3–4 demo presentation, Milad. A top-center Mode select
  defaults to Demo. Scenario/preview selection, Learn and fictional follow-through
  appear only in Demo; Live binds investigations to read-only AWS and exposes
  engineer decision recording. Mode changes clear selected results and opt-ins;
  matching reports/last results require explicit selection. No service calls are
  triggered by changing mode. HOW owns usage; memory records the rationale.
- **Verification:** `node --import tsx --test --test-isolation=none
  tests/demo-web.test.ts tests/demo-web-jobs.test.ts` passed **8/8** after enabling
  loopback listening (initial sandbox attempt: four `listen EPERM` blockers).
  `npm run typecheck`, `npm run lint`, scoped Biome format, `node --check
  src/web/app.js` and `git diff --check` passed; existing CSS specificity warning
  and historical-probe style info remain. A temporary Node VM/DOM harness
  (`node /tmp/cci-mode-check.mjs`) exercised actual app handlers: startup,
  demo/mock versus live/AWS requests, missing scenario/service acknowledgment,
  visibility, opt-in/result clearing, active-run lock and return to Demo.
- **Mode/limits/next:** synthetic/scripted and local HTTP fixtures only; no live
  AWS, paid model or remote Zetaris access. No available browser (`iab` unavailable)
  blocks rendered desktop/mobile inspection; perform that visual check before
  the recording. This change does not close combined live or submission gates.

### Concise CLI and integrated result verification — 2026-10-26

- **Gate/owner:** Days 3–4 CLI explainability, Milad. Default text now leads
  with scoped verdicts, reasons, decisive source statuses, next actions and
  savings/unknown. It retains observation scope, sample gaps, stop reason,
  source mode and human approval. `--verbose` preserves full evidence,
  citations, checklists, history, trace and budgets. JSON/JSONL schemas,
  programmatic rendering defaults, safety policy and exit codes are unchanged.
  [CLI reference](CLI_GUIDE.md#run) owns commands and output-mode details.
- **CLI proof:** actual `npm run --silent investigate` mock/scripted B runs
  produced **16 lines / 739 characters** by default and **89 lines / 10,598
  characters** with `--verbose`. No npm banner or stderr; mock provenance and
  scoped rejection remain explicit. The focused CLI tests also exercise A/C,
  missing sources, all three mixed verdicts, empty inventory, failed discovery
  and conflicting/duplicate flags before retrieval.
- **Fresh live proof:** in-process `cli.ts` invocation with `AWS_PROFILE=cci`,
  `AWS_REGION=eu-west-3`, `AWS_ENABLE_COST_EXPLORER=true`, TLS verification,
  authenticated STS account, `--evidence aws --planner scripted
  --lookback-days 7 --json`, and histories disabled. Rendered both text views
  from that same validated report: **20 default lines / 90 verbose lines**.
  Inventory `ok`; billing/metrics `partial`; **367/2016** points per series at
  **300 seconds**. Verdict `needs_verification`, savings `null`, stop
  `metrics_evidence_incomplete`, exit **2**. SSM/ELBv2 remain unreached by this
  integrated run. Sandbox STS failed `EAI_AGAIN`; authorized network execution
  passed. No model/history calls, infrastructure writes or retained raw report.
- **Verification:** `node --import tsx --test --test-isolation=none
  tests/report.test.ts tests/trace-jsonl.test.ts tests/aws-cli.test.ts
  tests/evidence-diagnostics.test.ts tests/provider-error.test.ts` passed
  **27/27**. `npm run typecheck`, `npm run typecheck:aws`, `npm run lint`, scoped
  Biome format and `git diff --check` passed. Lint retains the existing CSS
  specificity warning and historical-probe style info. No full-suite run.
- **Limits/next:** presentation acceptance is verified; combined live safety and
  numeric savings gates stay open. Collect sufficient real telemetry and the
  verified operational/pricing authority described below; use explicit labeled
  mocks for complete conditional-recommendation demonstrations.

### Five-minute AWS investigations and account setup — 2026-10-26

- **Gate/owner:** Days 3–4 live evidence, Milad; operational source ownership
  remains Zayan/account owner. The investigation provider now defaults to
  `periodSeconds: 300`, including normal CLI/standalone provider calls. Explicit
  overrides and the low-level collector's hourly default remain compatible.
- **Account/demo decision:** user confirms the live instance has only two days
  of history. Reuse explicit `--evidence mock --lookback-days 7` for complete
  synthetic flows; no backdated AWS data, filled gaps or silent fallback.
  [AWS setup](AWS_SETUP.md) is the canonical access/permissions and account
  assumptions guide, linked from HOW/tools; previous HOW anchors still resolve.
  Existing SSM/ELBv2 adapters are reused, not replaced with invented authority.
- **Local proof:** `node --import tsx --test --test-isolation=none
  tests/aws-cli.test.ts` passed **3/3**; the SDK-send regression exercises the
  actual CLI provider factory, complete five-minute retrieval, two-day gaps in a
  seven-day request and explicit hourly compatibility without network access.
  The same runner with `tests/aws-agent.test.ts`, `tests/aws-operational.test.ts`,
  `tests/broader-scenarios.test.ts`, `tests/recommendation-boundary.test.ts`
  passed **82/82**, including missing/expired authority, native conflicts,
  unsupported pricing and the added two-day policy boundary. No full suite run.
- **CLI proof:** ran A/B/C/missing with `node --import tsx cli.ts investigate
  --evidence mock --planner scripted --account demo --region us-east-1
  --lookback-days 7 --scenario SCENARIO --json`, clearing history configuration.
  A returned conditional recommendation and **synthetic USD 72.50** for its
  November estimate; B/C rejected and missing deferred. Exits **0/0/0/2**;
  no AWS, model or remote history calls in these four runs.
- **Live proof:** `AWS_PROFILE=cci AWS_REGION=eu-west-3
  AWS_ENABLE_COST_EXPLORER=true NODE_TLS_REJECT_UNAUTHORIZED=1 npm run integration:cloud`
  passed **6/6** including the parent. All five direct tools are accessible;
  inventory is `ok`, billing/metrics/SSM/ELBv2 remain `partial`. The sandbox
  attempt failed `NETWORK_UNAVAILABLE` before inventory; the authorized network
  retry passed. [Sanitized receipt](history/aws-investigation-2026-10-26.json).
- **Integrated live CLI:** an in-process `cli.ts` invocation used the authenticated
  account from STS, the same profile/region, `--evidence aws --planner scripted
  --lookback-days 7 --json` and disabled histories. It requested 300-second
  samples and returned **367/2016** points for each of four metric series,
  from Oct 24 17:25 through Oct 25 23:55 UTC. Result: exit **2**, partial,
  `metrics_evidence_incomplete`, `needs_verification`, savings `null`.
  Operations/dependencies were not reached in that run; separate access proof
  above is not relabeled as integrated safety proof. No model/history calls or
  infrastructure writes; raw account/resource reports were not retained.
- **Other checks:** both TypeScript checks, `npm run lint`, scoped Biome format,
  local documentation links/anchors and `git diff --check` passed. Lint retains
  pre-existing CSS specificity warning/history-probe style info. An optional
  Biome `check` also flags pre-existing import ordering; canonical lint passes.
- **Limits/next:** no combined live safety/savings gate advanced. The live adapter
  still lacks verified prospective pricing/commitment inputs, so live numeric
  savings stay unknown. Native reads disclose jobs outside SSM, dependencies
  outside ELBv2 and owner/calendar/recovery clearance as unknown. Next: collect
  sufficient real history and identify verified workload/pricing authority;
  continue using labeled mocks for complete positive/negative demo flows.

### README sponsor explanation — 2026-10-26

- **Gate/owner:** submission documentation, Milad. Added the requested collapsed
  sponsor section covering actual roles, combined value and a link to canonical
  receipts. Cursor activity remains unverified; no integration gate advanced.
- **Verification:** local Python assertions confirmed all four explanation
  labels and the linked sponsor heading; `git diff --check` passed. Documentation
  only; no runtime tests or service calls. Next: team supplies factual Cursor
  development attribution for the remaining submission claim.

### PR #1 documentation review — 2026-10-26

- **Gate/owner:** Task 2 review, Zayan. Restored the upstream AWS credential-chain
  explanation verbatim, retained the added HOW authentication link and removed
  formatting-only churn. All upstream documentation lines remain in order;
  SSM/ELBv2 setup and capabilities are unchanged. No implementation or test edits.
- **Verification:** the focused scenario/export command recorded below passed
  **75/75**; both TypeScript checks, `biome lint .` (167 files) and
  `git diff --check` passed. Full suite not repeated for this documentation-only
  fix. Tests use synthetic evidence; no live service calls.
- **Next action:** push the review fix on `task2-ec2-scenarios` for Milad to review
  in PR #1. Both safety stashes remain retained; prior Windows suite failures
  remain documented below.

### Task 2 scenario integration on `4fa83ff` — 2026-10-25

- **Gate/owner/mode:** six reproducible EC2 scenarios, Zayan; synthetic current
  evidence and mocked Zetaris HTTP transport. Existing engine, policy, contracts,
  planner, history schema and native SSM/ELBv2 implementation remain unchanged.
  Upstream receipts below retain their original status and provenance.
- **Coverage:** six cases / seven variants, including separate unavailable
  operations/dependency cases and both historical verdict reversals. All use
  14 complete UTC days; policy still enforces only a seven-day minimum.
  [Runbook and test mapping](SCENARIOS.md) explain the scenario identifiers.
- **Executed verification:** `node --import tsx --test --test-isolation=none tests/*.test.ts`
  reported **271 passed, 3 failed, 1 skipped (275 total)** on Windows.
  All three failures are in unchanged upstream `tests/model-request-timing.test.ts`:
  its absolute Windows preload path is rejected with
  `ERR_UNSUPPORTED_ESM_URL_SCHEME`. The suite is **not fully passing** here;
  this does not supersede upstream platform-specific receipts.
- **Task 2 proof:** the same test runner with `tests/investigation.test.ts`,
  `tests/broader-scenarios.test.ts`, `tests/warm.test.ts` and
  `tests/scenario-export.test.ts` passed **75/75**. The `demo:scenarios`
  underlying command passed **7/7**. `node --import tsx scripts/export-scenarios.ts`
  regenerated six valid JSONL rows / seven variants; replay, retained-fact drift,
  actual reproduction-command execution and invalid-export rejection passed.
- **Static checks:** both TypeScript projects passed (`tsc -p tsconfig.investigation.json --noEmit`
  and `tsc -p tsconfig.aws.json`); `biome lint .` passed across 167 files.
  Scoped formatting and `git diff --check` passed after reconciliation.
- **Environment:** installed the unchanged upstream lockfile with
  `pnpm dlx npm@11 ci --no-audit --no-fund` because npm is absent from PATH.
  An old project demo server initially locked esbuild; after stopping that specific
  process the install succeeded. No global install or dependency-file change.
  Two existing Task 2 temporary-directory portability fixes remain included.
- **Limits/next action:** synthetic results do not prove live AWS coverage or model
  reliability. Native operations remain incomplete; no guest cron inspection is
  claimed. No live model/AWS calls were made for this integration. Submit the
  Task 2 branch for review; upstream request-timing Windows portability remains
  a separate follow-up. Both Task 2 safety stashes remain retained locally.

### Readable timestamped JSONL and measured confidence — 2026-10-26

- **Gate/owner:** Days 3–4 trace explanation, Milad. User selected measured
  evidence coverage as fractional confidence. The runner records actual UTC step
  timestamps; `--trace-jsonl` exports role/action/input/rationale/output/status,
  numeric coverage, categorical support, retry counts and citations. Existing full
  report semantics remain compatible; historical timestamps/scores stay unknown.
- **Definition:** complete authoritative gap-free evidence checks already retrieved
  for this instance / five required checks. Failed/future evidence never counts;
  candidate checks never transfer to another instance. The score does not control
  verdicts or claim calibrated safety probability. User-approved account/region
  match the demo UI; resources and AWS observations remain synthetic.
- **Real execution:** reran `scripts/capture-trace-examples.ts` into
  [readable capture receipts](evaluation/trace-readable-2026-10-26/summary.json).
  Three complete investigations, 22 real model attempts, 54 trace events.
  B recovered from two actual HTTP 500s and three injected tool failures; C
  recovered from a timeout and two HTTP 500s. All failures remain in the reports
  and JSONL. TLS verified, no AWS/history requests. Older receipts unchanged.
- **Verification:** `npm run typecheck`, `npm run typecheck:aws`, scoped Biome
  and `git diff --check` passed. Focused trace/JSONL/planner/report suites passed
  **44/44**; diagnostic/warm compatibility suites passed **23/23**. Actual CLI
  JSONL, timestamp ordering/bounds, unknown legacy metadata, partial evidence,
  cross-instance isolation and mutually exclusive output flags are covered.
  All three documented JSONL blocks match their saved exports and validated
  report projections exactly. The pre-existing report-test stdout capture race
  reproduced during the first combined run (38/39), then passed after flushing
  prior reporter output before capture; no full-suite run is claimed.
- **Limits/next:** designed synthetic scenarios with a live model, not a production
  reliability estimate or live AWS proof. No blocker for this slice; combined
  sponsor/live-AWS release gates remain open.

### Three real-model trace examples — 2026-10-26

- **Gate/owner:** Days 3–4 explainability proof, Milad. [Trace examples](TRACE_EXAMPLE.md)
  now provide three native HTML disclosures with complete captured JSONL traces:
  staging API conditional recommendation, finance batch contradiction with recovery,
  and orders worker continuous-dependency contradiction. Fictional AWS-shaped
  identities are supplied before planning; evidence mode remains explicitly mock.
- **Execution:** `node --import ./scripts/model-request-timing.mjs --import tsx
  scripts/capture-trace-examples.ts docs/evaluation/trace-model-2026-10-26-network`
  completed all three using `nvidia/nemotron-3.5-super-vl-120b-a12b`: 18 real model attempts,
  including one 60-second planner timeout followed by recovery. Scenario B also
  traces three injected read-only tool exceptions and fourth-call success.
  [Summary and immutable reports](evaluation/trace-model-2026-10-26-network/summary.json)
  retain actual budgets, reasons, timestamps and verdicts.
- **Verification:** `npm run typecheck`, scoped Biome checks and
  `node --import tsx --test --test-isolation=none tests/trace-retry.test.ts`
  passed (14/14). Report/citation validation, all three exact full-trace JSONL
  comparisons, HTML disclosure structure and whitespace checks passed.
- **Limits/next:** synthetic AWS only, TLS verified, no history or infrastructure
  calls. The first sandboxed attempt failed all three at model transport and is
  [preserved separately](evaluation/trace-model-2026-10-26/summary.json); network-enabled
  runs are not substituted into that denominator. This is illustrative proof,
  not a production reliability measurement. Combined live-AWS/sponsor gates remain open.

### Fresh trace example capture — 2026-10-26

- **Gate/owner:** Days 3–4 trace transparency, Milad. Reran the injected-outage
  command in [the trace example](TRACE_EXAMPLE.md); saved the new immutable
  [B report](evaluation/trace-metadata-2026-10-26/B-retry.json), leaving the
  Oct 25 receipt intact. Synthetic evidence, scripted planner, no external calls.
- **Proof:** actual operations attempts carry retry counts 0/1/2/3, recovering
  on the fourth call before rejecting the window on fresh conflicting evidence.
  Five planner calls, seven evidence attempts, 16,054ms including real backoff.
  Report validation and exact JSONL-to-report projection checks passed.
- **Limits/next:** this refresh proves local trace capture only; live-evidence
  and combined sponsor/release gates remain open. No blocker for this slice.

### Per-step trace metadata and bounded evidence recovery — 2026-10-25

- **Gate/owner:** Days 3–4 agent reliability and trace transparency, Milad. Every
  new trace entry now carries the run-correlating `trace_id`, evidence-support
  `confidence` and actual zero-based `retry_count`. The ID is allocated at run
  start and flows into progress, JSON, CLI text and the web trace. Confidence is
  categorical evidence support, not invented numerical certainty or authority.
- **Recovery:** the executor repeats a failed read-only evidence action up to
  three times after its initial call, with 2s/4s/8s positive-jitter backoff. Every
  attempt is traced and counted: eight discovery calls maximum, twelve per
  candidate. Shared deadlines/reserve and shorter custom limits still apply.
  Malformed/scoped-invalid output and cancellation stay terminal; partial and
  no-match are not retried. Recovery does not replay planner decisions or
  historical writes. Failed attempts stay visible; only the final observation
  enters the evidence registry. This supersedes the earlier no-tool-retry rule.
- **Captured proof:** [trace example](TRACE_EXAMPLE.md) projects exact steps from
  [a new captured B report](evaluation/trace-metadata-2026-10-25/B-retry.json):
  three injected tool exceptions, fourth-call recovery, then a cited contradiction;
  five planner calls, seven evidence attempts, 15,395ms with real backoff waits.
  Its source mode and planner are synthetic/scripted. Older NVIDIA receipts are
  unchanged; legacy counters remain unknown when loaded.
- **Verification:** `node --import tsx --test --test-isolation=none
  tests/trace-retry.test.ts tests/planner-retry.test.ts
  tests/planner-diagnostics.test.ts tests/warm-learning.test.ts` passed **55/55**
  on the final files. `npm run typecheck`, `npm run typecheck:aws`, scoped Biome
  lint/format, JS syntax and whitespace checks passed.
  `node --import tsx /tmp/cci-trace-doc-check.mjs` verified the exact JSONL
  projection and unchanged legacy report loading. The initial full suite was
  **320/323**: a reporter/stdout capture race and two fixtures whose trace
  confidence no longer matched their mutated evidence. The full rerun was
  **324/325**, having loaded the warm-memory fixture before its correction.
  That corrected fixture passes in the final **55/55** focused run; AWS CLI
  capture also passed **2/2** separately. No subsequent full-suite run is claimed.
- **Browser:** `node --import tsx /tmp/cci-trace-browser.mjs` passed actual report
  upload → validation API → full-trace rendering, then browser → HTTP → scripted
  worker → report/progress. Metadata tooltips passed keyboard focus, click and
  Escape checks. Inspected the 390px screenshot; no horizontal overflow or page
  errors. Heartbeats remain separate from execution history.
- **Limits/next:** local fixtures/synthetic services only; no paid inference,
  live AWS or remote history requests. No dependency added, no infrastructure
  writes, commit or push. Combined sponsor/live-evidence/release gates stay open.

### Follow-through rejected-start controls — 2026-10-25

- **Gate/owner:** Days 3–4 demo usability, Milad. Missing service acknowledgment
  previously opened the progress panel with a default-visible Stop button despite
  having no job; Stop consequently returned without making a request. Validation
  now uses the existing toast and focuses the required acknowledgment. Idle state,
  pending submission and server-rejected starts hide active-job controls; empty
  event panels stay hidden. Confirmed Stop requests show pending feedback.
- **Proof:** `node --import tsx /tmp/cci-followup-state-browser.mjs` reproduced
  the visible ghost Stop before the patch, then passed acknowledgment/no-request,
  rejected-start, empty-events and confirmed-run cancellation assertions against
  the real page with intercepted local job responses. Focused
  `node --import tsx --test --test-isolation=none tests/demo-web.test.ts
  tests/demo-web-jobs.test.ts` passed **8/8**, including actual worker cancellation.
  JS syntax, scoped Biome lint/format and `git diff --check` passed.
- **Mode/limits/next:** local browser/HTTP fixtures only; no real Zetaris writes
  or other external calls. Prior planner-retry work is preserved. No blocker for
  this slice; refresh the page. Combined integration/release gates stay open.

### Planner retry recovery and responsive progress — 2026-10-25

- **Gate/owner:** Days 3–4 model reliability and demo usability, Milad. User
  requested recovery after `model_http_500` rather than immediate termination.
  The runner now permits two transient retries with 2s/4s exponential backoff,
  positive jitter and longer valid `Retry-After` waits. Every attempt consumes
  the existing call caps; all waits share the deadline/finalization reserve.
  Permanent errors, invalid output and cancellation remain terminal. Failures
  remain in the trace even after recovery; evaluation gates are not weakened.
- **UI:** trusted active-stage text and elapsed/remaining wait time update every
  two seconds during planner, tool, history, pacing and backoff waits. The worker
  sends heartbeats as current activity separately from execution events. Polling
  preserves unchanged event DOM and avoids repeated identical live announcements.
  No tool or historical-write retry is introduced.
- **Verification:** `npm test` passed **311/311**; `npm run typecheck`,
  `node --check src/web/app.js`, scoped Biome lint/format and
  `git diff --check` passed. Failure tests cover recovery after metrics without
  tool replay, exponential timing/jitter, permanent errors, timeout aborts,
  `Retry-After` seconds/date parsing, budgets and heartbeat cleanup. Local worker
  tests verify three attempts on persistent 500 and no new request after Stop
  during backoff. Initial full runs exposed an outdated progress assertion and
  native 5ms timer flakiness; both tests were corrected before the passing run.
- **Browser/mode:** `node --import tsx /tmp/cci-planner-retry-browser.mjs`
  exercised the real page → HTTP job → worker → fake model server → report:
  stalled planner progress, visible retry wait, recovery to the B rejection,
  retained retry event, heartbeat exclusion from history and no page errors.
  Desktop and 390px mobile screenshots inspected; mobile had no horizontal
  overflow. Keyboard focus and an open status tooltip survived polling during
  the slow call. The first mobile harness missed a brief exact elapsed-time
  window; a longer synthetic stall and elapsed-range assertion passed.
  These are synthetic/local integration checks;
  no paid inference, live AWS or remote history calls were made.
- **Limits/next:** retrying generation can incur usage; aborting our wait does
  not guarantee remote generation stopped. No production dependency added.
  No blocker for this slice; restart the demo server and refresh the page.
  Combined live-evidence and release gates remain open.

### Compact execution-status tooltips — 2026-10-25

- **Gate/owner:** Days 3–4 demo usability, Milad. Per user correction,
  execution events show icons only; the existing accessible tooltip exposes
  status text on hover, focus or click. Amber partial and neutral no-match
  remain distinct from green complete and red unavailable/failed. This
  supersedes the inline-label presentation recorded below.
- **Verification:** `node /tmp/cci-icon-tooltip-check.mjs` passed in Chromium
  against the actual renderer/helper source: all five symbols, accessible
  labels, hover/click/focus, Escape/blur dismissal and amber partial.
  `node --import tsx --test --test-isolation=none tests/demo-web.test.ts
  tests/demo-web-jobs.test.ts` passed **7/7**. Initial sandbox checks blocked
  Chromium sockets and three localhost tests; permitted reruns passed.
  `node --check src/web/app.js`, scoped Biome lint/format and
  `git diff --check` passed.
- **Mode/limits/next:** local synthetic browser fixture and local HTTP tests;
  no external services called, no blocker for this slice. Refresh the demo
  to use it; combined live-evidence and release gates remain open.

### Evidence diagnostics and supporting owner statements — 2026-10-25

- **Gate/owner:** Days 3–4 useful live-evidence reporting, Milad; implemented and
  verified with injected AWS transports, synthetic evidence and a local browser.
  Optional inventory metadata is informational and remains visible per instance;
  it no longer degrades resource enumeration or cascades into billing coverage.
  Truncation and actual source failures retain their existing coverage gates.
- **Report behavior:** named metric fields retain expected/returned sample counts,
  interval and UTC sample bounds, including unavailable CPU summaries. A metrics
  prerequisite stop is explicitly `metrics_evidence_incomplete`, explaining why
  targeted jobs/dependency checks were not reached. Older reports still validate.
- **Owner evidence:** user selected supporting context only. The web form captures
  a scoped, attributed statement with reference and applicable dates; worker and
  report validation preserve it for display/export. It cannot enter model prompts,
  satisfy safety gates, authorize shutdown, or flow into H-MEM/Zetaris records.
  Scope changes require renewed form opt-in. No production dependency was added.
- **Verification:** `npm test` initially passed 285/291 with six sandbox-only
  socket/child-process `EPERM` failures; the permitted rerun passed 291/291.
  Final focused runner/collector/adapter/report/web suites passed 108/108 before
  the additional missing-series regression. Both TypeScript checks, scoped Biome
  lint, JS syntax and `git diff --check` passed. Final `npm test`: **292/292**,
  including missing-series diagnostics and explicit owner-context exclusion from
  H-MEM summaries and Zetaris history records.
  A local Chromium harness exercised form → HTTP → isolated worker → report,
  script-like text rendered inertly, JSON download/reload, coverage/metadata/stop
  messages, and scope-change reset. Desktop and 390px mobile screenshots were
  inspected; no horizontal overflow or page errors were observed.
- **Limits/next action:** no fresh AWS, model or remote history calls; these checks
  do not establish live coverage or operational clearance. Restart the web server
  and rerun the live investigation to populate new diagnostics; old reports are
  not retroactively enriched. Account owner/Zayan still owns adequate telemetry
  and authoritative operational integrations. Permanent retirement remains outside
  the scheduling verdict. Combined live-evidence/release gates stay open.

### Execution-status correction and passing cloud recheck — 2026-10-25

- **Gate/owner:** useful live diagnostics, Milad. The UI previously rendered
  `partial`, `no_match`, `unavailable` and `error` as identical red crosses,
  making a usable partial inventory look like an ignored tool failure. Execution
  events now show visible labels: amber partial, neutral no-match, green complete,
  red unavailable/failed. Copied event numbers retain punctuation and spacing.
  Required discovery failures still stop immediately; no runner policy changed.
- **UI proof:** a local Chromium fixture executing the actual `renderEvents`
  source reproduced the misleading display before the patch and passed the
  distinct-status DOM assertions afterward; the rendered screenshot was inspected.
  Focused investigation/AWS adapter/CLI/web/job tests passed **69/69** with local
  fixture permissions. JS syntax, scoped Biome lint, CSS formatting and
  `git diff --check` passed. No new model or history call was needed.
- **Live cloud recheck:** `AWS_PROFILE=cci AWS_REGION=eu-west-3
  AWS_ENABLE_COST_EXPLORER=true npm run integration:cloud` now passes **5/5** tool
  checks (Node reports **6/6** including the parent), exit **0**. Billing returned
  resource records/currency this time; assertions were not weakened and no cloud
  test or collector changes were needed. All five observations remain `partial`:
  missing inventory metadata, incomplete billing/metric coverage and unknown
  external operational/owner clearance remain explicit.
- **Configuration:** this worker's inherited shell selects `rika-deploy` /
  `eu-central-1` with billing disabled, so it needs the explicit selectors above
  for the CCI scope. Shell precedence and credentials were preserved. The earlier
  failed billing measurements remain in the receipt; the successful recheck does
  not establish complete coverage, savings or scheduling safety.

### Required discovery failure and isolated live tests — 2026-10-25

- **Gate/owner:** Days 3–4 useful live-evidence failure behavior, Milad;
  attributable billing data and complete operational coverage remain Zayan/team
  and account-owner blockers. Inventory must precede billing. Unusable required
  discovery now stops the runner immediately with `required_tool_failed:<tool>`,
  a named diagnostic and exit 1, without another planner/tool call. Usable partial
  metadata remains usable; authenticated empty inventory finishes without billing.
  UI failure status and discovery gaps expose the failure explicitly.
- **Commands:** `npm run integration:modal` isolates the existing one-call model
  suite; `npm run integration:cloud` runs real bounded AWS collector/adapter checks.
  `test:integration` remains a model-only compatibility alias. Neither live suite
  runs under `npm test`; billing requires `AWS_ENABLE_COST_EXPLORER=true`.
- **Offline proof:** failure-path regressions reproduced the previous continuation
  and partial-status behavior before implementation. The first full sandbox run
  hit six loopback/child-process `EPERM` failures and one model-test expectation
  needing the new inventory-first order. After updating that expectation and
  adding the negative ordering test, permitted `npm test` passed **281/281**.
  Billing timestamp regressions then reproduced the live parser defect; after its
  correction, final permitted `npm test` passed **287/287**. `npm run typecheck`,
  `npm run typecheck:aws`, scoped Biome lint/TypeScript formatting,
  `node --check src/web/app.js` and `git diff --check` passed.
- **Live proof:** `AWS_PROFILE=cci AWS_REGION=eu-west-3
  AWS_ENABLE_COST_EXPLORER=true npm run integration:cloud` used genuine SDK reads,
  TLS verification and no model/history calls. First run: **4/5** tool checks
  passed; billing failed with `INVALID_INPUT`. A single bounded diagnostic found
  14 returned billing periods used timestamps rather than date-only strings.
  The collector now normalizes both documented forms and rejects invalid dates,
  shifted midnights and non-daily/out-of-scope source periods. Final cloud rerun:
  **4/5** tool checks passed, suite exit **1**; billing is correctly `unavailable`
  because no scoped resource billing records/currency were returned.
  [Sanitized receipt](history/aws-integration-2026-10-25.json).
- **Limits/next action:** inventory metadata and metric-history coverage remain
  partial; successful empty SSM/ELBv2 reads do not prove workload safety. Account
  owner/Zayan verifies populated resource billing before rerunning the cloud suite
  and integrated investigation. No IAM, secrets, AWS features or infrastructure
  changed. No paid model call, rendered-browser proof or completed release gate
  is claimed by this task.

### Persistent billing denial diagnosis — 2026-10-25

- **Gate/owner/mode:** live attributable billing, Milad diagnoses / account owner
  provisions; genuine AWS calls. A bounded network-enabled Node SDK diagnostic
  explicitly selected `AWS_PROFILE=cci`, verified the expected IAM user with
  STS, and made **one** account-scoped `GetCostAndUsageWithResources` request
  for EC2 compute in the last complete UTC day. SDK attempts were one, with a
  shared 20-second identity/billing deadline and TLS verification enabled.
- **Result:** HTTP **400**, `AccessDeniedException`, exit **2**. Sanitized message
  indicators identify Cost Explorer not enabled and organization/member-account
  access; no missing identity-policy allow was reported. This does not enumerate
  effective IAM/SCP permissions. The initial sandbox attempt stopped at identity
  and made no billing query; network-enabled execution reached the service.
  [Sanitized receipt](history/aws-billing-access-2026-10-25.json).
- **Next action/blocker:** the account owner checks Cost Explorer enablement in
  the management account where applicable, linked-account access and daily EC2
  resource-level data preferences. Account setup and data preparation remain open;
  the agent made no IAM, feature-enablement, secret or infrastructure changes and
  did not repeat the billing query. No inference or history persistence ran.
  The existing application still collapses these AWS denials into `ACCESS_DENIED`;
  no product code changed in this diagnostic step. Receipt JSON parsing and
  `git diff --check` passed; product tests were not rerun for documentation only.

### Inventory denial diagnostics — 2026-10-25

- **Gate/owner/mode:** useful incomplete-run reporting, Milad; injected AWS
  transport and local fixtures only. The operator reported
  `list_ec2_instances/unavailable/ACCESS_DENIED`; this blocks discovery before
  shutdown safety is assessed. Safe local configuration inspection found a
  different inherited profile/region from the separately verified CCI scope;
  this is a recovery lead, not proof of the failed worker's identity.
- **Change:** trace and discovery gaps retain tool/status/coverage and bounded
  missing-field diagnostics. Inventory denial names server `AWS_PROFILE` and
  `ec2:DescribeInstances` checks. Incomplete empty reports open discovery gaps;
  the web view shows evidence codes directly and names tools in the full trace.
  Existing reports remain readable without regeneration. No permissions,
  credentials, scope defaults or recommendation gates changed.
- **Executed proof:** the denied-inventory regression first failed on the old
  generic trace. `node --import tsx --test --test-isolation=none
  tests/aws-agent.test.ts tests/investigation.test.ts tests/report.test.ts`
  then passed **57/57**, including denial/redaction and long diagnostic bounds.
  The same test command with `tests/demo-web.test.ts tests/demo-web-jobs.test.ts`
  passed **7/7** with local loopback access after sandbox `listen EPERM`.
  `npm run typecheck`, `node --check src/web/app.js`, scoped Biome lint,
  formatting for the three changed TypeScript files and `git diff --check`
  passed. Existing unrelated formatting differences in `src/web/app.js` remain.
- **Limits/next action:** no live AWS, paid inference or remote persistence;
  no rendered-browser proof. Restart the local server with the intended approved
  profile and choose the matching region in the browser. Resolve remaining
  billing, metric coverage and operational-authority gaps independently; this
  diagnostic fix does not establish live scheduling safety or close that gate.

### Live CloudWatch verification — 2026-10-25

- **Gate/owner/mode:** populated metrics, Milad; genuine read-only AWS calls using
  `cci` in `eu-west-3`. **Access and populated retrieval verified; historical
  coverage remains PARTIAL.** No product code, IAM settings or secrets changed.
- **Command:** `AWS_PROFILE=cci AWS_REGION=eu-west-3
  AWS_ENABLE_COST_EXPLORER=false NODE_TLS_REJECT_UNAUTHORIZED=1 node --import tsx
  docs/history/aws-cloudwatch-2026-10-25-probe.mjs`, network-enabled; exit **2**
  intentionally reports incomplete coverage. The probe discovers one running
  instance and calls the existing collector with a five-minute period, a shared
  60-second verification budget and the collector's existing tool/page bounds.
- **Result:** window **2026-10-11T00:00:00Z–2026-10-25T00:00:00Z** (exclusive end),
  CPU Average/Maximum and NetworkIn/Out each returned **79/4032** expected samples.
  All values are finite, the 79 paired CPU maxima are at least their averages,
  and live scope/provenance/window checks passed. Samples span Oct 24
  **17:25–23:55 UTC**. Missing earlier observations are not zero usage; the reason
  for the missing history was not established. Today's partial UTC day is excluded.
- **Agent-boundary proof:** the same retrieved collection, without another
  CloudWatch read, passed `createAwsEvidenceProvider`'s runtime validator as a
  live five-minute CPU summary, `partial`, non-authoritative/incomplete coverage,
  with a generated evidence ID. This is not a full investigation or safety verdict.
  [Sanitized receipt](history/aws-cloudwatch-2026-10-25.json) retains coverage
  metadata only; raw values and account/resource identifiers were not persisted.
- **Failed helper attempt retained:** the initial live retrieval succeeded, then
  the temporary helper redundantly called `validateObservation` without its
  required action/run arguments and exited **1/TypeError**. The corrected retained
  reproducer reuses the adapter's internal validation; its separate live repeat
  produced the result above. [Original attempt](history/aws-cloudwatch-2026-10-25-attempt1.json)
  remains in the record. Reproducer syntax, scoped lint and receipt assertions
  passed; no product tests were rerun because no product code changed.
- **Limits/next action:** zero billing queries, model calls, remote history writes
  or infrastructure mutations. Live CloudWatch access is no longer a blocker.
  Obtain adequate historical coverage (positive policy needs at least seven days
  with five-minute-or-finer data), verify explicitly opted-in resource-level
  billing and obtain authoritative workload/owner evidence. Preserve deferral and
  null savings wherever those requirements are unmet; combined live gate stays open.

### Dedicated CCI AWS profile and live reads — 2026-10-25

- **Gate/owner/mode:** AWS identity and populated inventory access, user provisions /
  Milad verifies; genuine read-only AWS calls. The user created a dedicated IAM
  user and local `cci` profile. STS verified an IAM user named `cci` (rather than
  the suggested `cci-readonly` name); region is `eu-west-3`, containing the user's
  `eu-west-3a` availability zone. No credentials, account IDs, ARNs, instance IDs
  or private endpoints were retained. Effective permissions were not enumerated.
- **Executed:** `AWS_PROFILE=cci AWS_REGION=eu-west-3
  NODE_TLS_REJECT_UNAUTHORIZED=1 node --import tsx src/aws-demo.ts --live --operations`.
  The first network-enabled run retrieved **1 instance**, inventory
  `partial/MISSING_METADATA`; ELBv2 completed with zero matching facts, while SSM
  returned `AWS_REQUEST_FAILED`. A scoped diagnostic identified HTTP **400**
  `ValidationException`: the requested page size **100** exceeded the service's
  allowed maximum **10**. The adapter now requests ten results and validates that
  page bound, preserving pagination, request limits and incomplete-coverage policy.
- **Verified retry:** the same command exited **0**: one retrieved instance;
  operations and dependencies each `partial`, zero facts, with only the expected
  broader-coverage and owner/calendar/recovery unknowns. Inventory permission
  denial is resolved for this profile and region. This proves populated inventory
  and successful empty native operational reads, not populated operational facts
  or positive scheduling safety. [Sanitized receipt](history/aws-cci-profile-2026-10-25.json).
- **Local proof:** `node --import tsx --test --test-isolation=none
  tests/aws-operational.test.ts tests/aws-agent.test.ts tests/aws-cli.test.ts`
  passed **43/43**, including request-size and oversized-response regressions.
  `npm run typecheck`, `npm run typecheck:aws`, scoped Biome lint/format and
  `git diff --check` passed. The broader `biome check` additionally reports
  pre-existing import-order assist findings in both touched source/test files;
  the imports are unchanged. Initial `npm run demo:aws` hit sandbox IPC `EPERM`;
  direct Node import avoided that wrapper, and network access was needed after
  the sandbox returned `NETWORK_UNAVAILABLE`.
- **Limits/next action:** no billing query, paid inference, remote history write,
  IAM modification by the agent, secret-file edit or infrastructure change.
  Keep selecting `AWS_PROFILE=cci AWS_REGION=eu-west-3` explicitly; inherited
  settings were not changed. Zayan/team verifies populated CloudWatch and
  explicitly opted-in billing, and supplies authoritative workload/owner sources;
  Milad verifies integrated reports. The combined live-evidence gate remains open.

### Native operational evidence collection — 2026-10-25

- **Gate/owner/mode:** direct operational integration, Zayan source boundary /
  Milad policy boundary; implemented using the two user-approved AWS SDK packages.
  Read-only SSM maintenance executions and ELBv2 instance registrations enter
  validated observations with explicit incomplete coverage. Shared overlap policy
  is reused by the runner and report validator. No positive eligibility threshold,
  clearance requirement or infrastructure permission was relaxed.
- **Verification:** `npm test` passed **267/267** (including 21 new native-source
  tests), using local loopback/subprocess permission. `npm run typecheck`,
  `npm run typecheck:aws`, scoped `npx biome lint` and `npx biome format` across
  all 12 changed source/test files, and `git diff --check` passed. Fixtures prove
  cited dated-conflict rejection, empty-read deferral, owner/draining actions,
  scope/malformed-data rejection, denial/redaction, partial retention, pagination/
  request bounds, midnight overlap and cancellation. The initial sandbox test
  attempt lacked local fixture permissions; the permitted full run passed.
- **Live attempt:** `NODE_TLS_REJECT_UNAUTHORIZED=1 node --import tsx
  src/aws-demo.ts --live --operations`, with intended project `.env` and the
  configured SDK profile. The sandbox first returned `NETWORK_UNAVAILABLE`;
  the network-enabled retry exited **1**, inventory `unavailable/ACCESS_DENIED`,
  zero retrieved instances. Operational probe explicitly reported **not_run**,
  `no_running_instance_retrieved`. Sanitized output only; no paid calls, remote
  writes, guessed resource IDs or infrastructure changes.
- **Blocker/next action:** populated live SSM/ELBv2 proof remains **OPEN**.
  The later [CCI profile verification](#dedicated-cci-aws-profile-and-live-reads--2026-10-25)
  resolves inventory access and proves successful empty SSM/ELBv2 reads in Paris.
  Verify populated operational facts with the permissions in
  [AWS tools](AWS_TOOLS.md#authentication-and-live-smoke-check). Native empty scans
  still cannot prove absence of workload jobs/consumers or owner/calendar/recovery
  clearance. Separate workload authority remains necessary for recommendations.

### Recommendation policy and validation regression proof — 2026-10-25

- **Gate/owner/mode:** preservation of safety policy, Milad; local synthetic and
  fixture tests only. Added eleven focused regressions for both operational
  channels: missing clearance, partial/unavailable/error sources, missing authority
  and invalid partial payloads. Forged positive report text, real citation IDs and
  empty checklists cannot bypass the existing final-report safety proof.
- **Verification:** focused recommendation/investigation/scenario/AWS-adapter/
  report tests passed **95/95**; `npm run typecheck` and scoped Biome lint passed.
  Full `npm test` with local loopback/subprocess access passed **246/246**.
  No production policy or validator changes are part of this regression slice.
- **Limits/next action:** no paid inference, live AWS or remote persistence;
  step 4 requires identifying actual job/dependency systems and their contracts.
  No connector, authority or live operational coverage is inferred from fixtures.

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

- **Gate/owners/status:** the deployment owner now explicitly confirms that the
  configured Zetaris account is **non-admin and limited to API access**. This
  supersedes the earlier administrator-account characterization; a replacement
  account is not required on that basis. This is owner-confirmed identity evidence,
  not an independently enumerated grant set. Detailed table scope and backend
  append-only enforcement remain unverified; keep those distinct from identity
  class and the already proven append/readback functionality.
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
  change or new model calls. Existing successful append/read measurements remain
  functionality proof; their former administrator label is superseded by the
  owner's correction, not by a new service probe.
- **Next action:** retain the existing limited API identity. For the separate
  effective-permission gate, record non-secret table/role/backend-overwrite policy
  evidence when available; do not require another account or destructive denial
  probes. No new calls, grants, retained writes or secret edits were performed for
  the owner-confirmation update. Deployment version and actual append-only
  enforcement remain unverified.

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
| AWS CLI | Live AWS default, explicit mock mode; AWS integration recorded `npm test` **204/204**, typechecks and lint passed. [Integration](history/execution-log.md#aws-merge-and-cli-integration-verification-2026-10-24), [default correction](history/execution-log.md#default-evidence-correction-2026-10-24). [CCI profile proof](#dedicated-cci-aws-profile-and-live-reads--2026-10-25) retrieves one live Paris instance and completes empty SSM/ELBv2 reads. [CloudWatch proof](#live-cloudwatch-verification--2026-10-25) retrieves all four series at five-minute resolution, with incomplete history. | Obtain adequate metric history and verify opted-in billing; configure authoritative jobs/dependencies and pricing/commitment coverage. Zayan/team; Milad verifies integrated reports. |
| Real model and both historical stores | Genuine NVIDIA call, remote Zetaris append/readback and local H-MEM recall in a real-model warm run over mock evidence; [proof](history/execution-log.md#successful-real-model-access-retry-and-warm-proof--2026-10-24). [Decision follow-through](history/execution-log.md#distinct-memory-roles-and-decision-follow-through--2026-10-24) also has real Zetaris proof. Oct 25 [OpenAI gate](#openai-reliability-gate-closed--2026-10-25): **9/9 complete**, 51 HTTP 200 model requests, 63/63 valid citations, mock evidence/history disabled. Earlier NVIDIA gates remain retained separately. | Repeated OpenAI A/B/C gate closed; Milad. Owner confirms the existing Zetaris identity is non-admin/limited API; detailed effective table/overwrite policy evidence remains separate ([permission review](#zetaris-deployment-permission-review--2026-10-25)). No replacement account is required on the previous admin assumption. Live evidence and event eligibility remain separate. |
| Learned investigation checks | Full scripted cold/warm/changed proof; live cold/warm plus separately recovered changed phase. [Proof](history/execution-log.md#learned-operational-check-cold-warm-and-changed-evidence--2026-10-24). Eight-workload H-MEM comparison ties both fixed orders; teaching cost retained. | No general advantage demonstrated. Prioritize live evidence; richer memory only with measured benefit. Milad. |
| Evaluation and reporting | A/B/C/failure fixtures, deterministic savings/null guards, validated trace and measured baselines recorded. [Evaluation](history/execution-log.md#measured-fixture-evaluation-and-earlier-failed-real-model-warm-attempt--2026-10-24), [diagnostics](history/execution-log.md#sanitized-failure-diagnostics-and-separate-execution-metrics--2026-10-24). Real-model failures remain in denominators. | Do not claim reliable real-model completion or live pricing from fixture results. Milad. |
| Release | Local isolated clean-checkout runtime proof passed at `391cdef` ([receipt](#clean-checkout-validation-and-coding-agent-runbook--2026-10-25)); release is **not complete**. | Independent reproducer/visual review, final README review, final artifact security review, accurate sponsor/Cursor documentation, slides, 1–4 minute demo and portal/submission verification. Milad; Zayan reviews sources. |

**Next slice:** CloudWatch access and populated retrieval are verified, with incomplete history. Zayan/team obtains adequate metric coverage, verifies opted-in Cost Explorer and supplies authoritative operational sources; Milad runs the integrated CLI against those sources, retaining `needs_verification` wherever critical coverage is missing. The repeated OpenAI A/B/C gate is closed; retain prior failures and complete the Oct 26 freeze assets. No positive live scheduling or numeric savings claim before its evidence gate passes.

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
- [ ] Complete live metric-history coverage, verify resource-level billing and authoritative operational coverage through the integrated CLI; populated CloudWatch retrieval is verified above, with incomplete history. Disclose unavailable sources and keep unsafe/unknown opportunities deferred.
- [x] Genuine scoped Zetaris history append/readback and useful subsequent-run recall demonstrated with synthetic records.
- [ ] Record effective table-level/append-only policy evidence separately from successful history functionality: [owner confirms the existing account is non-admin with limited API access](#zetaris-deployment-permission-review--2026-10-25); no replacement account required on the superseded admin assumption. Deployment owner is the user, verification owner Milad.
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

## Engineer decision UI — 2026-10-25

- **Gate/owner:** demo decision follow-through, Milad. Complete conditional
  recommendations offer **Record your decision in Zetaris**. The primary form
  requires an explicit Accept/Defer choice, engineer ID, reason, future UTC review
  date for defer and real-storage acknowledgment. The fictional seven-record
  demonstration is separate. Successful saves display verified record IDs and a
  downloadable receipt; AWS remains read-only.
- **Proof/mode:** `node --import tsx --test --test-isolation=none
  tests/follow-up.test.ts tests/demo-web-jobs.test.ts tests/demo-web.test.ts`:
  **19/19 passed**. Includes actual isolated workers against a local HTTP Zetaris
  ledger fixture: accept, defer, exact duplicate, immutable conflict and ambiguous
  committed insert with no retry. No real remote record was written for this task.
- **Browser:** `node --import tsx /tmp/cci-decision-browser.mjs` passed the complete
  browser → server → worker → adapter → local ledger flow: unselected/disabled
  initial form, required acknowledgment, Accept/Defer, verified receipts, target
  reset, UTC date persistence, no page errors and no 390px horizontal overflow.
  Desktop/mobile screenshots reviewed. `npm run typecheck`, scoped Biome lint and
  `node --check src/web/app.js` passed.
- **Boundary/next:** local fixture proof establishes wiring and failure behavior,
  not new live Zetaris connectivity or authenticated approval. Existing remote
  integration receipts remain separate. Restart the demo to load changed assets;
  later reviews and attributed outcomes use the existing CLI workflow.

## Follow-through Demo checkbox — 2026-10-25

- **Gate/owner:** demo presentation, Milad. Follow through defaults to the selected
  investigation's decision form. A native **Demo** checkbox exclusively shows the
  fictional illustration instead. Switching performs no service call and clears
  write acknowledgment; the recommendation CTA returns to investigation mode.
- **Proof/mode:** `node --import tsx /tmp/cci-followup-mode-browser.mjs` passed:
  default state, exclusive visibility, acknowledgment reset, no toggle writes,
  existing Accept/Defer saves and verified receipts through local fixture storage,
  and 390px layout without overflow or page errors. `npm run typecheck`, scoped
  Biome lint/format, JS syntax and diff whitespace checks passed. No remote calls
  or new dependencies. Restart the demo server to load the changed assets.
