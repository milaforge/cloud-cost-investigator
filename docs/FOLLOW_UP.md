# Decisions and follow-through

[Documentation index](README.md)

H-MEM teaches scoped investigation checks. Zetaris retains the recommendation,
what an operator decided, when to revisit it, and what was later reported or
investigated. Direct evidence still controls every current scheduling conclusion.

The CLI uses the existing `.env` and dedicated `CCI_HISTORY` table. Reads require
the configured credentials; writes also require `ZETARIS_HISTORY_ALLOW_APPEND=true`.
Use the existing [Zetaris setup](ZETARIS_HISTORY.md). No table provisioning or
infrastructure write is performed by these commands. Do not put secrets in decision
reasons, actor IDs, outcome notes or evidence references.

## 1. Produce a recommendation

```bash
npm run --silent investigate -- --evidence mock --account demo --region us-east-1 --scenario A --json > /tmp/recommendation.json
```

This uses **mock** evidence. A decision requires a validated, complete investigation
with a `conditional_recommendation` for the selected instance. The first decision
command persists that recommendation and the decision, verifying exact readback.
The `decide` command takes an existing report, so it does not rerun inference.

## 2a. Defer, then review with new evidence

Create `/tmp/defer.json`, replacing `review_at` with the desired future UTC time:

```json
{
  "kind": "deferred",
  "actor": "engineer-id",
  "reason": "Review after the migration window",
  "review_at": "2026-11-01T09:00:00Z"
}
```

```bash
npm run --silent followup -- decide --report /tmp/recommendation.json --instance i-mock-primary --input /tmp/defer.json
npm run --silent followup -- list --account demo --region us-east-1 --instance i-mock-primary
```

The first response contains `decision.record.record_id`. After the review date,
use it as `DECISION_ID` below. Before that date the command fails with
`follow_up_not_due` and does not investigate.

```bash
npm run --silent followup -- review --account demo --region us-east-1 --decision DECISION_ID --scenario C > /tmp/review.json
```

`--scenario` is required because current evidence is still synthetic. Scenario C
introduces a fresh dependency conflict. The review runs the existing bounded
investigator with a new observation window and fresh evidence IDs, then appends
the new investigation and linked review outcome. The old recommendation never
becomes current evidence. The target must actually be investigated among the
bounded candidates, or persistence fails explicitly. Partial reviews are retained
and remain due; no automatic retry occurs. `--planner model` optionally uses the
configured live model, without fallback, while evidence remains mock.

## 2b. Accept, then record an outcome

Use a **different recommendation report** to demonstrate a second decision. One
recommendation has one immutable decision in this MVP; changing the existing
choice is an explicit conflict, not a silent overwrite.

Create `/tmp/accept.json`:

```json
{
  "kind": "accepted",
  "actor": "engineer-id",
  "reason": "Accepted for the separate human-controlled change process"
}
```

```bash
npm run --silent followup -- decide --report /tmp/another-recommendation.json --instance i-mock-primary --input /tmp/accept.json
```

Acceptance changes no infrastructure. After an external change or decision not
to proceed, create `/tmp/outcome.json` with the actual observation time and a
traceable ticket/receipt identifier. The observation time must be after acceptance
and no later than now:

```json
{
  "actor": "engineer-id",
  "reason": "The separately executed change was rolled back after a recovery issue",
  "observed_at": "2026-11-02T10:00:00Z",
  "result": "rolled_back",
  "evidence_reference": "change-ticket-42"
}
```

```bash
npm run --silent followup -- outcome --account demo --region us-east-1 --decision ACCEPTED_DECISION_ID --input /tmp/outcome.json
npm run --silent followup -- list --account demo --region us-east-1 --instance i-mock-primary
```

Allowed results: `implemented`, `not_implemented`, `rolled_back`. Receipts explicitly
say `verification: operator_reported`; the application does not fetch the linked
receipt or assert realized savings. Later observations append additional receipts.
Actor IDs are supplied by the trusted CLI operator, not authenticated approval
identities. This workflow must not be used as authorization for an executor.

## Reproducible proof

```bash
npm run --silent demo:followup > /tmp/follow-up.json
npm run --silent evaluate:memory > /tmp/memory-evaluation.json
npm run demo:warm
```

The follow-up demo uses the **real configured Zetaris service**, a unique synthetic
account and fictional operator decisions. It retains **seven** labeled records:
two recommendations, two decisions, a fresh review investigation, its linked
outcome, and an operator-reported rollback. H-MEM and live model calls are disabled
for this proof, isolating the value of structured history. All eight checks must
pass; the complete JSON is emitted at the end, progress on stderr. The retained
[executed result](follow-up-zetaris.json) is actual remote persistence, not proof
of a production human decision, live AWS integration or external change execution.

