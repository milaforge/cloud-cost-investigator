# Project Memory

## Structured historical comparisons (2026-10-24)

- Reuse validated version 1 Zetaris fields for previous verdict and proposed/
  rejected windows. Expose typed `historical_context.comparisons` in reports,
  alongside scoped identity, source mode, timestamps and provenance IDs.
- Keep comparison data out of planner hints and current evidence. H-MEM still
  owns historical query-order advice; fresh observations and the existing
  deterministic evaluator own proposals and verdicts. No remote schema change.
- Optional report field preserves retained-artifact compatibility. Validate scope,
  candidate, mode, time, retrieved context linkage and window bounds on read.

## Product positioning and documentation (2026-10-24)

- The user clarified the starting niche: find EC2 scheduling opportunities; the
  long-term product is a cost optimization specialist agent. Keep future ambition
  separate from implemented capabilities and existing MVP exclusions.
- README is a short entry point: use case, current integration boundary, demo and
  navigation. Preserve setup, evidence and diagnostic detail in docs/CLI_GUIDE.md.
- Existing H-MEM lessons are the best fit for reusable investigation methods, but
  the eight-workload tie does not justify richer memory or a general speedup claim.
  Require measured benefit against fixed rules; live operational evidence is the
  immediate priority. Additional Meterless engines remain optional future work.

## Distinct memory and decision-follow-through roles (2026-10-24)

- User challenged storing historical facts that must be fetched again. Keep the
  working warm demonstration, but distinguish reusable investigation method from
  current evidence and from a human decision trail. The earlier use of Zetaris
  missing-check lists as planner priorities is superseded; H-MEM alone owns
  historical check-order advice. Zetaris remains visible as audit context.
- Test the existing scoped lessons before adding richer memory machinery. Both
  fixed operational orders are strong baselines. Equal-weight recurring, cleared,
  switched and missing-evidence cases tie at 47 planner / 38 tool calls; keep that
  result. Prior investigations cost 45 / 37 if performed solely to teach memory.
  Do not choose workload weights afterward to manufacture a win.
- Both follow-up paths were requested: explicit deferral with a review date,
  and explicit acceptance with an attributed outcome. These are application
  records about intent and follow-through that current AWS telemetry cannot supply.
  Outcomes are operator-reported, never automatic evidence of savings or permission
  to mutate infrastructure. Keep live evidence integration as separate work.
- Reuse the dedicated append-only table and transport; version 2 typed event JSON
  uses the existing columns. Version 1 queries filter out decision events. No
  schema DDL, new production dependency, arbitrary SQL, automatic write retry,
  background scheduling or authenticated approval system is introduced.
- Single-writer MVP: one immutable decision per recommendation; exact duplicate
  input can reuse a receipt, changed input conflicts. Review results are linked
  to a fresh validated report; partial results keep the obligation due. Bounded
  per-instance history queries fail explicitly at the cap instead of silently
  omitting obligations. Older readers need upgrading to interpret version 2 rows.

## Retained provider HTTP error diagnostics (2026-10-24)

- User requested provider error bodies after repeated fast HTTP 500s could not be
  explained by status codes or isolated successful calls. Preserve an optional
  sanitized excerpt with the typed HTTP error, through runner trace, report
  validation/rendering, evaluation rows and verbose stderr. Never append raw
  exceptions or response objects to traces; old reports remain valid.
- Bound body reads to 8192 bytes and one second, cancel the reader, and retain at
  most 2048 sanitized characters. Keep allowlisted JSON diagnostic fields and
  useful plain-text errors; omit request/header/stack objects and redact configured
  credentials/scope, common secret patterns, URLs, paths and terminal controls.
  The excerpt is diagnostic text, never trusted instructions or current evidence.
- Preserve the original HTTP code even if the body is empty, stalled or invalid.
  No retry, prompt change or live request is needed to capture the existing error.

## Learned operational checks and a stronger warm proof (2026-10-24)

- The previous B warm proof prioritized an unqueried dependency and used more
  work than the cold run. Store an optional typed check derived from an actually
  cited, complete authoritative contradiction instead. A dependency requiring
  continuous operation or overlapping critical job is a specific question to
  verify again, never current evidence or scheduling authority.
