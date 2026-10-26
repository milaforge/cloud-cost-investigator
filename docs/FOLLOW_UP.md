# Decisions and follow-through

[What](../README.md) · [How](HOW.md)

H-MEM teaches scoped investigation checks. Zetaris retains the recommendation,
what an operator decided, when to revisit it, and what was later reported or
investigated. Direct evidence still controls every current scheduling conclusion.

The CLI uses the existing `.env` and dedicated `CCI_HISTORY` table. Reads require
the configured credentials; writes also require `ZETARIS_HISTORY_ALLOW_APPEND=true`.
Use the existing [Zetaris setup](ZETARIS_HISTORY.md). No table provisioning or
infrastructure write is performed by these commands. Do not put secrets in decision
reasons, actor IDs, outcome notes or evidence references.

## Schedule a review in the web UI

Run `npm start`, choose Live, then run an investigation or load a valid live report. Select a rejected or deferred result and choose **Schedule a review in Zetaris**. Select **Schedule a review**, enter the engineer ID, reason and future UTC review time, acknowledge real storage, and save. Partial investigations can be reviewed; failed investigations cannot receive decisions. A review request is not shutdown approval.

The server validates the report, scope and event, appends the investigation and review request, and verifies exact readback before reporting success. Identifiers remain historically named `recommendation_record_id` for storage compatibility; they now link the investigated result, not a new recommendation. One immutable request is retained per investigation/candidate. An ambiguous write is never automatically retried. Engineer IDs are attribution, not authenticated authority.

The global Demo/Live selector applies across tabs. Demo only illustrates review and historical outcome flows; it performs no service calls or retained writes. Live Learn displays the selected report's memory status. Actual sponsor round-trips use separate authorized CLI demonstrations.

## 1. Produce an investigation result

```bash
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= ZETARIS_HISTORY_ALLOW_APPEND=false npm run --silent investigate -- --evidence mock --account demo --region us-east-1 --scenario B --json > /tmp/investigation.json
```

B rejects the named job conflict. A finds no technical conflict and defers the external human decision (exit 2). Both can receive a review request. The `decide` command uses the saved report without rerunning inference.

## 2a. Schedule a review, then retrieve fresh evidence

Create `/tmp/defer.json` with your attributed reason and a future UTC review time:

```json
{
  "kind": "deferred",
  "actor": "engineer-id",
  "reason": "Verify the named job schedule after the owner resolves the conflict",
  "review_at": "2026-11-01T09:00:00Z"
}
```

```bash
npm run --silent followup -- decide --report /tmp/investigation.json --instance i-mock-primary --input /tmp/defer.json
npm run --silent followup -- list --account demo --region us-east-1 --instance i-mock-primary
npm run --silent followup -- review --account demo --region us-east-1 --decision DECISION_ID --scenario C
```

Use the returned `decision.record.record_id` as `DECISION_ID`. Review before its due time fails without investigation. The current CLI review harness requires explicit synthetic `--scenario`; it does not pretend to run live AWS. It retrieves new scoped evidence IDs, validates the new report, and appends the linked review. Partial reviews remain due. New results still only reject or defer; acceptance never follows from a missing blocker.

## 2b. Historical compatibility: accept and record an outcome

This path is supported only for a **historical complete conditional-recommendation report**. New runs cannot produce one. One
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
```

The follow-up demo uses the **real configured Zetaris service**, a unique synthetic
account and fictional operator decisions. It retains **six** labeled records:
two investigation records, two review requests, a fresh review investigation and its linked review result. H-MEM and live model calls are disabled
for this proof, isolating the value of structured history. All reported checks must
pass; the complete JSON is emitted at the end, progress on stderr. The retained historical
[executed result](follow-up-zetaris.json) demonstrates the earlier acceptance/outcome policy and actual remote persistence, not proof
of a production human decision, live AWS integration or external change execution.

For memory comparisons and warm demonstrations, use the [evaluation guide](evaluation/README.md).

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

For an eligible historical recommendation, suppose a team accepted a shutdown recommendation, then rolls it back because another service needs the server running. The engineer records that rollback with the dependency check selected. On the next matching investigation, the feedback teaches H-MEM to check dependencies first. Fresh evidence decides whether the conflict still exists; cleared findings replace the old lesson.

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
