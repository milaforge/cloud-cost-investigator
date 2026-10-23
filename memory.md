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