- Keep lesson provenance in H-MEM; strip historical evidence IDs and free-form
  text from model hints. Bind the check to scope, evidence mode and proposed UTC
  window. The newest eligible summary supersedes prior lessons; keep old records
  in the engine ledger for audit. Equal timestamps prefer a summary without a
  conflict lesson, avoiding resurrection of a cleared conflict. Old summaries
  without the optional field remain readable.
- Extend the existing summary, history adapter and runner. The deterministic
  evaluator still owns verdicts. Record the fresh check as confirmed,
  not_observed or unresolved; absence of an old conflict alone is not approval.
- `demo:warm` isolates H-MEM from Zetaris so changed behavior can be attributed
  to Meterless. Cold C checks jobs then dependency; warm C checks dependency first;
  changed A clears the dependency and must complete the remaining safety checks.
  Reopen actual disk state between runs and verify the new summary supersedes the
  old warning. Compare planner/tool counts separately from wall time; never
  retry or use scripted fallback to manufacture a successful live measurement.
- Keep `probe:warm` as the separate two-store round-trip proof. With the new B
  lesson it rechecks the known job conflict first; its historical dependency-first
  results remain dated evidence, not the expected current behavior.
- Mock evidence IDs use UUIDs: a process-local counter reused old historical IDs
  when a live recovery began in a second process. Observation timestamps were
  fresh, but literal ID reuse broke the stronger cross-run provenance check.
  Preserve failed measurements and verify disjoint IDs after the fix.

## Slow, single-case model diagnostics (2026-10-24)

- User requested five-minute model-call waits and gentler free-endpoint usage
  after HTTP 500s. Align the adapter and runner at 300000 ms; scale the aggregate
  live deadline by the bounded planner count plus pacing and a two-minute reserve.
  Keep explicit shorter limits, scripted defaults, tool deadlines and call caps.
- Evaluation already serialized cases and calls. `--case` selects one fixture;
  denominator and methodology must reflect that selection. Five-second default
  live pacing occurs before every call, including the first in each case; this
  also separates requests across case boundaries. `--delay-ms` is bounded to one
  minute. Delay consumes the aggregate budget, not the model-call timeout.
- HTTP failures still return immediately, without retries. Slow responses and
  immediate 500s are different evidence; neither status alone proves overload.

## Evaluation progress (2026-10-24)

- Evaluation writes one final JSON document after all cases; redirection creates
  an empty file immediately, which previously made live runs look stalled.
- Optional `--verbose` writes progress to stderr, preserving parseable stdout.
  The investigation runner emits only selected structured metadata, including
  planner start and bounded wait before awaiting the model. Never log model
  reasons, tool payloads, scope, credentials, endpoints or raw exceptions.
- Keep the existing deadlines, safety policy, result schema and history-disabled
  evaluation path. Progress does not add retries or change completion semantics.

## Sanitized planner diagnostics and independent evaluation metrics (2026-10-24)

- The existing orchestrator owns wait/deadline and executor-action validation;
  the model adapter owns transport, HTTP, response-envelope, JSON and allowed-
  choice failures. Preserve those distinctions through a validated optional
  planner trace `failure_code`, with fixed public strings or HTTP 100–599.
  Unknown exception messages map to `planner_unknown_failure`; never report
  raw messages or bodies. Optional fields keep old reports readable, but old
  generic failures cannot be retrospectively diagnosed.
- Keep the existing stop reason and safety/completion semantics. Report exact
  label matches independently from complete/partial/failed counts, planner-
  failure cases and matching labels reached after failure. Correct unknown-
  evidence deferrals remain partial without being operational failures.
  Evaluation passes only with all labels matching, no failed investigation and
  no planner failure. Do not increase timeouts, add retries or change prompts
  to make diagnostic measurements pass.

## Evaluation and warm model proof (2026-10-24)

- Follow-up user confirmation accepts `nvidia/nemotron-3-ultra-550b-a55b` for
  the event. Treat model selection as team-approved without requesting another
  eligibility source. This is not independent organizer verification or proof
  of runtime access. A user-requested retry subsequently passed the real-model
  cold/warm proof without agent configuration changes; the earlier HTTP 403
  did not reproduce and its cause remains unknown. Do not infer revoked access
  or an invalid key from an isolated 403. Executed evidence is in the plan.
