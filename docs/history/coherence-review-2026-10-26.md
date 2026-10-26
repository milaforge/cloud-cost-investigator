# CCI coherence review — 2026-10-26

Review target: **identify a specific reason to reject a shutdown window, or say exactly what evidence is missing and defer the decision.**

This records findings from the pre-change working tree. The user subsequently approved reject-or-defer for new runs, legacy-report compatibility, and integration of concurrent evidence-collection changes. The findings below are historical review observations; the implemented resolution is in the current product contract. Current execution status remains in `docs/EXECUTION_PLAN.md`.

## Conclusion

The contradiction-first engine is a strong foundation, but the repository still describes and tests a broader optimization product: discover opportunities, conditionally recommend shutdown, calculate savings, and record acceptance. Coherence requires aligning behavior, explanatory output, scenarios and sponsor workflows—not just replacing the opening sentence.

Keep validated read-only tools, deterministic verdict authority, bounded retries/deadlines, current-run citations and historical/current evidence separation. No framework rewrite is needed.

## 1. Resolve the outcome contract first

**Sources:** `src/investigation/run.ts:898`, `src/contracts.ts`, `docs/PROJECT_CONTEXT.md:11`, `README.md:12`, `slides.md:33`.

The implementation genuinely supports `conditional_recommendation`; A and several warm/changed-evidence cases explicitly require it. The new two-outcome purpose excludes that behavior. Removing the words while retaining the behavior would create a new inconsistency.

For the narrowed product, stop presenting conditional clearance and savings as its central output. Update the producer, validator, planner guidance, current scenario expectations and documentation together. Preserve older reports/receipts and their real verdicts through compatibility handling. Do not relabel complete evidence as missing merely to force a deferral: when no blocker is established, accurately distinguish the absence of a found conflict from absent authority or unsupported scope. Empty discovery and execution failure also remain run states, not fabricated window verdicts.

## 2. Name the actual conflict

**Sources:** `src/investigation/run.ts:880`, `src/investigation/policy.ts:29`, `src/contracts.ts:135`, `src/contracts.ts:138`.

Current rejection text says “a retrieved critical job” or “a retrieved dependency.” Jobs already carry IDs and hours; maintenance carries IDs and dated occurrences. Surface those facts and the actual overlap with the rejected window in the main explanation, with the current-run evidence citation.

Dependency evidence currently has a continuous-operation boolean, not a named service and obligation. That source/contract needs attributable detail before CCI can give a specific dependency reason. Never invent the missing service name. A load-balancer registration alone is not a continuous-operation requirement.

**Acceptance:** a reader can identify the conflicting workload/maintenance, relevant time interval and rejected window without opening raw observation JSON; an unknown dependency cause remains explicitly unknown.

## 3. Make missing evidence the answer

**Sources:** `src/investigation/run.ts:933`, `src/investigation/policy.ts:194`, `src/investigation/report.ts:844`, `src/web/app.js:512`.

Deferral explanations lead with CPU statistics. The checklist mainly contains generic source/status instructions rather than the concrete `missing_fields`. Concise CLI output hides all but the first action behind `--verbose`; the UI hides the checklist in a tooltip.

Lead with the blocking evidence gap, why it prevents a decision, and the exact next check. Preserve distinctions between not queried, unavailable, incomplete coverage, non-authoritative scope and absent clearance. In Live, “jobs outside SSM unknown” is more useful than simply “operations partial.” Keep metrics and savings as supporting detail.

**Acceptance:** default CLI and the visible result card expose every decision-blocking gap and its resolution action; optional disclosures hold raw provenance and trace.

## 4. Reconsider optimization prerequisites

**Sources:** `src/investigation/policy.ts:78`, `src/investigation/run.ts:568`, `src/investigation/run.ts:640`, `src/tools/aws-agent.ts:122`.

Candidate selection requires positive matching billing. Operational checks require a proposed window; proposals require complete metrics and low average/peak CPU across the entire observed period. The native adapter nevertheless proposes a quiet six-hour interval. Busy daytime activity can therefore prevent checking the quiet interval for a concrete conflict. Missing billing can prevent investigating safety altogether.

