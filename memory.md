# Project Memory

## Coherent conflict-first presentation (2026-10-26)

- The user defined CCI's useful answer as a specific reason to reject a shutdown window, or exact missing evidence and a deferred decision. Lead README, diagrams, scenarios and slides with that purpose.
- Keep current conditional-clearance examples honestly labeled as broader existing behavior until runtime semantics are resolved; do not rewrite historical traces or pretend complete evidence is missing.
- Show inventory before the first planner call, explicit conflict/gap branches, and accurate preview-only Demo behavior. Scenario B and missing evidence lead the presentation.

## Run-time configuration feedback without a Live settings panel (2026-10-26)

- User correction: remove the entire Live configuration section, including its
  real-service checkbox. Clicking Run investigation authorizes the live read/model
  run; no extra browser acknowledgment is needed for that investigation.
- Validate the server's loaded `.env` configuration at the run boundary. Missing
  or invalid AWS scope/model settings fail before any worker starts; the existing
  toast names the settings to fix and says to restart `npm start`. Preserve shell
  precedence, default candidate limit, read-only AWS and optional read-only history.
- Pending configuration checks may show button loading, but do not reveal a running
  job, Stop button or execution events. Configuration validation is not a network
  connectivity proof. Decision writes retain their separate explicit acknowledgment.
- This supersedes displayed Live scope and the separate investigation service
  acknowledgment in the earlier server-owned settings decision, as well as older
  missing-service-acknowledgment browser guidance.

## Server-owned Live investigation settings (2026-10-26)

- The user removed planner/history choices and editable AWS scope from Live.
  Live means the configured model and automatic read-only Zetaris history when
  configured; missing history is labeled unavailable, never synthetic fallback.
- Reuse `AWS_EXPECTED_ACCOUNT_ID` for the account guard and `AWS_REGION` for
  scope; `CCI_MAX_CANDIDATES` is 1–3 and defaults to 1. Keep CLI flags unchanged.
  Server `.env` loading preserves shell precedence except for `AWS_PROFILE` and `AWS_REGION` at `npm start` (see the superseding decision below). Never migrate the former
  hardcoded browser account into configuration without knowing the intended scope.
- Bind and validate these settings at the HTTP boundary. Browser overrides fail,
  invalid scope starts no worker, and configuration responses expose only validated
  scope/status. Keep append-write safeguards; the newer user correction above
  replaces the investigation acknowledgment with the Run action.
- This supersedes the Oct 24 optional browser Zetaris-recall choice. History
  remains historical context and cannot satisfy fresh-evidence safety checks.

## Live workflow tab prerequisites (2026-10-26)

- Keep Learn and Follow through visible but disabled in Live until a live
  investigation report is selected. Their content depends on that report;
  starting a job or failing without a report does not provide context.
- A validated saved live report also supplies this context. Switching modes
  clears selection and restores the gate; Demo previews keep all tabs enabled.
  Guard navigation handlers as well as native button state. Decision-saving
  eligibility remains governed by the existing completed-recommendation checks.

## Missing web configuration notice (2026-10-26)

- Reuse the environment loader's missing-file result to show setup guidance at
  `npm start`. Suggest copying or renaming `.env.example` and filling required
  service values, without creating a file, printing configuration or blocking
  Demo mode and deployments configured through shell variables.

## Remove browser owner-statement capture (2026-10-26)

- User requested removal of the optional owner-evidence form to simplify the UI.
  It only attached unverified notes to reports and never changed investigation
  policy. Remove capture, submission handlers and unused styles together so
  mode switches and investigation startup do not reference deleted elements.
- This supersedes browser capture in the Oct 25 owner-statements decision.
  Preserve the optional report contract and saved-report display/export for
  compatibility; owner prose still cannot satisfy safety gates, enter planner
  prompts, teach H-MEM or persist to Zetaris.

## Fast missing-evidence preview and visible loading (2026-10-26)

- Demo is an illustration, so selecting Missing evidence should not replay
  real retry backoff. Reuse the existing validated `ec2-3` operations-outage
  report from `docs/ec2-scenarios.jsonl`, preserving original timestamps and
  labeling it Recorded preview. This supersedes generating that preview live;
  real investigation and CLI retry policy remain unchanged.
- Use a visible spinner and loading text in the report area while a preview
  request is pending, alongside existing accessible status/busy attributes.
  Honor reduced motion and clear the indicator on success, error or selection/
  mode changes. Keep failure recovery text instead of a stuck loading panel.

## Web startup without preview work (2026-10-26)

- Serve the shared Demo/Live UI without generating or fetching synthetic
  investigations. Eagerly running all five scenarios made even Live setup wait
  through the missing-evidence scenario's real retry backoff.
- Generate only the selected preview, share pending requests and cache success
  until server restart. Evict failed generation so selection can retry. Preserve
  actual investigation safety and retry policy.
- Late preview responses must not replace another scenario or Live state.
  Scenario selection and preview shortcut buttons use the same loader.

## Shared web entry point (2026-10-26)

- Use `npm start` for the local web UI because it handles both Demo and Live.
  This supersedes the earlier `demo:web` npm command; preserve internal script
  filenames to avoid unnecessary import and test churn. Headless startup uses
  `npm start -- --no-open`.
- Startup still requires an explicit browser action and existing acknowledgments
  before real-service access. The command rename grants no additional authority.

## Practical submission README (2026-10-26)

- The user supplied an eleven-section README template and requested complete,
  specific, practical coverage. This supersedes the earlier ten-line cap and
  root-link restriction. Keep the problem and useful decision first, provide a
  credential-free runnable example, then link to canonical detailed references.
- Adapt the template to the existing bounded loop and actual sponsor roles;
  do not invent autonomous agents, automatic mock fallback, Cursor use or a
  claim that all starter code was authored during the event. Preserve the
  requested collapsed sponsor explanation and synthetic/live proof distinctions.
- Keep current verification and release status in the execution plan. README
  examples illustrate behavior without implying live clearance or submission
  completion. Align contributor guidance so future edits preserve this decision.