- Preserve model evaluation failures instead of rerunning to improve numbers.
  A matching deferral can coincide with planner failure: report disposition
  accuracy, completion and failure counts separately. Model fixture evaluation
  and warm sponsor proof are different claims; neither establishes live AWS.

- Reuse the CLI and existing planner in the warm sponsor probe; an explicit
  planner flag selects real inference without fallback. Verify non-overlapping
  cold/warm evidence IDs, actual presence and order of operational checks,
  both recalled stores and exact append readback. Keep TLS verification enabled.
- Keep evaluation tooling outside the production investigation path. Compare
  the agreed low-average-CPU heuristic using the same discovery ranking and
  independently retrieved fixtures; explicit expected labels are independent
  of observed verdicts. Missing predictions count as wrong. Separate known
  unsafe positives from recommendations with unknown safety. Citation lookup
  alone is insufficient, so validate the complete report before counting its
  candidate/hypothesis references.
- Scripted policy evaluation is not measured model performance. Designed
  fixtures cannot establish production accuracy or model superiority; retain
  per-case durations/calls and report unavailable model cost as null. History
  is disabled in evaluation even when the environment enables remote appends;
  D remains a separate explicit sponsor probe. Provider HTTP 403 cannot be
  repaired by relaxing TLS, guessing credential destinations or silent model
  fallback. Runtime access and event eligibility require separate evidence.

## OpenAI completion-token compatibility (2026-10-23)

- The shared Chat Completions adapter defaults to `max_completion_tokens` for
  the exact official OpenAI API base. Its earlier unconditional `max_tokens`
  default is incompatible with reasoning models. Other compatible providers
  retain the legacy default; an explicit choice of either parameter takes
  precedence, so the adapter never injects both. No model-name guessing,
  credential destination changes or automatic live retries are needed.
- The completion cap includes reasoning tokens. A truncated response remains
  an explicit failure; configured limits stay bounded at 4096. Preserve raw
  provider-error suppression and TLS verification when diagnosing compatibility.

## Development linting and formatting (2026-10-23)

- Lint remediation keeps the ASCII control-character rejection regex intact,
  with a documented suppression on that declaration only. Non-null assertions
  are replaced by checked lookups, stable narrowed locals and test assertions.
  The dynamic loader reuses the vendored H-MEM constructor type instead of
  `any`; no extra runtime import or dependency is needed.

- Use Biome as one development-only dependency for TypeScript/JavaScript and
  JSON linting and formatting, keeping npm and its existing lockfile.
- Respect Git ignore rules and exclude the upstream `vendor` tree and generated
  npm lockfile. Recommended lint rules stay enabled; existing findings are
  reported rather than hidden or fixed as part of tool installation.
- Keep checks (`lint`, `format:check`) separate from explicit writes (`lint:fix`,
  `format`) so validation does not rewrite concurrent work.

## Documentation decisions

- `docs/RULES.md` keeps hackathon notes in one canonical JSON fenced block so
  standard JSON parsers can consume the same content people review in Markdown.
- Use `snake_case` keys, numeric durations and points, and ordered arrays for
  workflows and task lists. Task lists describe guidance, not completion status.
- Keep illustrative ideas and agent behaviors separate from submission
  requirements to avoid turning examples into mandatory architecture choices.
- Preserve source uncertainty: the original rules omit the deadline year and
  onboarding minutes 0–10. Do not invent missing details or imply external
  verification. Project scope and architecture remain defined in
  `docs/PROJECT_CONTEXT.md` and `docs/EXECUTION_PLAN.md`.
- This documentation change introduces no runtime architecture or security
  changes. Existing read-only infrastructure and secret-handling constraints
  remain defined in the project context.

## Day 2 alignment (2026-10-23)

- Reuse the existing TypeScript/Node.js and H-MEM starter. An earlier Python
  preference would create a second stack without a demonstrated benefit;
  runtime validation remains required regardless of language.
- `AGENTS.md` is the contributor entry point, `RULES.md` records event notes,
  `PROJECT_CONTEXT.md` owns scope/contracts, and `EXECUTION_PLAN.md` owns
  milestones, verification evidence and blockers. Keep progress in one place.
