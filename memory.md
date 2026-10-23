# Project Memory

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