## Preview-only Demo and Live operations (2026-10-26)

- User clarified Demo must be preview-only across Investigate, Learn and Follow
  through. This supersedes the earlier mixed service/demo controls and separate
  Follow-through Demo checkbox. Keep all three tabs in both modes.
- Demo scenario selection opens locally generated synthetic/scripted previews;
  Learn and Follow through are explicitly illustrative, without executed proofs.
  No run button, upload, owner form, model control or Zetaris write belongs there.
- Live owns AWS scope/investigation, owner input, live-report import and attributed
  Accept/Defer storage. Live Learn honestly displays selected-report memory status;
  live H-MEM recall/storage are not enabled in the browser investigation path.
  Preserve separate CLI demonstrations rather than disguising them as live flows.
- Enforce mode in handlers as well as full-section visibility. Clear selected
  reports and opt-ins and close evidence on switching; never submit a run.
  Retain validated job source mode before execution so failures, pending jobs
  and synthetic results cannot be misclassified from missing result data.
- Enforce HTML hidden above component display styles. Tests must inspect every
  tab and ancestor visibility, plus negative calls to run/save/upload handlers;
  testing only named demo controls missed entire unclassified live sections.

## Submission slide narrative (2026-10-26)

- `slides.md` owns the eight required slide topics; `docs/DEMO.md` links to it
  and retains the recording storyboard instead of duplicating slide content.
- Center the narrative on a proposed EC2 window disproved by fresh job evidence.
  Keep actual model traces, scripted-policy measurements and live AWS retrieval
  labeled separately. H-MEM's fixed-order tie and teaching cost remain visible.
- Use actual concise CLI output as the product visual in the Markdown deck;
  source links and speaker context sit in expandable notes. Never invent Cursor
  attribution, realized savings or live safety from synthetic demonstrations.

## Concise CLI and explicit detail (2026-10-26)

- The CLI's default presentation is a short verdict-first projection of the
  validated report, keeping source mode, evaluated window, reason, next action,
  unknown savings, sample gaps and human approval visible. Put raw observation
  JSON, full checklists, citations, histories and trace behind `--verbose`.
- Extend the existing renderer with a presentation option. Its programmatic
  default stays comprehensive for existing consumers; the CLI explicitly selects
  concise or verbose output. JSON/JSONL schemas and all investigation behavior
  stay independent of text presentation.
- Reject conflicting or duplicate output flags before retrieval. Use npm's
  `--silent` in CLI examples to suppress its script banner, without changing
  stdout capture or report semantics. Keep detailed CLI usage in the CLI guide.

## Five-minute investigations and short-lived AWS account (2026-10-26)

- The user confirms the live instance has only two days of history. Use the
  existing explicitly selected mock provider for complete seven-day demos;
  never backdate AWS samples, fill absent days or mix synthetic facts into a
  live observation. Keep the seven-day safety minimum and live default.
- The investigation provider owns its 300-second metric default because its
  evaluator rejects hourly aggregation. Preserve explicit provider overrides
  and the standalone collector's existing 3600-second default.
- AWS authentication, permissions and account/data prerequisites now live in
  `docs/AWS_SETUP.md`, linked from HOW and the tools reference. Keep one canonical
  setup guide; old HOW headings remain forwarding links.
- Reuse existing read-only SSM maintenance and ELBv2 registration adapters.
  Successful native reads cannot attest jobs/consumers outside those sources or
  owner/calendar/recovery clearance. No new operational system was identified;
  do not manufacture a supposedly authoritative file or escalate to guest commands.
- Live billing provides ranking costs, not prospective marginal prices. Do not
  mark commitments known or derive future rates from historical spend merely to
  unlock savings. The existing mock pricing/calculator already proves numeric
  behavior; a verified live pricing source and broader operational authority
  remain necessary for positive live proof.

## Cost Explorer denial interpretation (2026-10-25)

- Service `AccessDeniedException` can represent disabled Cost Explorer or
  organization access restrictions as well as missing IAM permission. Verify
  the caller and inspect bounded sanitized reason indicators before suggesting
  wider grants; an error-name-only diagnosis sent the operator to IAM without
  establishing the actual blocker. The reusable procedure lives in `AGENTS.md`;
  live proof and remaining setup work live in `docs/EXECUTION_PLAN.md`.

## Inventory denial is not a shutdown verdict (2026-10-25)

- An unavailable inventory observation may be structurally valid yet contain no
  usable inventory. Trace wording must name the tool, source status and coverage
  gaps rather than describe validation alone. Retain full missing-field details
  in cited evidence and bound repeated trace text to its 400-character contract.
- Surface existing failure codes and discovery recovery actions directly when no
  candidate conclusion exists. `ACCESS_DENIED` requires checking the server-side
  identity/profile and read permission; operator knowledge of workload safety
  does not repair AWS discovery access. A locally inherited profile mismatch is
  a diagnostic lead, not proof of another process's identity. Preserve secret
  redaction, read-only access and all existing recommendation requirements.

## Recommendation boundary regression proof (2026-10-25)

- Protect both operational channels against promotion of incomplete evidence:
  absent clearance, partial/unavailable/error sources and non-authoritative
  observations cannot become recommendations through persuasive report text,
  retrieved citation IDs or an emptied action checklist. The report validator
  independently recomputes policy proof.
- Keep invalid partial payloads outside the current-evidence registry while
  retaining their failed tool attempt. Existing policy and validation rules
  remain authoritative; test proof does not establish live integration.

## Actionable unresolved checks (2026-10-25)

- Keep diagnostic reasons in the scheduling policy beside the checks they
  explain. The same assessment feeds positive proof and unresolved human actions,
  preventing report advice from drifting from recommendation eligibility.
- Retain all existing thresholds, matching operational clearances and current
  evidence requirements. Diagnose missing sources, owner/calendar/recovery gaps,
  expired clearance, overlapping jobs and conflicting clearance details without
  treating an action checklist as evidence or approval.
- An absent accepted observation is "no validated observation", not "not queried":
  invalid or failed attempted calls must not disappear from the explanation.