- Day 2 prioritizes a bounded, evidence-dependent investigation over Zetaris,
  an approved model call, Meterless context persistence, and explicit failure
  behavior. Static files and connectivity probes do not prove integration.
- Use the same five observation statuses across context and plan, including
  `no_match`; absence of records never proves absence of dependencies. Unknown
  savings are `null`, matching the report contract.
- Hypothesis rejection, scenario evaluation and decision traces are required
  project deliverables. A UI is optional; the demo, slides and submission are
  required. Starter examples and a different upstream rubric do not expand scope.
- Event rules were aligned from local notes only. Portal requirements and
  sponsor/model availability still need independent verification.

## Approved optimization-first MVP and architecture (2026-10-23)

**Team-confirmed product change:** The former primary user question, “why did EC2 costs increase between two periods?”, is **superseded** by “suggest safe EC2 optimization opportunities.” This is a deliberate product-scope change under Track 02, not a claim that the previous workflow has been implemented. No baseline, two billing snapshots, or previous run is a prerequisite. Billing still supports spend prioritization and qualified savings.
- User: infrastructure/platform engineer seeking actionable, safe decisions about EC2. The agent discovers **up to three candidates within a specified AWS account and region**, focusing exclusively on **off-hours scheduling**. Keep the investigation and all infrastructure access read-only.
- Every candidate's proposed shutdown hypothesis requires a **targeted disconfirming check**: utilization peaks, jobs, dependency/availability constraints and schedules. Missing critical evidence triggers another bounded query then `needs_verification`, not a dangerous positive verdict. If fresh evidence contradicts a window, **reject** that window and show the revision.
- Produce a **detailed report** with reasons, current citations, rejected hypotheses, operational risks, missing checks, proposed UTC windows where supportable, deterministic marginal compute savings or `null`, approval requirements and decision trace. Support status-specific bounded failures without inventing completion.
- Four flows were approved: **A** conditional supported off-hours window; **B** initially attractive window rejected after contradictory evidence; **C** justified continuous operation _or_ insufficient evidence (distinct verdicts); **D** subsequent investigation using structured history and semantic memory while rechecking live evidence. B is the first vertical slice; D demonstrates distinct sponsor value.

**Corrected data roles:** Current inventory, billing, metrics, jobs/changes and dependencies come from **Zayan's direct TypeScript tools/APIs**. Those adapters are still being developed; labeled mocks are permitted first. They are not proven live by earlier discussion of data available through Zetaris.
- **Zetaris:** compact, scope-aware structured historical observations and investigation decisions for **comparison across runs**. Team explicitly approved _narrowly scoped historical-record writes through Zetaris_ on Oct 23. This supersedes the previous absolute Zetaris read-only policy **only for a dedicated, validated, least-privilege append-only history operation**. AWS access remains entirely read-only. No arbitrary SQL, general Zetaris writes, updates/deletes or AWS mutations are authorized. Validate support and access before implementing; the approved exception is not proof of a working store.
- **Meterless H-MEM:** timestamped reasoning memory: past hypotheses, why opportunities failed, risks and unresolved verification tasks, with provenance/relevance. Use recalled context to prioritize **fresh** queries. Don't duplicate raw telemetry or the full structured Zetaris history. A memory record's confidence is not current operational evidence.
- **Distinct sponsor value:** In a later run, Zetaris answers what was recorded previously and allows typed historical comparison, while Meterless answers what was learned and which concern to check first; direct tools determine present safety. A first run succeeds with both historical stores empty. Failure of either history service should be disclosed and must not be falsely treated as successful persistence.

**Security reconciliation:** The earlier `AGENTS.md` and product notes described both AWS and Zetaris as read-only because Zetaris previously only queried current evidence. That absolute Zetaris restriction conflicts with the new team-approved history append exception. Update those documents together; preserve no infrastructure mutations, allowlisted tools, strict input validation, least privilege, and no model-authored SQL. A narrow history write is not authority to change AWS resources.

**Unverified and proposed details:** Historical append/read support in the actual Zetaris environment, H-MEM run-specific store/retrieve, approved NVIDIA model access, the direct API adapters, and source-level operational coverage require executed proof. Proposed 28-day UTC lookback, ranking strategy, initial call budgets and CLI flags are implementation defaults, not externally verified requirements. Use measured evidence before finalizing them.