Separate evidence needed to rank a cost opportunity from evidence needed to reject an identified shutdown window. Preserve scoped inventory validation and fail-closed handling. Changing the billing prerequisite explicitly revises an existing repository invariant; do it as a deliberate policy change, not an incidental refactor.

The current request accepts account/region/lookback, not an arbitrary engineer-supplied window. Native discovery considers same-day six-hour UTC intervals. State that boundary clearly; don't imply weekday, overnight or arbitrary-window support. Adding those inputs is separate scope, not necessary for copy coherence.

## 5. Do not abandon a useful contradiction check prematurely

**Source:** `src/investigation/model.ts:129`.

The planner is told to finish when required evidence is unavailable. A missing operations source prevents clearance, but another allowed fresh check may still establish a decisive dependency conflict. Direct the planner to seek remaining relevant contradictions within the budget, then defer unresolved cases. Preserve cancellation/runtime bounds. The subsequently integrated collection policy retains the conflict while attempting both remaining operational checks.

## 6. Match claims to actual live evidence

**Sources:** `src/tools/aws-agent.ts:225`, `src/tools/aws-agent.ts:255`, `docs/AWS_TOOLS.md`, `slides.md:94`.

Native operations/dependency observations deliberately remain partial and non-authoritative. They expose dated SSM maintenance and ELBv2 target registrations, with unknown work outside those sources. The native adapter does not provide the complete owner/calendar/recovery proof used by positive synthetic cases.

The implemented native decisive rejection is a dated overlapping SSM maintenance execution. Generic critical-job and continuous-dependency scenarios demonstrate the broader synthetic contract. Show this capability distinction beside examples, rather than relying on a distant disclaimer. This review did not perform live-service validation.

## 7. Align follow-through with the core results

**Sources:** `src/investigation/follow-up.ts:61`, `src/web/app.js:1016`, `docs/FOLLOW_UP.md:17`, `slides.md:115`.

Follow-through accepts only completed conditional recommendations. It excludes the rejected windows and evidence-deferred cases that define the new purpose. Its operator “Defer” means postponing an otherwise supported recommendation; it is not the investigator's missing-evidence deferral.

The coherent future workflow is review of a rejected window or resolution of a named evidence gap, with fresh evidence before reassessment. That requires a deliberate event/eligibility contract change. Until implemented, label the existing approval workflow as broader existing functionality rather than claiming it completes the narrowed product. Preserve append-only writes, attributed decisions, explicit write acknowledgment and readback.

## 8. Refocus scenarios and measurements

**Sources:** `tests/investigation.test.ts`, `tests/broader-scenarios.test.ts`, `tests/warm.test.ts`, `scripts/demo-warm.ts:170`, `scripts/evaluate.ts:58`, `scripts/evaluate.ts:182`, `scripts/probe-model-reliability.ts`, `docs/SCENARIOS.md`, `docs/TRACE_EXAMPLE.md`.

Present B's named conflict first, then missing/partial evidence, then a scoped dependency example. Show changed evidence invalidating an old blocker without treating stale history as a present reason. Keep complete-clearance cases as explicit compatibility/boundary cases until the outcome contract changes.

Current measurements mostly establish verdict classes, valid citations and absence of unsafe positives. Add assertions for explanation specificity: correct conflict identity/overlap; exact missing source or authority; actionable next check; no invented cause. Include a deferral case in the repeated real-model gate, which currently covers A/B/C. The `high_peak` benchmark labels the case unsafe while expecting uncertainty; reconcile that classification instead of equating an unexplained peak with a proven conflict.

Keep H-MEM's role narrow: prioritize useful fresh checks. Retain fixed-order comparisons, teaching costs and changed-evidence tests. Regenerate current exports from executed tests after behavior changes; never rewrite dated measurements to look newly coherent.

## 9. Unify README, diagrams, UI and slides