## Recommendation authority and window scope (2026-10-25)

- CCI is a cost optimization recommendation system, starting with EC2 scheduling.
  Its evaluator controls recommendation eligibility; infrastructure approval stays
  with an authorized human. UI verdicts describe the evaluated window, so a
  rejected schedule cannot become a blanket "keep it running" instruction.
- Low utilization identifies a potential window to investigate. It does not prove
  inactivity. Keep conditional recommendation, a cited conflict and unresolved
  evidence visibly distinct; none grants execution authority.

## Visitor-facing agent diagram (2026-10-25)

- Keep overview diagrams in the README; `docs/components.md` links there and
  retains the responsibility table, shared-state authority and technical details.
  This avoids maintaining another copy of the same architecture overview.

- Emphasize Zetaris as a primary long-term improvement component, visually and
  in labels: its durable decision record connects recommendations, operator
  decisions, due reviews and outcomes to validated H-MEM learning. This describes
  its product role without changing offline execution or evidence authority.

- Keep the requested higher-level diagram alongside the execution view: combine
  execution and shared evidence into one investigation step while retaining
  planner/evaluator decision diamonds, bounded replanning and the Zetaris-to-H-MEM
  outcome-learning path. This reduces visitor effort without inventing new roles.

- User correction: foreground dynamic planner choices with decision diamonds and
  a visibly bounded agentic loop. Explain Zetaris through recommendation
  follow-through and validated rollback-to-H-MEM learning, rather than reducing
  its value to optional history. Raw historical rows still cannot order checks
  or establish current safety. Dotted arrows distinguish cross-run learning and
  persistence from the current investigation flow.

- Show planner choice, deterministic verdict authority and runner-owned shared
  state in the requested README overview. Use the actual bounded replan path;
  illustrative multi-agent retries and automatic sample fallback are not runtime
  features. Samples require explicit mock selection, and CLI traces are emitted
  with the final report to stdout for optional redirection. Detailed architecture
  and trace instructions retain their canonical homes in `docs/components.md`
  and `docs/CLI_GUIDE.md`.

## Focused provider comparison (2026-10-25)

- When conserving model quota, replay each distinct failed planner state once,
  then run the failing end-to-end scenario only if those states pass. Skip
  standalone successful controls; retain all failed attempts and use a separate
  selected-test denominator. Do not combine passes from different providers into
  a full release-gate claim.
- A successful provider/model change localizes compatibility and demonstrated
  behavior, not the cause of an intermittent failure. Model, generation settings
  and measurement time confound provider-only attribution. Reuse the existing
  compatible transport and keep protocol differences explicit in the receipt.

## Diagnosing model-request availability (2026-10-25)

- Record DNS/TLS controls separately from authenticated service reachability and
  actual inference. A healthy catalog request does not prove model availability;
  a successful replay does not explain an earlier timeout.
- Use the optional native diagnostics-channel preload to distinguish request
  transmission, response headers and response completion without touching the
  planner transport. Never print headers, hosts, IPs, credentials, model text or
  exception messages. Keep timing logs optional and correlated with each saved
  CLI report; retain failed measurements when making another instrumented run.
- Pass the observer explicitly with Node's `--import` in each gate child. The
  execution environment removed `NODE_OPTIONS` in the measured invocation;
  synthetic channel events alone did not prove native-fetch instrumentation.
  Verify the actual preload with a local native-fetch success/cancellation test.
- A completed write on a verified TLS socket followed by a wait for headers
  localizes the failure after connection setup. Remote generation, gateway/queue
  behavior and the response network path require further evidence to distinguish;
  do not invent overload, rate limiting or a provider fix from timing alone.

## Repeated real-model gate and generation settings (2026-10-25)

- Use the existing CLI for the A/B/C reliability proof: fresh serial processes,
  three rounds, full retained reports, unique evidence IDs and strict completion
  checks. Matching a safe deferral after a planner failure is not a pass. Keep
  provider diagnostics and prior failed measurements; do not retry into success.
- Generic `LLM_*` configuration intentionally does not inherit model-specific
  NVIDIA preset options. The configured Nemotron 3.5 Super VL can use the
  documented command-local `chat_template_kwargs.enable_thinking=false` option
  for short action JSON. Do not silently apply this option to arbitrary models,
  change credentials or disable TLS. The successful setting alone does not
  establish why an earlier provider request returned HTTP 500.
- This is a real-model proof over synthetic evidence with history disabled;
  live AWS coverage, event eligibility and production reliability remain separate.
  Procedures belong in `docs/evaluation/README.md`, results in the execution plan.

## Browser AWS scope and Zetaris recall (2026-10-24)

- The browser account field binds an investigation to the authenticated AWS account; it is not a credential input. Keep AWS credentials server-side in the SDK provider chain and show only safe issue codes when a source fails.
- Investigation history recall is an explicit, read-only browser option. The existing narrow append capability requires its separate Follow through acknowledgment. Historical records stay context, never current evidence.

## Verdict-first demo presentation (2026-10-24)

- Keep live execution progress visually subordinate to the verdict and evidence
  narrative. Group the existing bounded planner progress by call in an expanded
  plain tree. Replace explicit status words with inline symbols while preserving
  their exact values for accessibility and in source events; leave unknown steps
  unmarked. Other workflow events remain visible without inventing a trace
  schema or per-event timestamps.
- Start unselected so users can see which evidence/verdict/steps their scenario
  choice loads. Clear stale reports when changing scenario/source. Prior completed
  jobs remain explicitly viewable; active-job recovery still avoids resubmission.

- User requested visual restructuring only: the shutdown disposition takes
  priority, followed by a concise evidence timeline. Keep existing workflows,
  data contracts and service acknowledgments. Green means conditional review,
  red rejects the proposed window, and amber defers; color never replaces text.
- Use native Web Animations with reduced-motion support rather than introduce
  a framework or dependency for a small presentation change. Supporting details
  use hover/focus/tap info controls and disclosures; evidence remains inspectable.