**Documentation alignment only:** This note captures agreed decisions, not completed features, sponsor proof, code modifications or test results. The executable gates, exact commands and blockers belong in `docs/EXECUTION_PLAN.md`.

## First working investigation slice rationale (2026-10-23)

- Keep a single rejection-first engine: deterministic code owns scope, candidate ranking, current-evidence registration, hypotheses and verdicts; a planner chooses the next question. The offline scripted planner exists for reproducibility and is never labeled a model. No positive recommendation or savings formula is needed to prove the initial unsafe window was rejected.
- Runtime validation sits at request/action, tool observation and final report boundaries. Exact fields and bounded collections prevent accidental raw-provider payload retention. A conflict citation must resolve to current-run evidence retrieved after the hypothesis; history IDs remain a separate concept.
- Model generation requests a small action-name/reason choice. The NVIDIA adapter binds trusted account/region, period, selected instance and observed metric-window IDs. Asking the model to repeat all arguments created malformed outputs without adding reasoning value. Executor-shaped trace objects are omitted from model context so it does not imitate the wrong wire shape; attempted tool names still include failures. The executor continues to validate every bound action independently.
- Fixed NVIDIA endpoint and one documented allowlisted model avoid arbitrary credential destinations or speculative provider frameworks. Native fetch plus existing tsx suffice. Model failure is explicit and never silently becomes scripted success. Exact event-model approval and successful access are separate claims.
- Tool/runtime/planner budgets count attempts, not only successful responses; timeouts cancel cooperative adapters and bound waiting for noncooperative ones. Repetition terminates rather than retrying without new facts. Missing or non-authoritative evidence cannot clear safety; every savings value remains null.
- H-MEM uses the checked-in local reference, scoped hashed directories and compact timestamped reasoning summaries, separate from the inherited notebook state. The reference is single-writer JSON storage, not a hosted service. Validate reads and fail closed after a persistence failure so a failed append cannot be recalled from the same mutated in-memory engine. Its standalone store/reload/query proof does not imply warm investigation planning.
- Do not guess a Zetaris append schema or SQL endpoint from the old generic connectivity helper. The write exception requires a verified dedicated history contract and permissions; absent access is a blocker, not permission to invent a live adapter. First-run reports remain useful without either history service.
- Retain npm and its lockfile. Add only development compiler/types for reproducible investigation checks. A separate extending TypeScript config isolates this product slice from the inherited optional Anthropic notebook dependency; the original root config and notebook behavior stay intact. The shared H-MEM loader throws on missing engine instead of terminating its host process, allowing callers to sanitize and contain that failure.

## Configurable providers and environment loading (2026-10-23)

- User explicitly requested arbitrary OpenAI-compatible models/providers. This supersedes the fixed NVIDIA endpoint/model allowlist decision above. One shared Chat Completions planner owns transport and response validation; the legacy NVIDIA planner is a preset. Trusted local environment configuration selects the endpoint, while untrusted model output still cannot select destinations, arguments or verdicts.
- Native Node 24 `.env` loading avoids another production dependency and preserves shell precedence. Generic LLM settings never borrow NVIDIA credentials; redirects are refused, remote endpoints require HTTPS, and loopback HTTP supports local models. Provider-specific parameters are optional and cannot replace invariant request fields.
- Zetaris credentials are already present in `.env`. The previous absence claim checked only process environment and was incorrect. Config presence is separate from secure transport, SQL success and authorized history permissions. The configured HTTP endpoint cannot be probed with credentials without explicit authorization; automatic review rejected that transmission. Keep HTTPS required and do not invent a history schema or expose generic SQL to the model.

## Authorized HTTP and manual integration checks (2026-10-23)

