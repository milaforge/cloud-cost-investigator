# Cloud Cost Investigator — Execution Plan (Milad + Zayan)

[What](../README.md) · [Why](WHY.md) · [How](HOW.md)

> **Sole execution tracker.** Event requirements are recorded in [`RULES.md`](RULES.md); approved product and safety contracts are in [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md); agent workflow in [`../AGENTS.md`](../AGENTS.md). A task is complete only with executed evidence. Preserve the distinction between team decisions, planned work, mocks and verified live integrations.

**Hackathon track:** 02 — The Agent That Can Explain Why.  
**Approved scope (2026-10-23):** AWS EC2 off-hours scheduling safety; direct current-evidence tools; Zetaris structured history; Meterless reasoning memory; no infrastructure modification. The older cost-increase/snapshot-comparison workflow is superseded.  
**Deadline:** 2026-10-27 23:45 UTC in recorded event notes; verify portal. Target freeze: Oct 26.  
**Active milestone:** Days 3–4 — full user flows and live-evidence integration, reconciled Oct 24, 2026. Day 2's mock B/failure gate and separate real-model, H-MEM and Zetaris round-trips have linked historical proof. This advances the work stage, not the combined live-evidence or release gates.

## Current status and next actions — reconciled 2026-10-24

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

## Coordination

Zayan owns data-source truth; Milad owns verdict/report truth. Agree on shared contracts before concurrent changes and preserve unrelated work. Record new executable evidence here with command, outcome, mode, owner, blocker and next action. Keep rationale in `memory.md`; historical receipts are retained, not a second active tracker.
