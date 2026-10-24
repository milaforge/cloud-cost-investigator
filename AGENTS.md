# Cloud Cost Investigator — Agent Instructions

## Read before work

1. [`docs/RULES.md`](./docs/RULES.md): recorded hackathon requirements, judging criteria and submission materials. The single JSON block is parseable; examples and unrelated ideas are not requirements.
2. [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md): **approved optimization-first product** scope, interfaces, safety invariants, evidence semantics and acceptance criteria.
3. [`docs/EXECUTION_PLAN.md`](./docs/EXECUTION_PLAN.md): current milestone, owners, blockers and executable completion evidence.
4. [`memory.md`](./memory.md): rationale for repository decisions and explicit superseded decisions.

Keep these documents aligned when an agreed decision changes. Rules are locally recorded event notes, not independently verified portal requirements. Resolve discrepancies and material submission conflicts with the team; do not invent requirements. The README and starter code do not override the chosen track or rubric. Never infer completion from a plan, file, or elapsed day.

## Mission and priorities

Build a functional **Track 02 — The Agent That Can Explain Why** entry: discover promising **AWS EC2 off-hours scheduling** opportunities within an engineer-specified account/region, **challenge each proposed shutdown window with current operational evidence**, and issue evidence-backed conditional recommendations, rejections or explicit deferrals. The original EC2 cost-increase/snapshot-comparison workflow was superseded by team decision on 2026-10-23. **Do not require a baseline or previous investigation** to answer the first request.
- Start with a runnable end-to-end TypeScript/Node.js CLI and existing H-MEM starter. Avoid a rewrite or new framework without concrete need and agreement.
- **Current evidence comes from direct validated, read-only TypeScript tools/API adapters owned by Zayan.** Mocks are allowed for development but must be labeled and replaced/verified as access permits. Never claim live API integration from fixture tests.
- **Zetaris owns decision follow-through:** query recommendations, explicit operator decisions, due reviews and attributed outcomes; never use its historical records as planner ordering hints or current evidence. It remains the structured history layer: an allowlisted history query and a **narrowly approved append-only historical-record write**, restricted to a dedicated non-infrastructure data store. Verify real permissions, functionality and read-after-write; no unrestricted SQL, general writes or model-authored SQL.
- **Meterless H-MEM owns reusable investigation lessons:** bind lessons to scope and reuse conditions, preserve historical provenance, and measure benefit against strong fixed check orders including changed evidence and teaching cost. Concise hypotheses and rejected windows support those lessons; storing more snapshots is not itself product value. Recall may prioritize new tool calls but never substitute for fresh facts. Prove real store/retrieve.
- Use an approved model; verify access and demonstrate actual NVIDIA contribution rather than assuming it. Keep one bounded planner → executor → evaluator → replan/finish loop; additional autonomous roles are not required.
- Prioritize a single **scenario B contradiction-first** slice, focused failure tests and sponsor proof, then A/C/D evaluation, detailed CLI report and demo. Cut polish before safety or provenance.
- Do not add multi-cloud, Kubernetes, downsizing, automated remediation, enterprise auth, forecasting, elaborate dashboards or extra agent roles to meet the MVP.

## Current milestone and completion discipline

At the Day 2 kickoff (2026-10-23), use the **Day 2 section and gates** in [`docs/EXECUTION_PLAN.md`](./docs/EXECUTION_PLAN.md), carrying unfinished Day 1 prerequisites forward. This is a dated checkpoint, not a permanent instruction to remain on Day 2. Advance the active milestone only after executable evidence is recorded.

For each nontrivial task:
1. Identify the active gate, owner and smallest useful slice.
2. Trace existing behavior/invariants before editing and preserve concurrent work.
3. Implement and run the smallest relevant proof, including the failure path.
4. Update the execution checklist **only for verified work**, with command, result, integration mode, owner, blocker and next action.
5. Report changes, affected files, checks run, limitations and remaining work.

Keep rationale in `memory.md`; keep task status and integration proof in `docs/EXECUTION_PLAN.md`. Do not create another progress tracker.