- Reports have run start/finish and evidence collection times, but no individual
  reasoning-step timestamps. Label collection times as such and show reasoning
  steps as time-unrecorded; animation timing must never masquerade as execution.

## Runnable browser demonstrations (2026-10-24)

- User judged a report-only viewer insufficient and approved offline demos by
  default with explicit real-service controls. This supersedes the earlier
  viewer-only/no-rerun/no-env-loading decision below. Run existing investigation,
  H-MEM learning and real Zetaris follow-through through browser controls; keep
  report import and progressive evidence detail. CLI defaults remain unchanged.
- Use one isolated worker rather than global fetch/environment interception or
  a second workflow implementation. Reuse the existing demo functions with
  optional safe progress callbacks. Serial execution protects the single-writer
  history contract; fixed deadlines and worker termination contain slow tasks.
- Offline learning uses real temporary H-MEM. Do not invent an offline Zetaris
  persistence claim: the follow-through demonstration needs explicit service and
  append acknowledgment plus existing server configuration, and retains fictional
  decisions under a synthetic account. Imported reports never authorize writes.
- Poll current job state; never replay POST requests after uncertain responses.
  Preserve failures and explain ambiguous remote writes on stop. Keep secrets and
  endpoints server-side; configuration presence is not connectivity proof.

## Local report viewer (2026-10-24)

- User requested `demo:web` with A/B scenarios and loading any single generated
  investigation report. This explicitly permits a small local presentation
  surface; full dashboards and new investigation workflows remain out of scope.
- Reuse the existing engine and report validator; static native browser UI plus
  Node HTTP needs no framework or production dependency. Demo generation is
  explicitly synthetic/scripted with history disabled, independent of `.env`.
  This does not change the normal CLI's live-AWS default.
- Uploaded files are untrusted. Validate bounded JSON server-side and render
  text safely. Bind loopback, require exact Host/same-origin JSON, serve only
  allowlisted assets, avoid persistence and expose no rerun/write endpoint.
  Consistency validation does not authenticate uploaded evidence.
- Keep verdict, next action and critical unknowns visible; reveal hypotheses,
  citations, trace and historical context progressively. Show real UTC windows
  and overlaps, not invented CPU time series or confidence. A/B switching reuses
  this process's generated reports; refreshing discards the loaded file.


## Adopted submission quality bar (2026-10-24)

- User adopted `the_bar.md` for implementation and especially documentation. Its useful standard is reproducible behavior, visible critique and revision, useful decisions, concrete sponsor roles and honest limitations. It is illustrative guidance, subordinate to verified event rules and approved project safety constraints.
- Extend the existing bounded loop and document actual role authority/shared state; do not add agent personas or redirect sponsor integrations to imitate the examples. Never fabricate confidence, retries, Cursor use or live-source proof. Keep explicit mock selection and the distinct history/lesson/current-evidence boundaries.
- Root What remains at most 10 lines; How routes readers to architecture, CLI trace interpretation, evaluation and demo/deck preparation. Submission gaps and proof remain solely in EXECUTION_PLAN.

## What / Why / How documentation (2026-10-24)

- User corrected the previous five-step hierarchy: root README must begin with hackathon participation, answer What immediately, stay within 10 lines and link only to Why and How. This supersedes earlier README layout and duplicate guide-page decisions below.
- The hackathon README requirement still applies within the 10-line cap: include concise dependencies, setup and usage directly at the root. Detailed setup stays in How. Components owns the explicit Zetaris/Meterless/NVIDIA explanation and links to genuine proof; public visibility requires a live metadata check. This qualifies the earlier instruction to move all setup out of README.
- How owns first-run setup and routes to topic-specific references. Keep one maintained home per procedure, contract, learning mechanism and measurement; link instead of repeating. Runtime architecture belongs in components, safety in product context, memory reuse in MEMORY, outcome adoption in FOLLOW_UP, evaluation procedures in evaluation, current status in EXECUTION_PLAN.
- Prior execution receipts and the initial implementation plan are under `docs/history/`, labeled historical and excluded from current instructions. Retain original failed measurements and the rules JSON. Historical rationales below explain past choices, not alternate current policies.

## Outcome feedback teaches investigation order (2026-10-24)

- User explicitly requested applicable outcomes to improve investigation strategy.
  This supersedes treating all Zetaris outcomes as audit-only. Preserve the boundary:
  Zetaris owns attributed history; H-MEM owns reusable lessons; fresh direct tools
  and the deterministic evaluator still own safety conclusions.
- Extend the existing outcome JSON with optional `investigation_check`, limited to
  critical jobs or continuous-operation dependencies and accepted only on rollback.
  Do not guess causes from free text or let reported success waive required checks.
- On normal recall with both stores enabled, validate links to acceptance and the
  original recommendation before storing an outcome-derived H-MEM summary. Keep
  the historical recommendation's supported hypothesis separate from the reported
  rollback; record explicit operator provenance and no current evidence IDs.
- Scope learning to account/region/instance, mode and matching UTC window. Adopt
  only newer feedback; never reimport feedback over newer investigation findings.
  Reuse existing budgets, row/storage caps, failure containment and single-writer
  limitations. No new dependency, model role, background worker or table DDL.
- Optional fields preserve old records, but old strict readers reject new fields;
  upgrade remote-table readers and local-memory consumers together. Offline proof
  is separate from live sponsor integration and measured general superiority.

## README audience and event sources (2026-10-24)

- README should explain what/why first, then runnable setup and usage, sponsor
  roles, current limits and links to architecture/details. Keep internal next-task
  planning in the execution plan. Use the credential-free mock B as the first run.
- Link organizer-owned online event guidance; public overview wording is not a
  complete submission rulebook. Current Nightshift wording differs from direct
  NVIDIA/H-MEM implementation; do not infer compliance or invent Cursor usage.

## Fresh-machine configuration (2026-10-24)

- Document supported runtime keys and local legacy/provisioning keys distinctly.
  `ZETARIS_CCI_HISTORY_PATH` records the server-visible persistent provisioning
  path; the app reads only `ZETARIS_HISTORY_TABLE` for the SQL target and never
  provisions storage. Setting a path alone cannot create a lakehouse.
