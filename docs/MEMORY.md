# H-MEM reasoning memory

## Current decision contract — 2026-10-26

New runs only reject a named, cited conflict or defer with explicit missing evidence/authority. A complete technical check with no conflict still defers the external human decision; new savings are null. Billing is ranking context and cannot block operational investigation of validated running inventory. Historical conditional-recommendation reports and dated receipts retain their original semantics. Zetaris accepts review requests for new rejected/deferred results; acceptance/outcomes are legacy-only. See [the product contract](PROJECT_CONTEXT.md#6-decision-policy).

[What](../README.md) · [How](HOW.md)

> Current collection policy (2026-10-26): all remaining candidate checks run within budgets, even after a contradiction. H-MEM may prioritize a learned check but does not skip other checks. Earlier saved-call receipts below remain historical measurements under the old early-stop policy. Current `demo:warm` verifies ordering, fresh evidence and correction; it reports call deltas without requiring a speedup.

## Configuration

For the CLI, set `HMEM_PERSIST_DIR=.cci-memory` to retain lessons between investigations; leave it unset to disable CLI memory. Keep generated state untracked and use one writer per directory. The local store is capped at 100 records.

The Live web worker uses `.cci-memory` by default even when this variable is
unset; `HMEM_PERSIST_DIR` overrides that path. Docker Compose sets
`HMEM_PERSIST_DIR=/app/.cci-memory` and keeps it in the `cci-hmem` named volume
across image rebuilds and container replacement. CLI investigations still
require an explicit `HMEM_PERSIST_DIR` to enable memory. A memory read or write
failure is reported as unavailable; it never becomes a safety finding.

H-MEM uses the checked-in reference with deterministic local embeddings and JSON persistence. Direct telemetry and the operator decision ledger belong to the other [components](components.md).

## Store and recall

The investigation recalls memory after fresh inventory and available billing select a candidate, then stores a validated summary after evaluation. Summaries retain scope, timestamps, hypothesis, decision reason, unresolved risks and provenance. Storage is isolated per account/region and validated on read and write; a failed local persistence operation prevents adoption.

Only authoritative, cited contradictions teach typed `dependency_continuous_operation` or `critical_job_overlap` lessons. Recall is scoped to account, region, instance, evidence mode and matching UTC window, excluding future records. The newest eligible summary is active; older records remain auditable and legacy summaries without lessons remain readable.

Planner hints contain only the allowlisted check and window. Historical evidence IDs and free-form memory text stay out of those hints. Fresh rechecks are traced as `confirmed`, `not_observed` or `unresolved`. Updated findings can supersede an old lesson; clearing one concern still requires the remaining safety checks.

[Structured operator feedback](FOLLOW_UP.md#automatic-learning-from-outcomes) has a separate link-validation path before it can teach a lesson. Raw Zetaris records never directly order the planner.

## Standalone persistence probe

```bash
npm run probe:hmem
```

This executes a mock B investigation, stores a compact summary through the real local H-MEM reference, reopens the engine and retrieves it. It owns and removes its temporary directory. This isolates store/reload/query behavior; it does not establish hosted memory or warm planning.

[Warm-run methodology and recorded evidence](evaluation/README.md#learn-a-check-prioritize-it-then-change-the-conclusion) cover query-order behavior and changed evidence.
