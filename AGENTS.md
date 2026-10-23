# Cloud Cost Investigator — Agent Instructions

## Read before work

1. [`docs/RULES.md`](./docs/RULES.md): recorded hackathon requirements,
   judging criteria, and submission materials. The single JSON block is parseable;
   examples and unrelated ideas are not project requirements.
2. [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md): chosen product,
   scope, interfaces, safety invariants, and acceptance criteria.
3. [`docs/EXECUTION_PLAN.md`](./docs/EXECUTION_PLAN.md): active milestone,
   owners, blockers, and evidence of completion.
4. [`memory.md`](./memory.md): rationale for repository decisions.

Keep these documents aligned when an agreed decision changes. Rules are event
notes, not independently verified portal requirements. Record discrepancies and
resolve material scope or submission conflicts with the team; do not silently
invent requirements. The README and starter code do not override the selected
track or rubric. Never infer completion from a plan, file, or elapsed day.

## Mission and priorities

Build a functional, robust **Track 02 — The Agent That Can Explain Why** entry:
explain increased **AWS EC2** costs using billing, utilization, inventory, and
operational changes, and qualify whether reductions are safe. Deliver a
read-only investigation report with evidence and a visible decision trace.

- Start with a runnable end-to-end CLI. Reuse the TypeScript/Node.js starter and
  H-MEM integration; avoid a language migration or framework rewrite without a
  concrete need and team agreement.
- Use real Zetaris queries and Meterless store/retrieve operations. Label fixtures,
  stubs, historical context, and live telemetry accurately. Use an approved model;
  verify access and demonstrate NVIDIA's contribution rather than assuming it.
- Implement a single bounded planner → executor → evaluator → replan/finish loop.
  Dynamic delegation in the rules is an example, not a requirement for many agents.
- Prioritize sponsor integration and a reliable investigation, then contradiction
  handling and scenario evaluation, then a trace viewer and polish. Build failure
  handling and focused tests alongside each slice.
- Do not add multi-cloud, Kubernetes, automatic remediation, enterprise auth,
  forecasting, elaborate dashboards, or extra autonomous roles to meet this MVP.

## Current milestone and completion discipline

At the Day 2 kickoff (2026-10-23), use the **Day 2** section and kickoff gates in
[`docs/EXECUTION_PLAN.md`](./docs/EXECUTION_PLAN.md). This is a dated checkpoint,
not a permanent instruction to remain on Day 2. Advance the active milestone only
when its gate has executable evidence, carrying unfinished prerequisites forward.

For each nontrivial task:

1. Identify the current acceptance gate, owner, and smallest useful slice.
2. Trace existing behavior and invariants before editing. Preserve concurrent work.
3. Implement and run the smallest relevant proof, including the failure path.
4. Update the execution checklist only for verified work. Record the command,
   result, integration mode, and any blocker with owner and next action.
5. Report changes, affected files, checks run, limitations, and remaining work.

Keep decision rationale in `memory.md`; keep task status and integration proof in
`docs/EXECUTION_PLAN.md`. Do not duplicate a second progress tracker.

## Non-negotiable invariants

- AWS and Zetaris access is read-only. Expose only validated, allowlisted tools;
  never pass model-authored SQL to an unrestricted query function.
- Validate external data and model/tool outputs at runtime; TypeScript interfaces
  alone do not validate them. Preserve account/region/resource scope, UTC periods,
  units, coverage, provenance, and evidence IDs through the report.
- Keep `ok`, `no_match`, `partial`, `unavailable`, and `error` distinct. Missing
  data is unknown, not zero or proof that jobs/dependencies do not exist.
- Low average CPU or a dev tag does not establish safety. Check peaks, jobs,
  dependencies, and other relevant operational constraints; defer when unknown.
- Compute savings deterministically, with explicit billing, schedule, currency,
  commitment, and retained-resource assumptions. Unsupported estimates are `null`.
- Treat memory as timestamped historical context, not current telemetry. Every
  factual finding cites evidence actually retrieved for the investigation.
- Bound model/tool calls, timeouts, retries, query sizes, and total runtime. Fail
  with an explicit partial/uncertain result rather than looping or fabricating.
- Never modify infrastructure. Any future remediation requires human approval.
- Never commit or expose credentials, sensitive AWS exports, or raw provider
  responses containing secrets in logs, screenshots, fixtures, or reports.

## Definition of a finished entry

The release checklist in the execution plan is authoritative for tracking:

- Reproducible A/B/C scenarios, including a genuine evidence-driven rejection of
  an initial hypothesis in B, and a missing-source/failure path.
- Real Zetaris and Meterless integration evidence, an approved model call, accurate
  Cursor/NVIDIA usage documentation, valid citations, and measured evaluation.
- A fresh-checkout run, project-specific setup/usage/dependencies in the README,
  slide deck, sponsor explanation, and a **1–4 minute** demo.
- Freeze on October 26; submit before **2026-10-27 23:45 UTC**, subject to portal
  verification. A working CLI with a readable trace is sufficient for the surface.

## Engineering practices

Prefer the smallest safe, reversible change and installed dependencies. Ask before
adding production dependencies. Follow existing package-manager conventions;
prefer pnpm or uv when compatible. Work in the current branch/worktree. Run
relevant available checks and distinguish pre-existing failures from new failures.
Do not access unrelated sensitive files, modify secrets, perform destructive
operations, or commit/push without authorization. Do not put “Codex” in commit
or PR titles.

Use `security-review` for security-sensitive changes, `architecture-review` for
structural design changes, `context7-docs` for current library/API documentation,
and `codegraph-navigation` for source discovery when the repository is indexed.