- User explicitly authorized this Zetaris HTTP connection. Supersedes the transport blocker above: support it only with `ZETARIS_ALLOW_HTTP=true`; HTTPS remains the default and redirects stay refused. No secret-file edit is needed; use a command-local setting or let the user configure `.env`.
- User will run the live LLM access test manually. Keep it in `tests/integration`, exposed by `npm run test:integration`, outside the normal offline test glob. Reuse the production planner boundary for one real call, validate the returned action, and never execute a tool in the access test. The test explicitly enables TLS verification even if the surrounding development shell disables it.
- User delegated the history-storage choice and needs practical guidance. Prefer an isolated local lakehouse on an administrator-confirmed durable Zetaris directory for this hackathon, or an existing writable JDBC table. Do not invent a remote path, change demo datasets or deploy new AWS infrastructure. History remains a compact prior-decision store, separate from current AWS facts. Append-only semantics require verified effective permissions and a narrow application operation, not just an INSERT privilege label.

## Confirmed local Zetaris history storage setup (2026-10-23)

- User confirmed that provisioning under `/home/zetaris/customer-data/shared/cci-history` works. The supplied deployment restricts local file access via `ZETARIS_LOCAL_FILE_SYTEM_ROOT_PATH=/home/zetaris/customer-data/shared`; a sibling inside the same Docker volume is not sufficient. This supersedes earlier generic path suggestions.
- Keep the required deployment procedure in `docs/ZETARIS_HISTORY.md`, linked from README: create the subdirectory on the existing shared named volume, use the configured service group (1001 in this deployment), verify driver/API write access and register `CCI_HISTORY`. Directory mode 2770 preserves shared-group inheritance without opening access to other users. No new service or volume is needed. User-confirmed lakehouse creation does not establish history schema, restricted permissions or append/read integration.

## Zetaris auth and dedicated history boundary (2026-10-23)

- User requested a dedicated app username/password and `.env` setup and confirmed the `CCI_HISTORY` lakehouse exists with no table. The app connects through the deployed Web UI origin, never the remote disk directory; the registered three-part table owns the storage mapping.
- Same-origin public UI source verified `/api/auth/login`, the username/password JSON body and idToken/orgId response handling. Reuse that route rather than inventing generic Basic Auth or a legacy REST login. Password configuration must never silently fall back to an old administrator bearer token; orgId may be discovered from login or pinned to an expected value. No token persistence or hidden login/write retry.
- A compact v1 structured history table keeps scope, original UTC window, verdict, source mode and bounded scheduling/evidence/missing-check data. It differs from H-MEM's narrative reasoning summary; neither supplies current facts. Validate the dedicated history schema before data access and return separately labeled historical context IDs. App SQL is fixed read/append only; environment targets are restricted to CCI_HISTORY and values are encoded as UTF-8 hex to avoid quote/backslash mode ambiguity. No model SQL or infrastructure changes.
- Appends require explicit enablement and exact readback, with no automatic retries after an uncertain INSERT. Stable run/candidate IDs allow an exact existing record to be reused by a single writer; the pre-read is not an atomic lock and does not establish concurrent idempotency on Iceberg. Provisioning SQL runs separately as admin; the app never creates tables or grants itself access. Adapter/probe availability does not imply automatic CLI persistence or warm-history planning.

## AWS adapter handoff (2026-10-23)

- User relayed Milad's confirmation: AWS tools fetch/return evidence only; Milad owns Zetaris persistence. Keep the collector and both historical stores separate. No AWS writes or implicit persistence from evidence retrieval.
- Preserve the current shared `Observation` contract unchanged. Project detailed collector records into the five exact tool names via `aws-agent.ts`; runtime-validate that boundary and keep richer source records available through the collector interface. Do not reintroduce the superseded preliminary `Evidence` wire format to the agent.
- Explicit unavailable responses are preferable to invented CPU summaries, currencies or operational authority. Operations/dependencies remain unconfigured. Account-wide billing is a bounded aggregation of attributable instance costs, never an allocation of account totals; commitments remain unknown.
- The earlier no-commit/push instruction is superseded by the user's explicit approval on Oct 24 to finalize and push AWS tools directly to main. Preserve a local safety snapshot and reconcile only AWS changes onto the latest upstream before committing.
- Milad confirmed a 14-day observation window for the AWS MVP. Default to the last 14 complete UTC days; the mock CLI's separate default remains unchanged until its live-provider integration.

## Warm investigation ownership (2026-10-23)

- `InvestigationHistory` coordinates the existing validated adapters after fresh
  inventory/billing selects a candidate. Zetaris reads are bounded and filtered
  by account/region/instance; H-MEM remains scoped local reference persistence.
  Neither service is required on the first run. Explicit directory/table
  configuration enables recall; only the existing append opt-in enables SQL DML.