- Fresh-machine instructions must link storage creation, lakehouse registration,
  table DDL, dedicated-user permissions and explicit retained-record write proof.

## Six-scenario deadline slice (2026-10-24)

- User set October 26 as the team submission target. Work toward that earlier
  target; the locally recorded October 27 portal deadline still needs verification.
- Reuse Milad's latest historical comparison fields, the existing MockProvider,
  and the existing investigation/broader/warm tests. Most requested behavior
  already existed; strengthen its evidence checks rather than add another engine,
  provider schema or scenario-specific verdict logic.
- Keep the six-case evidence periods fixed at 14 complete UTC days and prior
  periods distinct. Do not silently tighten the existing seven-day safety minimum;
  explicitly test/document the mismatch. Leave numeric history trends out.
- Make the deterministic demo select the tested cases themselves. Its synthetic
  current observations and mocked Zetaris transport are independent of external
  availability; actual sponsor integration proof remains separately labeled.
- Preserve live AWS as the CLI default. The scenario harness uses explicit mock
  providers and cannot demonstrate live scheduling/dependency authority.

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

- **Superseded by the 2026-10-25 runtime decision below.** User requested five-minute model-call waits and gentler free-endpoint usage
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

## Fifteen-minute investigation budget (2026-10-25)

- User rejected hour-long investigations. The runner owns a fixed 900000-ms
  maximum total budget and 60000-ms model-call cap; call count must not multiply
  the aggregate deadline. Keep evidence timeouts and attempt caps unchanged.
- Reserve 5000 ms for final report validation/output; for custom totals below
  50000 ms reserve 10%. Planner, evidence, pacing and history waits use the work
  deadline. Bound history at the runner as well as sending cancellation, because
  adapters may ignore AbortSignal. Never automatically retry ambiguous writes.
- On exhaustion, keep completed verdicts/citations, defer unresolved candidates
  and return partial (failed without evidence). Historical persistence timeout
  discloses uncertain completion. Reconstruct the final validated result so late
  adapter mutations cannot change the returned report.
- Elapsed time is a truthful nonnegative safe-integer measurement, not a second
  timeout policy. The old one-hour report validation cap discarded findings and
  rejected older valid measurements; execution enforces the new total budget.
- Share the 15-minute watchdog with the single model investigation web worker.
  Multi-investigation learning retains its separate
  20-minute worker limit. Deadlines bound waits, not a blocked Node event loop
  or remote provider execution after cancellation. No new dependencies or calls.

## Dedicated Zetaris runtime identity (2026-10-25)

- **Owner correction:** the configured Zetaris account is non-admin and limited
  to API access, explicitly confirmed by the deployment owner. This supersedes
  the prior administrator characterization. Do not require another identity on
  that assumption; distinguish owner-confirmed account class from independently
  inspected table grants and backend overwrite restrictions. The requirements
  below describe the intended boundary, not an observed administrator account.
- Administrator read/write success cannot establish least privilege. Provision a
  separate general/non-admin account with table-only SELECT/INSERT on the history
  records table, no Grant Option, and no broader inherited authority. Token auth
  must identify the same restricted account; an old administrator token is not
  an acceptable runtime alternative. Keep actual secrets local and unchanged by
  documentation work.
- SELECT/INSERT labels do not establish append-only storage because INSERT may
  include overwrite. Require effective backend/server-policy evidence, separate
  from the app's fixed INSERT INTO adapter and functional readback. Do not test
  destructive statements against retained history. Canonical setup belongs in
  docs/ZETARIS_HISTORY.md; verified status belongs in docs/EXECUTION_PLAN.md.

## Zetaris installation guide ownership (2026-10-25)

- Keep official installation links and server-side persistent directory/lakehouse
  provisioning in docs/ZETARIS_SETUP.md, linked from README Setup and How. This
  supersedes keeping the Docker procedure in docs/ZETARIS_HISTORY.md. The history
  guide remains canonical for the table contract, restricted runtime account,
  connection configuration and append/read verification; link rather than duplicate.
- Local storage means the Zetaris server/container filesystem. A shared persistent
  mount and a path allowed by the configured filesystem root are both required;
  a directory in the app checkout cannot provision remote Zetaris storage.

## Trace example provenance (2026-10-25)

- Keep the concise captured-run example in `docs/TRACE_EXAMPLE.md`, linked from
  the CLI trace reference. Project trace fields and actual evidence IDs make
  the evaluator's rejection auditable; do not invent quality-bar metadata or
  sponsor calls. Label live model execution separately from synthetic telemetry,
  and distinguish offline reproduction from the captured model run.

## Coding-agent first-run contract (2026-10-25)

- The expected repository reader may be Claude, Codex or another coding agent.
  Keep the executable first-run sequence and approval table in `docs/HOW.md`,
  linked from `AGENTS.md`; do not create a competing agent-specific setup guide.
- Setup authorization covers locked installation, local tests, temporary H-MEM
  and a loopback viewer. It does not imply paid calls, live account access,
  retained remote records, provisioning, secret changes, commit or publication.
  Reuse existing explicit authorization rather than asking again at each step.
- A clean-checkout proof must not borrow `.env`, AWS configuration, installed
  modules or persisted memory from the developer workspace. Use a fresh home
  and npm cache when checking isolation; version-manager shims may need their
  installed Node binary selected explicitly. Registry access and local fixture
  permissions are environment requirements, not reasons to change product code.
- First-run examples explicitly disable history, since `--evidence mock` alone
  does not disable configured historical reads/appends. H-MEM is vendored;
  `npm run setup` refreshes upstream code and is not first installation.
- Keep progress stderr separate from JSON stdout. Missing-source exit 2 is an
  expected safe partial result. Local runtime proof, browser visual review,
  remote clone availability and live services remain separate evidence classes.

## Native operational facts and recommendation authority (2026-10-25)

- Use AWS-expanded, dated SSM maintenance executions, corroborated by enabled
  window duration. A dated conflict rejects the proposed daily window in the
  planning month; it is not an invented recurring critical job or an H-MEM lesson.