- **README:** open with the stated promise and one concrete rejection/deferral example. Move savings and broader optimization direction out of the central promise.
- **Diagrams (`README.md:33`, `slides.md:56`):** expose explicit conflict and missing-evidence branches. Label the planner's choices and evaluator authority. Inventory alone precedes the first planner call; the slide incorrectly groups billing into that prerequisite. Preserve separate historical/learning edges.
- **UI (`src/web/index.html:7`, `src/web/app.js:140`):** focus the question and result on the evaluated window. Give the conflict or evidence gap primary space. Monthly savings currently competes with the answer, while missing checks are hidden. Reconcile the positive green path with the chosen contract.
- **Slides:** slide 1's user decision, slide 2's outcomes, slide 3's branches, slide 5's sponsor follow-through, slide 7's output and slide 8's expansion story should all explain the same narrow purpose. Use actual named evidence in the product visual. Improve source coverage and gap resolution before promising broader optimization.
- **Demo:** demonstrate the named conflict and an equally concrete deferral. Clearly distinguish local scripted previews, recorded model runs and genuine service receipts.

## 10. Correct stale documentation independently

- `README.md:142` claims browser Learn runs temporary H-MEM and Follow through retains synthetic records. Demo is now preview-only; Live Learn shows report context. Link separate CLI proofs.
- `docs/FOLLOW_UP.md:34` describes an obsolete Demo checkbox and retained remote demonstration writes. Match the global Demo/Live interface.
- `docs/DEMO.md:9` says B selection does not execute a new investigation; it generates a local scripted preview on demand. Distinguish that from a live service run.
- `src/web/app.js:563` says individual reasoning steps have no timestamps, while current traces do. Explain collection timestamps versus emission timestamps and compatibility with older reports accurately.
- `docs/DEMO.md:5` and contributor guidance reference `the_bar.md`, which is already deleted in the working tree. Resolve dangling references without restoring unrelated deleted work.
- `docs/ec2-scenarios.jsonl` is stale against the current explanation producer: the scenario-export test fails its retained-versus-regenerated comparison for missing-evidence cases. Regenerate the current artifact after the explanation contract settles; preserve historical receipts.
- Record the narrowed purpose as superseding the broader current direction in `AGENTS.md`, `docs/PROJECT_CONTEXT.md` and repository `memory.md` when implementing it. Keep executable task state solely in `docs/EXECUTION_PLAN.md`.

## Smallest coherent implementation order

1. Establish the narrowed outcome semantics and old-report compatibility.
2. Improve specific conflict and evidence-gap production at the policy/report boundary; expose them in default CLI/UI output.
3. Align investigation prerequisites and planner stopping with the narrower question.
4. Align follow-through eligibility and scenario/evaluation expectations.
5. Update current documentation, diagrams, deck and generated examples to match verified behavior.

The finish condition is observable: every current public example either identifies a real retrieved conflict against its stated window, or names the actual missing evidence and next check; no surface promises unimplemented clearance, live coverage or follow-through.

## Executed verification

- `npm run typecheck`: passed.
- `npm run lint`: exit 0; existing warning in `tests/recommendation-boundary.test.ts` and informational notice in a historical AWS probe. No fixes applied.
- `npm run test:scenarios`: 85/85 passed, offline fixtures/local history and memory only.
- `node --import tsx --test --test-isolation=none tests/aws-operational.test.ts tests/investigation.test.ts`: 65/65 passed, offline.
- `npm test`: 360 tests, 350 passed, 10 failed. Nine failures involved restricted local fixtures; rerunning `tests/demo-web.test.ts tests/demo-web-jobs.test.ts` with loopback access passed 12/12, and `tests/model-request-timing.test.ts` passed 3/3. The remaining scenario-export assertion is a real retained-artifact mismatch, described above. The entire suite was not rerun unrestricted.
- `git diff --check`: passed.

No live AWS, paid inference, remote Zetaris writes, browser visual verification or deployment was performed. Existing working-tree changes were preserved; tests and source were also changing concurrently, so this is a review of the observed working tree, not certification of an immutable revision. The only file added by this review is this document.
