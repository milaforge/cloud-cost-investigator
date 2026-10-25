# How

[What](../README.md) · **How**

## Run the demo

Install the prerequisites listed in [What](../README.md). `package-lock.json` pins the CLI's TypeScript/tsx and AWS SDK dependencies; Meterless H-MEM is vendored, with no separate service required.

```bash
git clone https://github.com/milaforge/cloud-cost-investigator.git
cd cloud-cost-investigator
npm ci
npm run investigate -- --evidence mock --account demo --region us-east-1
```

The intended user is an infrastructure/platform engineer deciding which proposed shutdowns warrant human review. Expect `not_recommended`: a conflicting batch job disproves the proposed shutdown window. This demo uses **synthetic evidence and a scripted planner**. If local history is already configured, it can also read/append records; leave `ZETARIS_HISTORY_TABLE` empty and `HMEM_PERSIST_DIR` unset for an isolated run.

## Open the web demo

```bash
npm run demo:web
```

Starts a loopback-only server on an available port and opens the browser. Initial
A/B previews are generated from synthetic evidence with a scripted planner.
No scenario or report is selected on startup. Choose a scenario and run it, or
explicitly open an A/B preview. Changing scenarios clears the previous report.
After this one startup command, the demo workflows run from browser buttons:

| Workflow | What to run and inspect |
| --- | --- |
| **Investigate** | Choose A (conditional opportunity), B (rejected window), C, missing evidence or three candidates, then **Run investigation**. Inspect current evidence, hypotheses, savings qualifications and human actions. |
| **Learn** | **Run learning demonstration** executes cold, warm and changed-evidence investigations using real temporary local H-MEM. Compare check order, calls, timing and fresh verdicts; inspect each phase's report. |
| **Follow through** | Explicitly select **Use real Zetaris and retain the seven demo records**, then run the configured service demonstration. Inspect the deferred/reviewed and accepted/outcome-reported paths and readback checks. All decisions are fictional; no AWS changes occur. |

Investigation and learning default to offline scripted runs. The server loads the
project `.env`, preserving shell precedence, but does not contact services on
startup. Configuration labels indicate presence, **not verified connectivity**.
For real inference, select the configured model and explicitly enable real
services (or select the model checkbox on Learn). The
[model setup](CLI_GUIDE.md#model-configuration) stays server-side; model calls may
incur usage. Live AWS is an explicit browser option with account, region and
candidate limit; the [AWS setup](AWS_TOOLS.md#investigation-cli) and missing-source
limits still apply. The account ID checks the authenticated AWS scope; it does not
authenticate the browser. Configure the server's AWS SDK credential chain or
`AWS_PROFILE` before starting it. Select **Read Zetaris decision history** to
query prior records for discovered instances. This investigation control is
read-only even if server append permission is enabled. History is historical
context and never replaces live evidence. The normal
investigation CLI still defaults to live AWS.

Follow-through requires [Zetaris setup](ZETARIS_SETUP.md), server-side
`ZETARIS_HISTORY_ALLOW_APPEND=true`, and the browser write acknowledgment. It
retains seven synthetic records under a unique account and never silently falls
back to fixture storage. Restart after changing configuration. Real-service
failures stay failures; the browser does not substitute scripted results.

Only one run executes at a time. Actual progress and expandable events remain
visible, including after a page refresh. **Stop run** terminates the local worker;
external writes may already have completed. Do not blindly retry an interrupted
write: retain the synthetic account shown in events and inspect its history.
Refreshing or reconnecting only retrieves the latest job; it never resubmits it.
An already completed job opens only when you select **View last result**.
The server keeps only its latest job result in memory; a server restart loses
that display state. Server shutdown stops the active worker.

Use `npm run demo:web -- --no-open` on a headless machine and open the printed
URL from a browser on that computer. If automatic opening fails, the server
keeps running and prints the URL. Ctrl+C stops it.

Choose **Load report**, or drop one JSON file, to inspect a generated single
investigation report. **Run details & export → Download JSON** saves the selected report
from the browser. The 2 MiB upload limit applies to each file. Validation checks
report consistency, citations and savings; it cannot authenticate user-supplied
evidence. Evaluation summaries and multi-run demo bundles are not single report
files. Uploads go only to this local server for validation and are not saved to
disk. Invalid files preserve the current display. Loaded files remain in the
current page until replaced or refreshed; keep real-account reports private.

The verdict and next human action lead the report. **How it got there** shows
the key checks and proposal/rejection sequence. UTC timestamps label evidence
collection; reasoning steps without recorded times say so. Hover, focus or tap
an **i** control for supporting details. Select evidence links for observations
and coverage. Expand **Window, assumptions & remaining checks** or **Full
investigation trace** for the complete detail. **Real services & scope** sits
below the report. Motion respects the system reduced-motion preference. Architecture and
execution bounds live in [components](components.md#local-report-viewer).

## Configure your investigation

Copy [.env.example](../.env.example) to `.env` **only if `.env` does not exist**; otherwise merge the needed keys. Keep it untracked. Commands load it from the working directory; existing shell variables take precedence.

| Choose | Continue here |
| --- | --- |
| Live AWS evidence and permissions | [AWS authentication](AWS_TOOLS.md#authentication-and-live-smoke-check) |
| A real model, including NVIDIA | [Model configuration](CLI_GUIDE.md#model-configuration) |
| Persistent investigation lessons | [H-MEM configuration](MEMORY.md#configuration) |
| Historical recommendations and decisions | [Zetaris setup](ZETARIS_SETUP.md) |

Live, read-only AWS evidence is the default. Synthetic runs require `--evidence mock`; failures never switch to mocks. Replace the account placeholder and region with your intended AWS scope:

```bash
npm run investigate -- --account YOUR_12_DIGIT_ACCOUNT_ID --region us-east-1
```

The [team-adopted quality bar](../the_bar.md) guides reproducibility, visible decision-making and submission materials. Its examples do not change this project’s safety policy or technology roles.

## Go deeper

| Question | One place to read |
| --- | --- |
| Which flags and scenarios can I run? | [CLI reference](CLI_GUIDE.md) |
| How do the components work together? | [Architecture](components.md) |
| How are Zetaris, Meterless and NVIDIA used? | [Sponsor technology explanation](components.md#sponsor-technology-explanation) |
| How do I record a decision, review or outcome? | [Follow-up workflow](FOLLOW_UP.md) |
| How are lessons stored and reused? | [H-MEM reference](MEMORY.md) |
| What are the exact evidence and safety rules? | [Product contracts](PROJECT_CONTEXT.md) |
| How do I reproduce and assess the demos? | [Evaluation](evaluation/README.md) |
| How do I present the workflow to judges? | [Demo and deck preparation](DEMO.md) |
| What works today, and what is still unverified? | [Current status and release checklist](EXECUTION_PLAN.md) |
| What does the hackathon require? | [Recorded event rules](RULES.md) |

For contributors: [checks and diagnostics](CLI_GUIDE.md#verify), [working rules](../AGENTS.md), and [decision rationale](../memory.md).