- ELBv2 instance registration is a consumer fact requiring owner/draining review,
  not proof of continuous operation. Native empty scans remain partial because
  external jobs/consumers and owner/calendar/recovery clearance are unknown.
- Keep overlap logic in policy and reuse it in execution and report validation.
  Extend the existing bounded read-only adapter with the two explicitly approved
  SDK packages; never add write actions or parse arbitrary operational payloads.
- The live smoke probe logs only statuses/counts/codes and uses a running instance
  actually retrieved from inventory. Missing inventory prevents operational proof;
  fabricated IDs or resource provisioning would not remedy that evidence gap.

## Dedicated AWS profile and SSM page size (2026-10-25)

- The user provisioned the local `cci` profile and an IAM user named `cci` for
  Paris (`eu-west-3`; `eu-west-3a` is an availability zone). Select the profile
  and region explicitly when probing; do not alter inherited settings or secrets
  merely to verify the new identity. Successful reads do not enumerate effective
  permissions or prove that the identity has no additional grants.
- A genuine SSM `DescribeMaintenanceWindowSchedule` call rejected `MaxResults:
  100` with HTTP 400 `ValidationException`, stating a maximum of 10. The API
  reference lists only a minimum, so fixture success and SDK types did not establish
  this service constraint. Request ten results, validate that page bound, and keep
  existing continuation/request caps. This changes collection compatibility, not
  safety policy. Retain the failed measurement as well as the successful retry.
- Live populated inventory and successful empty SSM/ELBv2 reads resolve the
  previous inventory-access blocker in this scope. They do not establish populated
  metrics/billing, absence of workload jobs/consumers, or owner clearance. Keep
  those evidence gates open; no additional IAM permissions fix an invalid page size.

## Live metric verification boundaries (2026-10-25)

- Separate CloudWatch access/populated retrieval from adequate historical coverage.
  The live collector can return real five-minute CPU/network observations while
  correctly withholding authoritative coverage; missing intervals never become
  zero utilization. A complete-UTC-day observation window excludes today's data.
- Verify the agent projection using the same fetched collection to avoid redundant
  remote calls. `createAwsEvidenceProvider` already invokes `validateObservation`
  with the required action/run context; a redundant context-free validation is a
  helper error, not a provider failure. Preserve the failed helper receipt and
  distinguish its corrected execution from the original live retrieval.

## Required discovery and isolated live tests (2026-10-25)

- Correction: a red cross for every non-`ok` event made successful inventory
  retrieval with optional metadata gaps look like an ignored error. Preserve
  distinct status meanings: amber partial, neutral no-match, red unavailable/error.
  User correction (Oct 25): show icons only, with status text in the existing
  tooltip on hover, keyboard focus or click to keep the event tree concise.
  This supersedes the inline-label requirement while retaining distinct symbols,
  colors and accessible labels. Do not stop a
  usable inventory merely because optional metadata is missing; real discovery
  failures retain the immediate stop rule.
- Inventory access is a prerequisite owned by the runner, not a planner hint.
  Unusable inventory or billing must stop before further model/tool calls, retain
  sanitized diagnostics and return a failed report/exit 1. A metadata-only partial
  inventory still has useful rows; do not label optional tag gaps as API failure.
  Authenticated empty inventory needs no billing query. Operational gaps remain
  explicit deferrals, and positive partial counter-evidence retains its meaning.
- User requested `integration:modal` for the existing single-call live model test
  and `integration:cloud` for real AWS reads. Keep them isolated from each other
  and offline tests; the old `test:integration` is a model-only compatibility alias.
  Cloud access checks reuse the production collector/adapter, fresh inventory and
  bounded read-only calls. They must fail on unavailable sources, require explicit
  potentially charged billing opt-in and never imply scheduling clearance.
- The first live cloud suite exposed a billing parser assumption: real AWS returned
  timestamp periods; appending `T00:00:00.000Z` produced `INVALID_INPUT`. AWS's
  DateInterval contract and resource-cost example permit UTC timestamps as well
  as dates. Normalize only valid daily UTC midnights, preserve scope and duration
  checks, and report malformed source periods as `INVALID_SOURCE_DATA`.
- Retain only sanitized coverage metadata in public verification receipts. Raw
  metric values and resource/account identifiers are unnecessary to establish
  connectivity, timestamp alignment, CPU-series consistency and safe deferral.

## Evidence diagnostics and owner statements (2026-10-25)

- Optional inventory metadata is not resource-enumeration coverage. Keep missing
  metadata visible per instance without cascading missing tags into incomplete
  billing. Pagination, source failures and unsupported resources still constrain
  discovery. Metadata presence never establishes owner authority.
- Preserve per-metric sample counts, intervals and first/last timestamps at the
  validated report boundary, even when no usable CPU summary exists. Carry only
  allowlisted issue field names; never copy arbitrary provider messages/fields.
- Explain a finish at the metrics prerequisite as `metrics_evidence_incomplete`.
  This does not authorize partial metrics to clear a shutdown window.
- User chose owner evidence as supporting context only. Capture bounded, scoped,
  attributed statements separately from current AWS observations, with assertion
  time, reference and applicable UTC interval. No authenticated identity is
  claimed; no planner input, operational clearance, history write or memory lesson
  comes from this prose. Keep existing scheduling gates and permanent-retirement
  scope unchanged. Optional fields preserve older report compatibility.


## Bounded planner recovery and responsive progress (2026-10-25)

- User explicitly requested retry/backoff after transient planner unavailability.
  The runner owns at most two retries for one next decision; count every attempt
  in existing aggregate/per-candidate call caps. Wait 2s then 4s with positive
  jitter and honor longer Retry-After, sharing the aggregate deadline/reserve.
  This supersedes earlier no-model-retry decisions for runtime behavior, without
  erasing failed measurements or relaxing the evaluation gate.
- Preserve evidence and original sanitized failure traces across recovery; never
  replay tools or history writes. Invalid output, auth/configuration failures,
  unknown errors and explicit cancellation remain terminal. Retrying generation
  can consume provider usage even if our earlier wait was aborted.
