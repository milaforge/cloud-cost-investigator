# Cloud Cost Investigator — Agent Instructions

## Read before work

1. [`docs/RULES.md`](docs/RULES.md): recorded hackathon requirements, judging criteria and submission materials. The single JSON block is parseable; examples and unrelated ideas are not requirements.
2. [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md): **approved optimization-first product** scope, interfaces, safety invariants, evidence semantics and acceptance criteria.
3. [`docs/EXECUTION_PLAN.md`](docs/EXECUTION_PLAN.md): current milestone, owners, blockers and executable completion evidence.
4. [`memory.md`](memory.md): rationale for repository decisions and explicit superseded decisions.
5. [`the_bar.md`](the_bar.md): team-adopted implementation and submission quality bar. Apply its recommendations to the existing architecture; illustrative agents, technology roles, trace fields and fallbacks are not mandatory designs.

### First run for coding agents

Claude, Codex and other coding agents should follow
[`docs/HOW.md#ai-agent-clean-checkout`](docs/HOW.md#ai-agent-clean-checkout)
for the ordered clean-checkout procedure, expected results and human-approval
boundaries. That procedure starts with synthetic evidence and scripted planning;
a setup/validation request alone does not authorize paid inference, live account
access or retained remote writes. Existing explicit task authorization remains
valid; do not request it again. Do not run `npm run setup` for first installation:
H-MEM is already vendored and that command refreshes it from upstream.

Keep these documents aligned when an agreed decision changes. Rules are locally recorded event notes, not independently verified portal requirements. Resolve discrepancies and material submission conflicts with the team; do not invent requirements. The README and starter code do not override the chosen track or rubric. Never infer completion from a plan, file, or elapsed day.

## Mission and priorities

Build a functional **Track 02 — The Agent That Can Explain Why** entry: discover promising **AWS EC2 off-hours scheduling** opportunities within an engineer-specified account/region, **challenge each proposed shutdown window with current operational evidence**, and issue evidence-backed conditional recommendations, rejections or explicit deferrals. The original EC2 cost-increase/snapshot-comparison workflow was superseded by team decision on 2026-10-23. **Do not require a baseline or previous investigation** to answer the first request.
- Start with a runnable end-to-end TypeScript/Node.js CLI and existing H-MEM starter. Avoid a rewrite or new framework without concrete need and agreement.
- **Current evidence comes from direct validated, read-only TypeScript tools/API adapters owned by Zayan.** Mocks are allowed for development but must be labeled and replaced/verified as access permits. Never claim live API integration from fixture tests.
- **Zetaris owns decision follow-through:** query recommendations, explicit operator decisions, due reviews and attributed outcomes; never use raw historical records as planner ordering hints or current evidence. Applicable outcome feedback may teach H-MEM only through validated links and allowlisted checks; operator prose never becomes planner instructions. It remains the structured history layer: an allowlisted history query and a **narrowly approved append-only historical-record write**, restricted to a dedicated non-infrastructure data store. Verify real permissions, functionality and read-after-write; no unrestricted SQL, general writes or model-authored SQL.
- **Meterless H-MEM owns reusable investigation lessons:** bind lessons to scope and reuse conditions, preserve historical provenance, and measure benefit against strong fixed check orders including changed evidence and teaching cost. Concise hypotheses and rejected windows support those lessons; storing more snapshots is not itself product value. Recall may prioritize new tool calls but never substitute for fresh facts. Prove real store/retrieve.
- Use an approved model; verify access and demonstrate actual NVIDIA contribution rather than assuming it. Keep one bounded planner → executor → evaluator → replan/finish loop; additional autonomous roles are not required.
- Prioritize a single **scenario B contradiction-first** slice, focused failure tests and sponsor proof, then A/C/D evaluation, detailed CLI report and demo. Cut polish before safety or provenance.
- Do not add multi-cloud, Kubernetes, downsizing, automated remediation, enterprise auth, forecasting, elaborate dashboards or extra agent roles to meet the MVP.

## Current milestone and completion discipline

Use the active milestone, owner, status table and release gates in [`docs/EXECUTION_PLAN.md`](docs/EXECUTION_PLAN.md), carrying unfinished prerequisites forward. Linked receipts under `docs/history/` preserve prior execution evidence; they do not override current defaults or blockers. Advance the active milestone only after executable evidence is recorded.

For each nontrivial task:
1. Identify the active gate, owner and smallest useful slice.
2. Trace existing behavior/invariants before editing and preserve concurrent work.
3. Implement and run the smallest relevant proof, including the failure path.
4. Update the execution checklist **only for verified work**, with command, result, integration mode, owner, blocker and next action.
5. Report changes, affected files, checks run, limitations and remaining work.

Keep rationale in `memory.md`; keep task status and integration proof in `docs/EXECUTION_PLAN.md`. Do not create another progress tracker.

## Non-negotiable invariants

- CCI controls recommendations, not shutdown authority. Scope verdict wording to the evaluated window; a rejected window is not a blanket instruction to keep the instance running. Preserve conditional recommendation, evidence-backed rejection and insufficient-evidence deferral as distinct outcomes. Only an authorized human can approve an infrastructure change.
- Web startup must serve the UI without running synthetic investigations. Generate previews only on explicit selection and keep Live setup independent of preview delays.
- Web Live investigations use the configured model and automatically read Zetaris history when configured. Read AWS scope from server `.env` (`AWS_EXPECTED_ACCOUNT_ID`, `AWS_REGION`, `CCI_MAX_CANDIDATES`, 1–3, default 1); do not show a Live configuration section or scope/planner/history controls. Clicking Run investigation authorizes the live read/model run; validate settings server-side before worker startup and use the existing toast to request `.env` fixes and a restart of `npm start`. Preserve shell precedence, separate decision-write acknowledgment and credential privacy.
- **Live AWS evidence is the CLI default.** Synthetic/demo investigations require explicit `--evidence mock`; never silently fall back to mocks.
- **AWS is entirely read-only**; no stopping, resizing or other infrastructure writes. Current-evidence tools are read-only. The sole permitted non-infrastructure exception is narrowly authorized, append-only Zetaris investigation-history persistence with schema/permission validation. Do not expose generic Zetaris SQL or unrestricted write tools to the model.
- Runtime-validate external data and model/tool output; TypeScript interfaces alone do not validate data. Preserve account/region/resource scope, UTC observation windows, collection times, units, coverage, source modes, provenance and evidence IDs.
- Keep `ok`, `no_match`, `partial`, `unavailable` and `error` distinct. Missing data is unknown, not zero or proof that jobs/dependencies do not exist.
- Execution-event UI shows status icons without inline status text; expose the label through an accessible tooltip on hover, keyboard focus or click. `partial` is an amber evidence-gap warning, `no_match` is a neutral empty result, and only `unavailable`/`error` use red failure marks. Never replace all non-`ok` statuses with an indistinguishable cross.
- The web UI's global Demo mode is preview-only across Investigate, Learn and Follow through. Keep all three tabs available in both modes. Hide full live-operation sections and block their handlers in Demo: no run, owner-input, upload, paid-model or remote-write controls. Live must not offer synthetic demonstrations as real operations. Verify every tab and ancestor visibility, not only scenario/preview widgets; clearly state unavailable live capabilities instead of inventing them.
- Show Stop run only for a confirmed running job and Execution events only when events exist. Validation failures use the existing toast and focus the required input; they must not create an apparent running state.
- CLI text defaults to concise, verdict-first output. `--verbose` exposes comprehensive evidence, citations, checks, trace and history; preserve source-mode labels, window-scoped verdicts, uncertainty and human approval in the concise view. `--verbose`, `--json` and `--trace-jsonl` are mutually exclusive; output modes never change investigation policy or exit codes.
- Run initial EC2 inventory discovery automatically through the executor before the first planner call; give the planner its validated result. Empty inventory finishes without calling the model; failed discovery stops before the model. Establish usable EC2 inventory before billing. If required inventory or billing discovery is unavailable, errors, times out or fails validation, retry the same read-only call up to three times after the initial attempt within the call/runtime caps, then stop with a named tool failure and exit 1; do not advance to another planner decision or tool. Invalid scoped data and cancellation remain terminal. Valid partial inventory remains usable, and authenticated empty inventory is a successful no-candidate result. Operational evidence gaps still defer safety rather than invent it.
- Low average CPU or a `dev` tag does not establish scheduling safety. Challenge each candidate with peaks, jobs, dependencies and other relevant operational constraints; defer if critical evidence or authority is unknown.
- Compute savings deterministically only with adequate billing, schedule, currency, pricing/commitment and retained-resource assumptions; unsupported estimates are `null`.
- Zetaris historical records and H-MEM memory are **timestamped historical context**, not current telemetry. Every factual current conclusion cites evidence actually retrieved through direct tools **during the investigation**. Historical context IDs must be labeled separately.
- Bound model/tool calls, retries, timeouts, query sizes and total runtime. One investigation must use a maximum 15-minute total budget, at most 60 seconds per model call, and a report finalization reserve. History waits and pacing share the deadline; preserve completed findings and defer unresolved candidates on exhaustion. Do not multiply the aggregate deadline by call count. When exhausted or unavailable, return an explicit partial/uncertain result rather than looping or fabricating safety claims.
- Retry transient planner unavailability with bounded exponential backoff within existing call/runtime budgets; retain every failed attempt. Keep permanent errors, invalid output and cancellation terminal. Send frequent active-step/wait updates to the UI; heartbeats must not displace execution history. Planner recovery never replays tools or historical writes. The executor separately owns up to three retries of a failed read-only evidence action (four attempts total), with every attempt traced and budgeted. See [recovery bounds](docs/CLI_GUIDE.md#planner-recovery-and-live-progress).
- Never modify infrastructure. Any eventual remediation needs human review/approval.
- Never commit or expose credentials, sensitive AWS exports, raw provider responses containing secrets, or private endpoints in logs, screenshots, fixtures or reports.

## Definition of a finished entry

The release checklist in `docs/EXECUTION_PLAN.md` is authoritative. It must include:
- Reproducible **A/B/C** safety scenarios with a real evidence-driven initial-hypothesis rejection in **B**, **D** second-run history/memory proof, and missing-source/failure handling.
- Genuine direct-evidence tool provenance, Zetaris history query/authorized append, Meterless H-MEM store/retrieve, an approved model call, valid citations and measured evaluation. Sponsor integrations must be genuine and accurately labeled; mocks are not substitute proofs.
- A clean-checkout CLI run, project-specific README/setup, accurate Cursor/NVIDIA documentation, slides, sponsor explanation and a **1–4 minute** demo.
- Target freeze Oct 26; submit before **2026-10-27 23:45 UTC** according to recorded event notes, subject to portal verification. A readable CLI and trace are sufficient; a dashboard is optional and deprioritized.

## Documentation hierarchy

Begin the root `README.md` with the project name and mandatory hackathon participation, then answer **What** immediately. Follow the user-adopted practical README structure: problem, actual agent responsibilities and feedback, stack and sponsor roles, runnable setup/usage, sample mode, failure handling, data/licensing, limitations and pre-existing components. This supersedes the earlier ten-line cap and root-link restriction. Keep it concise through specific examples and links; distinguish offline prerequisites from service-dependent features and never copy illustrative agents, fallbacks or unverified development claims. `docs/HOW.md` owns full setup; `docs/components.md` owns detailed architecture and sponsor proof. Verify public repository visibility before claiming that submission requirement passed. Give each detailed topic one canonical home; summarize at the root and link to full procedures, contracts, learning mechanisms and measurements. Use consistent What / Why / How navigation. Keep current progress only in `docs/EXECUTION_PLAN.md`; dated receipts under `docs/history/` are historical evidence, never competing instructions. Preserve the recorded rules JSON and failed measurements.

## Submission quality bar

Visitor-facing agent diagrams should foreground dynamic choices and feedback
with explicit decision notation. Show Zetaris through its useful decision
follow-through and validated outcome-learning scenarios; describing it only as
optional history obscures its role. Present it as a primary component for
long-term improvement, with the durable decision record feeding validated
outcome learning through H-MEM. Preserve the separation of historical
context, learned check priorities and fresh evidence.

Keep the demo UI verdict-first, lean and concise: show the shutdown disposition,
then the evidence-driven steps with honestly labeled timestamps. Put complementary
detail behind accessible info controls or disclosures. Use green/red/amber with
text labels; never hide conditional approval or turn missing evidence into safety.
Start with no scenario or report selected. Loading a preview or prior completed
result requires an explicit user choice; changing scenarios clears stale output.

Implementation and documentation must make the real user, useful decision, role authority, shared state, evidence-driven revision and failure behavior easy to verify. Show exact runnable commands, captured output/trace, explicit integration modes, sponsor contributions and reused components. Keep architecture in `docs/components.md`, trace interpretation in `docs/CLI_GUIDE.md`, and the demo/deck narrative in `docs/DEMO.md`; record unfinished quality-bar gates only in `docs/EXECUTION_PLAN.md`.

Do not copy the example's six-agent architecture, Meterless model routing, automatic sample fallback or invented confidence scores. Every new report trace step must carry its actual emission `timestamp`, run-correlating `trace_id`, evidence-derived categorical `confidence` and actual zero-based `retry_count`. The readable JSONL view uses numeric `confidence`: complete authoritative evidence checks divided by the five required checks for the current instance, counting only already retrieved evidence. It preserves categorical support as `evidence_support`. Coverage is not a probability of safety and never controls verdicts. Do not invent historical timestamps, scores or counters. Preserve this project's bounded loop, direct current-evidence tools, historical-store separation and explicit mock opt-in. A scripted fixture proves policy behavior; genuine model collaboration and sponsor calls require separately labeled execution evidence. Slides and a storyboard do not prove a recorded video or a finished submission.

## Engineering practices

Prefer the smallest safe reversible change and installed dependencies; ask before adding production dependencies. Follow existing package-manager conventions; prefer pnpm or uv when compatible. Work in the current branch/worktree. Run relevant checks and distinguish pre-existing failures from new failures. Do not access unrelated sensitive files, modify secrets, perform destructive operations, or commit/push without authorization. Do not put “Codex” in commit or PR titles.

Use `security-review` for security-sensitive changes, `architecture-review` for structural design changes, `context7-docs` for current library/API docs, and `codegraph-navigation` when a repository index is available.

## Configuration inspection

Load the intended project `.env` before concluding that credentials are absent; process environment alone does not establish file configuration. Inspect only required key presence and safe metadata, never values. Preserve existing shell-variable precedence and never print credentials or private endpoints.

Do not diagnose Cost Explorer `AccessDeniedException` as a missing IAM grant from its name alone. Verify the intended caller and distinguish policy denial from Cost Explorer enablement and organization/member-account access using bounded, sanitized diagnostics. Billing-console "Activate IAM Access" does not control Cost Explorer SDK API access. Do not broaden permissions or enable billing features automatically.

Validate model API protocol compatibility separately from model names and credentials: this planner uses Chat Completions; a Codex backend or Responses-only route is not automatically compatible. Do not guess alternate credential destinations. For remote Zetaris local storage, require the server-visible persistent directory; creating a local workspace folder does not provision remote storage.

Before recommending a Zetaris local storage path, inspect the configured filesystem access root as well as volume mounts. A writable mounted parent directory does not establish that application path validation allows every subdirectory. In the supplied deployment, `ZETARIS_LOCAL_FILE_SYTEM_ROOT_PATH` is `/home/zetaris/customer-data/shared`; UI picker paths may additionally be relative to that root and need separate verification.
