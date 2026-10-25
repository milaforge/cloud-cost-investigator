# Evaluation and demonstrations

[What](../../README.md) · [How](../HOW.md)

These procedures separate synthetic evidence, real local memory, real remote persistence and live model calls. They do not establish live operational safety or measured production savings. See the [current status](../EXECUTION_PLAN.md) before interpreting a proof.

## Input and output examples

These complete JSON reports were saved from successful CLI runs on 2026-10-24 using synthetic observations, scripted planning and disabled historical stores. They are documentation artifacts, never runtime answers. To reproduce, run this command replacing `SCENARIO` with A, B or C:

```bash
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario SCENARIO --json
```

| Input scenario | Saved output | Decision |
| --- | --- | --- |
| `A` | [Full report](examples/A.json) | Conditional recommendation; explicit synthetic clearance and qualified compute savings. |
| `B` | [Full report](examples/B.json) | Reject the proposed shutdown after a newly retrieved critical-job conflict. |
| `C` | [Full report](examples/C.json) | Reject the proposed shutdown because a dependency requires continuous operation. |

Run IDs, evidence IDs, lookback timestamps and elapsed time vary. Assess the disposition, cited observations and hypothesis transition rather than byte equality. [Trace interpretation and failure behavior](../CLI_GUIDE.md#capture-and-read-the-decision-trace) explain what the reports prove. The synthetic pricing and authority in A establish neither live AWS safety nor realized savings.

## Repeated real-model CLI gate

With configured Chat Completions access, run three serial A/B/C rounds through
the actual CLI. Supply a **new output directory**; an existing directory is
refused so an earlier measurement cannot be overwritten:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=1 node --import tsx scripts/probe-model-reliability.ts /tmp/cci-model-reliability
```

The probe uses explicit mock evidence, fresh CLI processes, unchanged CLI pacing,
and disabled H-MEM/Zetaris history regardless of `.env`. It saves every full report
and CLI stderr, followed by `summary.json`. All nine attempts count; there are no
retries or scripted fallbacks. Exit 0 requires complete expected verdicts, live
planner metadata matching the configured model, valid current-run citations,
independent run/evidence IDs, and B/C proposal-to-contradiction transitions citing
the correct operational source. Partial or failed reports never pass this gate.
The designed fixtures do not establish production reliability or live AWS safety.

The current OpenAI result and remaining release work are recorded in the
[execution tracker](../EXECUTION_PLAN.md#openai-reliability-gate-closed--2026-10-25).
Earlier NVIDIA measurements remain separate; do not combine providers in a gate.

For the NVIDIA-hosted `nvidia/nemotron-3.5-super-vl-120b-a12b`, the tested
command-local generation setting is below. The NVIDIA repeated gate remains failed;
this is a reproduction setting, not a reliability guarantee:

```bash
LLM_EXTRA_BODY='{"chat_template_kwargs":{"enable_thinking":false}}' \
NODE_TLS_REJECT_UNAUTHORIZED=1 \
node --import tsx scripts/probe-model-reliability.ts /tmp/cci-model-reliability-thinking-off
```

This uses the existing endpoint, model and credential. It replaces
`LLM_EXTRA_BODY` only for that command and leaves `.env` untouched. Do not apply
NVIDIA-specific options to another provider. [NVIDIA documents](https://docs.nvidia.com/nim/large-language-models/latest/get-started/advanced/get-started-nemotron-3.5-super-vl.html#control-reasoning)
that reasoning is enabled by default and shares the output-token budget; this
planner needs a short action JSON rather than a reasoning trace. A successful
thinking-disabled run does not prove the cause of a preceding HTTP 500.

The [execution tracker](../EXECUTION_PLAN.md#real-model-reliability-gate--2026-10-25)
records the measured result and links both the full reports and preceding
diagnostics. Model/event eligibility and live operational evidence remain
separate gates.

The gate explicitly preloads the metadata-only observer in each child CLI;
each `round-N-SCENARIO.stderr.txt` contains that process's timing lines.
Do not rely on `NODE_OPTIONS` propagation: it was absent in the diagnostic
execution environment, leaving the earlier intended instrumented run without
request timings. For a single diagnostic CLI run, use
`node --import ./scripts/model-request-timing.mjs --import tsx cli.ts investigate`
with the explicit evidence/planner/scope flags from the CLI guide.

`summary.json` and all acceptance conditions remain unchanged. See
[timing interpretation](../CLI_GUIDE.md#request-phase-timing) before assigning a
failure to the network or provider. An instrumented rerun is a separate
measurement; retain previous failed runs.

## Memory-order comparison

```bash
npm run --silent evaluate:memory > /tmp/memory-evaluation.json
```

Compare H-MEM against both fixed operational-check orders across eight equally weighted recurring, cleared, switched and missing-source workloads. Each case has an independent teaching investigation; baselines use no memory and share the same executor/safety policy. Select the best fixed order by aggregate tool calls after measurement, favoring the baseline. Count teaching cost, completion, expected deferrals and correctness separately. Do not infer general superiority from a favorable recurring-blocker example.

[Recorded comparison and follow-through results](../history/execution-log.md#distinct-memory-roles-and-decision-follow-through--2026-10-24) link the full retained artifacts and measured tie.

## Both-store warm proof

Requires [H-MEM configuration](../MEMORY.md#configuration) and [provisioned Zetaris history](../ZETARIS_HISTORY.md), including explicit append enablement. This probe writes retained synthetic records to the real service.

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
the model planner receives the same bounded hints; its actual action is visible in the trace.
Historical text and old evidence IDs are
excluded from planner hints. A cleared or unavailable fresh job source cannot
inherit the old rejection. Source read statuses and write outcomes are reported
separately; unavailable history never substitutes for operational evidence.
Do not run concurrent writers against the same local memory directory.

[Recorded real-model both-store run](../history/execution-log.md#successful-real-model-access-retry-and-warm-proof--2026-10-24).

## Learn a check, finish earlier, then change the conclusion

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

[Recorded scripted/live attempts and recovered changed phase](../history/execution-log.md#learned-operational-check-cold-warm-and-changed-evidence--2026-10-24) retain failures, timings and limitations. A recovered phase is not an uninterrupted live three-phase pass.

## Measured fixture evaluation

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

See [CLI diagnostics](../CLI_GUIDE.md#diagnostics) for sanitized HTTP excerpts and failure codes.

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

Planner deadlines and tool-call budgets are defined in [runtime bounds](../components.md#runtime-ownership-and-bounds). A single live evaluation case can take 47 minutes 45 seconds at default pacing.

An HTTP 500 response still fails immediately: increasing timeouts cannot repair
an error the server has already returned. Overload is a possible cause, but the
sanitized status alone cannot establish it. No automatic retries or fallback
were added; preserve failed results when making a separate diagnostic run.

## Recorded measurements

- [Scripted fixture comparison](../history/execution-log.md#measured-fixture-evaluation-and-earlier-failed-real-model-warm-attempt--2026-10-24).
- [Real-model comparison and completion failures](../history/execution-log.md#successful-real-model-access-retry-and-warm-proof--2026-10-24).
- [Diagnostic measurement under the earlier 15-second deadline](../history/execution-log.md#sanitized-failure-diagnostics-and-separate-execution-metrics--2026-10-24).
- [Decision follow-through procedure](../FOLLOW_UP.md#reproducible-proof).

Designed fixtures are not production accuracy or statistical confidence estimates. Report disposition matches separately from investigation completion; failed predictions remain in denominators. Model cost is unknown because usage/billing is not captured. Historical measurements retain the limits used at the time.