- Emit trusted active-stage timing every two seconds. Store heartbeat text as the
  latest job activity, separately from bounded execution events, so a slow call
  remains understandable without evicting actual history. Reuse the runner's
  progress callback; the browser polls the existing job. Avoid rebuilding an
  unchanged event tree so keyboard focus and tooltip state survive polling.

## Rejected demo starts remain idle (2026-10-25)

- Missing real-service acknowledgment is a validation error, not a job. Use the
  existing toast and focus the acknowledgment; never reveal active-job controls
  to report validation failures. Stop is meaningful only for a confirmed running
  job; hide empty execution events and clear stale controls during submission.
- A server-rejected start restores the actual job state. Stop requests display
  pending feedback while awaiting confirmation. Preserve explicit history-write
  acknowledgment; UI fixes never bypass it or start remote follow-through writes.


## Trace metadata and evidence retries (2026-10-25)

- User correction: trace metadata is required, not optional quality-bar decoration. The old omission was intentional to avoid invented certainty/counters; it is superseded for newly captured runs. Create the investigation ID at run start, attach it as `trace_id` on every trace entry, and identify entries by `(trace_id, step)`.
- Confidence is deterministic categorical evidence support, never a fabricated probability: complete authoritative cited evidence without gaps is `supported`, failed attempts or cited gaps are `insufficient`, and no cited evidence is `unassessed`. It cannot change verdict policy or become model-authored authority. Existing report receipts stay unchanged; their unknown counters load as null.
- The executor owns up to three retries after an initial failed read-only provider call, with identical validated arguments and 2s/4s/8s backoff plus positive jitter. Retain every failed trace; only the final response enters the registry so outages cannot shadow recovered evidence. Returned error/unavailable and thrown failures/timeouts retry; malformed/out-of-scope data and cancellation remain terminal. Partial/no-match remain meaningful successful responses.
- Count every physical provider call, including retries. Allow up to eight discovery attempts for its two logical tools; allow twelve physical attempts for the three candidate tools, preserving existing planner/runtime caps. Budgets and finalization reserve may stop retries sooner. Planner retries remain separately bounded and never cause tool replay. Uncertain historical writes are not retry-safe and remain excluded.
- This supersedes the earlier immediate-discovery-stop and no-tool-retry decisions only for bounded same-tool recovery. Exhausted discovery still stops before another model decision or different evidence tool. No new production dependency or AWS write permission is needed.

## Explicit engineer decisions in the web UI (2026-10-25)

- A scripted fictional decision does not capture the engineer's intent. Make the
  actual Accept/Defer form primary and keep the seven-record demonstration in a
  separate disclosure. Do not preselect a decision or reuse acknowledgment when
  the selected recommendation changes.
- Reuse `prepareDecision` for side-effect-free validation and `recordDecision`
  for append/readback; the browser must not own history identifiers or SQL.
  Complete conditional recommendations alone are eligible. Engineer attribution
  is not authenticated authority and acceptance never executes infrastructure.
- Clearly label real Zetaris storage separately from synthetic evidence. Claim
  success only after both recommendation and decision readback, with downloadable
  record IDs. Preserve immutable decisions and ambiguous-write failure semantics;
  do not automatically retry remote writes. Reviews/outcomes remain in the CLI.

## Follow-through mode choice (2026-10-25)

- The user requested a single **Demo** checkbox instead of displaying the actual
  investigation form alongside the fictional illustration. Default unchecked;
  expose only the selected mode. Toggling changes presentation only and clears
  write acknowledgments. The recommendation CTA always opens investigation mode.
  The existing demo still requires explicit retained-record acknowledgment and Run.

## Real-model trace examples with realistic synthetic identities (2026-10-26)

- Use the existing real planner and runner for published model traces. Change fictional instance/job identities at the synthetic provider boundary before planning, so model output, arguments and evidence agree; never rewrite saved reports to make a run look real. Preserve explicit mock provenance even when resource IDs look like AWS IDs.
- Keep each scenario and its complete trace in a native HTML disclosure. Save immutable per-run reports and retain failed capture attempts separately; actual planner failures and injected evidence outages must be distinguished. The capture script configures no history, verifies TLS and loads only the existing model configuration.

## Readable trace format and measured fractional confidence (2026-10-26)

- User correction: examples should expose timestamps, explicit actions, input summaries, concise decision rationales, factual outputs and status. Record timestamps at runtime and derive a reusable readable JSONL view from validated reports; do not fabricate historical timing or replace concise rationale with hidden thinking. `--trace-jsonl` is a final export, mutually exclusive with full-report JSON.
- User chose measured coverage rather than model self-ratings. Numeric JSONL `confidence` is distinct complete authoritative gap-free checks retrieved so far / five required evidence checks for the current candidate. Retain the categorical report confidence under JSONL `evidence_support`. This is completeness, never a safety probability or verdict threshold; failed attempts and future/other-instance checks cannot inflate it. Historical untimed traces export null measurements.
- The user requested the actual demo UI account ID rather than an obvious synthetic scope and explicitly authorized forwarding it to the configured public NVIDIA endpoint. New captures use that scope with synthetic resources/telemetry, preserve mock provenance and leave older receipts unchanged.

## README sponsor explanation (2026-10-26)

- Keep sponsor entries concise like the supplied sample; link to detailed proof.
- Lead each sponsor entry with the user outcome it enables, then explain the
  technology's contribution. Avoid capability or benefit claims without evidence.
- Keep the sponsor explanation collapsed by default in a native Markdown HTML
  details disclosure, as requested by the user.
- The user explicitly requested a substantive Sponsor Technology section in the
  root README. Keep that requested explanation visible there despite the earlier
  short-README guideline; detailed integration contracts and receipts remain
  canonical in `docs/components.md`.
- Explain actual roles: Zetaris decision follow-through, Meterless H-MEM scoped
  lessons, and direct NVIDIA model planning. Do not copy the illustrative model
  routing, multi-agent or Cursor claims. Real sponsor calls with synthetic AWS
  evidence do not prove live scheduling safety or a general memory speedup.