## Non-negotiable invariants

- **AWS is entirely read-only**; no stopping, resizing or other infrastructure writes. Current-evidence tools are read-only. The sole permitted non-infrastructure exception is narrowly authorized, append-only Zetaris investigation-history persistence with schema/permission validation. Do not expose generic Zetaris SQL or unrestricted write tools to the model.
- Runtime-validate external data and model/tool output; TypeScript interfaces alone do not validate data. Preserve account/region/resource scope, UTC observation windows, collection times, units, coverage, source modes, provenance and evidence IDs.
- Keep `ok`, `no_match`, `partial`, `unavailable` and `error` distinct. Missing data is unknown, not zero or proof that jobs/dependencies do not exist.
- Low average CPU or a `dev` tag does not establish scheduling safety. Challenge each candidate with peaks, jobs, dependencies and other relevant operational constraints; defer if critical evidence or authority is unknown.
- Compute savings deterministically only with adequate billing, schedule, currency, pricing/commitment and retained-resource assumptions; unsupported estimates are `null`.
- Zetaris historical records and H-MEM memory are **timestamped historical context**, not current telemetry. Every factual current conclusion cites evidence actually retrieved through direct tools **during the investigation**. Historical context IDs must be labeled separately.
- Bound model/tool calls, retries, timeouts, query sizes and total runtime. When exhausted or unavailable, return an explicit partial/uncertain result rather than looping or fabricating safety claims.
- Never modify infrastructure. Any eventual remediation needs human review/approval.
- Never commit or expose credentials, sensitive AWS exports, raw provider responses containing secrets, or private endpoints in logs, screenshots, fixtures or reports.

## Definition of a finished entry

The release checklist in `docs/EXECUTION_PLAN.md` is authoritative. It must include:
- Reproducible **A/B/C** safety scenarios with a real evidence-driven initial-hypothesis rejection in **B**, **D** second-run history/memory proof, and missing-source/failure handling.
- Genuine direct-evidence tool provenance, Zetaris history query/authorized append, Meterless H-MEM store/retrieve, an approved model call, valid citations and measured evaluation. Sponsor integrations must be genuine and accurately labeled; mocks are not substitute proofs.
- A clean-checkout CLI run, project-specific README/setup, accurate Cursor/NVIDIA documentation, slides, sponsor explanation and a **1–4 minute** demo.
- Target freeze Oct 26; submit before **2026-10-27 23:45 UTC** according to recorded event notes, subject to portal verification. A readable CLI and trace are sufficient; a dashboard is optional and deprioritized.

## Engineering practices

Prefer the smallest safe reversible change and installed dependencies; ask before adding production dependencies. Follow existing package-manager conventions; prefer pnpm or uv when compatible. Work in the current branch/worktree. Run relevant checks and distinguish pre-existing failures from new failures. Do not access unrelated sensitive files, modify secrets, perform destructive operations, or commit/push without authorization. Do not put “Codex” in commit or PR titles.

Use `security-review` for security-sensitive changes, `architecture-review` for structural design changes, `context7-docs` for current library/API docs, and `codegraph-navigation` when a repository index is available.

## Configuration inspection

Load the intended project `.env` before concluding that credentials are absent; process environment alone does not establish file configuration. Inspect only required key presence and safe metadata, never values. Preserve existing shell-variable precedence and never print credentials or private endpoints.

Validate model API protocol compatibility separately from model names and credentials: this planner uses Chat Completions; a Codex backend or Responses-only route is not automatically compatible. Do not guess alternate credential destinations. For remote Zetaris local storage, require the server-visible persistent directory; creating a local workspace folder does not provision remote storage.

Before recommending a Zetaris local storage path, inspect the configured filesystem access root as well as volume mounts. A writable mounted parent directory does not establish that application path validation allows every subdirectory. In the supplied deployment, `ZETARIS_LOCAL_FILE_SYTEM_ROOT_PATH` is `/home/zetaris/customer-data/shared`; UI picker paths may additionally be relative to that root and need separate verification.
