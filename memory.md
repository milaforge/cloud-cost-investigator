# Project Memory

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