## Dynamic UI motion and action loading (2026-10-26)

- Extend the existing native Web Animations and CSS rather than add a dependency
  for entrance motion. Use brief opacity/vertical movement for changing data,
  report sections, disclosures and evidence details; respect reduced motion.
  Event polling animates only newly received entries so old evidence stays still.
- Loading belongs to the pending action: investigation, decision saving, report
  validation, preview selection or stopping. Preserve and restore button labels,
  expose `aria-busy`, and keep the spinner visible throughout a confirmed running
  job, including recovery after refresh. Disabled unrelated actions are not busy.
  Validation failure must not imply a job started; stop remains available only
  after running is confirmed. Motion timing never represents evidence timing.

## Inspectable planner messages (2026-10-26)

- User requested the prompt and output in web Execution events. Capture them at
  the model adapter, where actual messages and assistant content exist, rather
  than reconstructing them from the executor action or exposing provider bodies.
- The first model turn selects inventory or finish without observations. Later
  turns select checks or a hypothesis using retrieved evidence; deterministic
  code retains scope binding and verdict authority. This task changes visibility,
  not planning policy.
- Keep display callbacks separate from metadata-only progress and persisted
  reports/history. Redact credentials/endpoints before worker IPC, bound text,
  use literal text disclosures and isolate observer failures from planner retries.
  Scripted previews have no model exchange to display.

## Automatic initial inventory (2026-10-26)

- Supersedes the first-turn behavior described in Inspectable planner messages:
  the user removed the model's initial inventory-or-finish decision. Inventory
  is an unconditional prerequisite; asking the model to request it spends time
  and inference without choosing a useful investigation direction.
- The runner constructs the scoped inventory action and reuses the existing
  executor branch. Do not duplicate retrieval/validation/retry logic or bypass
  evidence registration. The first planner state includes validated inventory
  and the attempt trace, with partial coverage preserved as unknown.
- Empty or failed discovery invokes no planner. Successful runs use one fewer
  planner call; later model failures retain inventory as partial evidence. Keep
  the aggregate recovery cap and old report compatibility. Record the prerequisite
  as an evaluator action, never a model-authored decision; only actual planner
  calls count toward the planner budget.

## User-selected Live observation period (2026-10-26)

- The user requested pre-run lookback control. Reuse CLI `--lookback-days` through the validated worker request: 1–14 complete UTC days, web default 7. Scope, model and history remain server-controlled. Complete UTC-day alignment preserves billing compatibility; this is not a rolling 48-hour query.
- Report measured CPU averages/peaks with partial coverage explicitly, without equating low CPU to no jobs or dependencies. The seven-day recommendation threshold remains separate from observed activity. SSM maintenance and ELBv2 registrations remain scoped evidence, not workload-wide absence proofs. No planner gate or clearance authority is relaxed.


## Project AWS selection at web startup (2026-10-26)

- User explicitly requested plain `npm start` use project `.env` AWS profile and region even when the launching shell exports different values. This supersedes blanket shell precedence for these two keys at web startup only. Other commands and settings retain shell precedence; omitted file keys preserve inherited values.
- Apply the override once before starting the server. Workers inherit that selection; ordinary adapter reloads preserve it. Use native Node parsing, sanitized file errors and no configuration-value logging. The expected-account guard and separate decision-write acknowledgment remain mandatory.

## Complete candidate collection before final disposition (2026-10-26)

- User correction supersedes the partial-metric prerequisite stop and early conflict exit. After inventory/billing identify a candidate, partial/unavailable metrics must not block scoped SSM/ELBv2 reads. Optional proposed windows label challenges; collection does not manufacture a window.
- Partial low-CPU observations may motivate a tentative hypothesis, with current citations and the same threshold checks. Only complete authoritative proof can recommend scheduling; scope validation, cancellation, discovery recovery and aggregate budgets are unchanged. Keep a discovered contradiction while attempting remaining checks.
- The earlier warm-demo saved-call requirement depended on early stopping. Preserve dated receipts; current learning proof checks prioritized collection, fresh evidence and correction, while measuring rather than requiring call savings.

## Operator-facing next actions (2026-10-26)

- User correction: Next action contains concrete tasks a human can perform. Keep tool/status diagnostics in missing checks, strip those prefixes from action text, omit the unsupported-window finding, and combine incomplete/short utilization history into one period-selection or wait-and-rerun task. Preserve owner schedule/dependency requests and the external human approval boundary; this presentation change does not relax evidence policy.

## Reject-or-defer product contract (2026-10-26)

- User explicitly narrowed CCI to naming a specific reason to reject a shutdown window or naming missing evidence and deferring. New reports carry `decision_policy: reject_or_defer`; no new conditional recommendations or savings. Historic reports without the marker keep their strict original validation and acceptance/outcome compatibility.
- An absence of found conflicts is not approval. Complete technical checks defer the external authorized human decision without inventing missing telemetry. Named jobs, dated maintenance and attributable dependency obligations make rejection explainable; an unnamed continuous-operation boolean is insufficient for a new rejection.
- Inventory remains mandatory. Billing is ranking context, so bounded billing outages fall back to validated running inventory; malformed scoped billing and cancellation remain terminal. Billing gaps stay in discovery diagnostics, not the technical scheduling checklist. Whole-period peaks do not establish where activity occurs; a retrieved suggested window still deserves operational checks.
- Preserve the concurrently developed all-checks collection policy, web AWS selection, preview loading and operator-action behavior. Both operational checks remain attempted within the aggregate budget after a conflict. H-MEM changes order, not freshness requirements or verdict authority.
- Review requests now cover rejected and deferred results, including partial investigations, using existing append-only validated Zetaris records and readback. Acceptance and outcome learning remain legacy-only. No infrastructure authority or additional remote write permission is introduced.
- The six-case exports describe the current policy; dated model/sponsor receipts retain their original policy and modes. The exporter synchronizes the root handoff copy and canonical docs JSONL to prevent drift. Current proof belongs in the execution plan.