The memory evaluator uses real local H-MEM and scripted planning with mock current
evidence across eight workloads. Each case has an independent prior investigation;
baselines use no memory. Both fixed orders use the same executor and safety policy.
The best fixed order is selected by aggregate tool calls after measurement, favoring
the baseline. Completion, expected deferrals, correctness and teaching cost are
separate. The [recorded result](memory-order-evaluation.json) is a tie, not a claim
of general superiority or a latency/cost benchmark. The warm demo remains a useful
mechanism proof, rather than a general effectiveness claim.

## Storage and failure boundaries

- Existing table columns remain unchanged. Version 1 rows contain investigation
  summaries. Version 2 rows contain typed `deferred`, `accepted`, `reviewed` or
  `outcome` events. Investigation-history reads explicitly select version 1.
  Upgrade all readers before mixing version 2 records into their account scope;
  older checkouts cannot parse those events. No automatic remote DDL is needed.
- This is a single-writer CLI. No uniqueness guarantee across concurrent writers
  is claimed. Duplicate exact IDs are rejected on read. Use one writer per scope.
- The per-instance follow-up query is capped at 20 events and fails at the cap.
  It never reports an incomplete list as complete. Pagination is future work if
  real usage reaches that limit.
- Writes are append-only, with schema validation and exact readback. A failed or
  ambiguous write is reported, never automatically retried. A multi-record command
  can leave a valid recommendation without a decision, or a review without its
  outcome. Preserve the reported IDs and inspect history before retrying. Decisions
  and identical observation receipts are idempotent under the single-writer rule.
- A complete review marks the deferred item reviewed. A partial or failed review
  remains due. Manual re-review remains possible; there is no background scheduler,
  reminder notification, decision revision or automated remediation.
- Keep unknown evidence unknown. Neither accepted decisions nor reported outcomes
  grant scheduling clearance or become current tool evidence.

## Automatic learning from outcomes

Enable both `ZETARIS_HISTORY_TABLE` and `HMEM_PERSIST_DIR` in the investigation
CLI. Outcome recording still requires explicit append authorization. No additional
teaching command, model call or new table is needed: on the next matching
investigation, the existing recall path adopts applicable feedback into H-MEM.

For a rollback caused by a dependency, include this optional typed field in the
outcome JSON passed to `followup outcome`:

```json
{
  "actor": "engineer-id",
  "reason": "Rolled back because a dependent service requires continuous operation",
  "observed_at": "REPLACE_WITH_ACTUAL_UTC_TIME_AFTER_ACCEPTANCE",
  "result": "rolled_back",
  "evidence_reference": "change-ticket-42",
  "investigation_check": "dependency_continuous_operation"
}
```

Supported checks are `dependency_continuous_operation` (dependencies first) and
`critical_job_overlap` (jobs first). The field is accepted only for `rolled_back`.
The agent does not infer a cause from free text, nor does a missing field invent
one. Existing outcome records without this field remain readable. All readers of
the shared table must support the new optional field before writing it.

The learner validates outcome → accepted decision → original recommendation links,
account/region/instance, evidence mode and timestamps. It adopts only the latest
eligible feedback; the lesson applies only to the same proposed UTC window.
Already imported feedback is not stored twice. Feedback observed before a later
investigation cannot override that investigation; newer findings replace older
lessons. A newer `implemented` outcome can supersede an older rollback lesson,
but does not prove current safety or skip required checks. `not_implemented`
provides no operational learning signal.

Only allowlisted check/window data reaches the planner through H-MEM. Outcome,
decision and recommendation IDs stay separately labeled historical provenance;
operator prose and old evidence IDs are not current observations. Missing or
non-authoritative current evidence still causes deferral. A cleared conflict
continues through the other safety checks and stores the new findings.

Learning reads at most 20 follow-up rows per instance and refuses to learn if that
limit is reached or links are ambiguous. Reads honor the investigation deadline.
Unavailable Zetaris preserves existing H-MEM behavior; failed local persistence
prevents adoption. No background task or automatic write retry is added. H-MEM's
existing single-writer and 100-record limits still apply; older app versions cannot
read the new local outcome summaries, so upgrade readers together.

Offline proof (real local H-MEM, synthetic AWS evidence, fixture Zetaris transport):

```bash
node --import tsx --test --test-isolation=none tests/outcome-learning.test.ts
```

The dependency example saves one current-evidence tool call against the cold
scripted order. This proves adaptive ordering in that case, not a universal
speedup or live outcome-learning integration. Fresh authoritative evidence is
still required for the final verdict.