- Planner hints contain historical IDs, timestamps, source modes and allowlisted
  query priorities, excluding raw historical text and old evidence citations.
  The newest recalled context prioritizes a previously unqueried dependency
  check; otherwise operations comes first. This uses existing missing-check
  summaries rather than adding another persistent schema or model role.
- Fresh metrics still establish the proposed window; the deterministic evaluator
  and report validator still require newly retrieved current conflicts. History
  IDs remain separate from evidence IDs. Future-dated records are excluded.
- Read statuses and persistence outcomes are independent. A failed append is
  disclosed without retry or changing the current verdict; local store failure
  cannot seed later recall on the same engine. Both services share the remaining
  investigation deadline. Single-writer constraints remain in force.
- This supersedes earlier notes saying CLI warm planning is not implemented.
  Runtime proof and remaining integration gates belong to EXECUTION_PLAN.md.

## Broader A/C, bounded selection and savings rationale (2026-10-23)

- Extend the existing planner/executor/evaluator rather than add roles or a new
  workflow. Shared discovery ranks positive matching compute spend, then each of
  at most three candidates receives isolated current observations and attempt
  history under one total deadline. Finished verdicts survive later failures.
- Empty operations results cannot establish safety. A needs positive, matching
  operations/dependency clearance of owner authority, reviewed calendar and
  recovery readiness for the explicit UTC window and estimate month. All jobs
  overlapping a positive window block it, including noncritical jobs. C's
  continuous-operation dependency is a distinct evidence-supported rejection.
- Share deterministic ranking/safety/savings policy between execution and report
  validation. Positive conclusions and numeric estimates are recomputed at the
  report boundary; candidate identity is bound through metric citations even
  when multiple candidates propose identical UTC windows.
- Use the UTC month following the observation window so the estimate period is
  explicit and reproducible. Require ≥7 days of utilization with ≤5-minute
  aggregation, low average and peaks, complete authoritative discovery and both
  targeted operational checks. These are conservative MVP rules, not universal
  AWS scheduling guarantees; revalidation and human approval remain mandatory.
- An observed compute total ranks candidates but never supplies an avoidable
  hourly price. Numeric estimates currently use only explicit marginal USD
  on-demand rates, known commitment treatment, retained-cost exclusion and
  pricing validity. Subtract calendar exceptions and stop/start overhead, floor
  avoided minutes to billing units, then floor dollars to cents. Other currencies
  remain null until their rounding semantics are modeled. Fixtures are synthetic
  and establish no live AWS prices or scheduling authority.
- Keep existing history schema v1: verdict strings accept conditional outcomes,
  H-MEM accepts supported hypotheses, and each candidate gets one compact summary
  with only shared discovery plus its own current evidence. Union recalled IDs
  across candidates; history remains advisory. No remote schema change is needed.
- This supersedes the earlier rejection-only, one-candidate, always-null-savings
  implementation boundary. Execution proof remains in EXECUTION_PLAN.md.

- Remember aggregate timeout exhaustion explicitly: a scheduled timer may fire
  before Date.now reaches its integer cutoff. That timeout still exhausts the
  shared budget; do not start another candidate or history persistence afterward.

## AWS CLI integration rationale (2026-10-24)

- Reuse Zayan’s `aws-agent.ts` projection and existing evidence provider seam;
  do not add another planner tool registry or route current evidence via Zetaris.
- Evidence and planner selection are independent. User correction on Oct 24 supersedes the initial mock default: use live AWS
  by default and require explicit `--evidence mock` for synthetic/demo runs; reject mock scenarios in AWS mode. Bind the
  supplied account to STS and check configured region before collecting resources.
- Whole UTC days and the 14-day AWS cap belong at CLI parsing, so unsupported
  windows fail before API calls. Preserve mock lookbacks and never silently
  shorten a user-supplied period. Let the executor allow 25 seconds around the
  collector’s 20-second deadline, including bounded billing fan-out.
- Cost Explorer stays opt-in. Unknown billing currency, scheduling authority,
  operations and dependencies stay unknown; no zero-cost or positive-safety
  claims are manufactured. Tests use injected transport, not live credentials.
