# Cloud Cost Investigator

> Built to participate in **Open Agent Hackathon 2026**.<br>
> **Track:** 02 — The Agent That Can Explain Why<br>
> **Sponsor technology:** Zetaris, Meterless H-MEM, NVIDIA Nemotron<br>
> **Run:** `docker compose up -d`, then open http://127.0.0.1:36335 (Demo and Live).

## 1. Problem

Infrastructure and backend engineers can see idle EC2 capacity, but low average CPU does not tell them whether an instance can safely stop. Overnight jobs, traffic peaks and dependencies can turn an attractive saving into an outage.

CCI investigates EC2 shutdown windows to **identify a specific reason to reject a window, or explain exactly what evidence is missing and defer the decision**. It discovers candidates within an AWS account and region, proposes a window and challenges it with fresh operational evidence. CCI never changes infrastructure.

New runs only reject or defer. Older conditional-recommendation reports remain readable, but CCI no longer emits recommendations or savings. If technical checks find no conflict, CCI explicitly defers the authorized shutdown decision to the human change process.

## 2. Agents and responsibilities

Required EC2 discovery runs first. Its validated result feeds one bounded planner → executor → evaluator loop. These roles are responsibilities within that engine, not separate autonomous model agents.

| Role                          | Responsibility                                                                                                         | Can block or retry?                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Planner                       | Chooses checks and proposes windows using a configured model or scripted planning.                                     | Replans from evidence; transient model failures can retry.          |
| Executor                      | Collects inventory, billing, utilization, jobs/operations and dependencies; validates scope, time, units and coverage. | Rejects invalid actions/data; retries failed reads within budgets.  |
| Safety evaluator              | Deterministic code challenges proposals and owns verdicts.                                                             | Blocks unsupported advice, rejects contradictions, defers unknowns. |
| Report validator and renderer | Checks citations, hypothesis transitions and legacy savings; emits next human actions.                                 | Blocks inconsistent reports.                                        |

## 3. What makes this an agent system

- **Evidence changes the next action:** observations, hypotheses and prior attempts feed replanning.
- **The evaluator overturns proposals:** in Sample Scenario B, low CPU suggests 00:00–06:00 UTC; a fresh check finds a critical 02:00–03:00 job and rejects that window.
- **Recovery is bounded:** retry failures, then preserve findings and defer unresolved safety.
- **Learning changes check order:** H-MEM prioritizes risks to check against fresh evidence.
- **Decisions are inspectable:** hypotheses, citations, timestamps, source modes and retries appear in the [actual model-driven trace](docs/TRACE_EXAMPLE.md).

```mermaid
flowchart TD
    U[Engineer] -->|1. Start investigation| A{"CCI agent — one engine, four roles<br/>Planner: choose checks and propose windows<br/>Executor: fetch and validate evidence<br/>Safety evaluator: reject or defer<br/>Report validator and renderer: verify and explain"}
    subgraph Sources[Scattered AWS sources — fresh, read-only evidence]
        EC2[EC2: inventory]
        CE[Cost Explorer: billing]
        CW[CloudWatch: metrics]
        SSM[SSM: maintenance windows]
        ELB[ELBv2: load balancer dependencies]
    end
    EC2 -->|2. Discover instances first| A
    M[(Meterless H-MEM: scoped lessons)] -->|3. Prioritize fresh checks| A
    CE & CW & SSM & ELB -->|4. Fetch evidence and revise hypothesis| A
    A -->|5. Reject window or defer, with reasons| U
    U -->|6. Explicit review request| Z[(Zetaris: durable decision follow-through)]
    Z -. Historical context for future investigations .-> A
    A -. Store reusable lessons .-> M
    Z -.->|"7. Validated legacy outcome learning"| M
```

Numbers show the main investigation and follow-through flow; evidence can change check order. Historical context and lessons never replace fresh AWS facts. Only an authorized human can approve infrastructure changes.

**Role interactions within one engine** — these are responsibilities, not separate autonomous agents.

```mermaid
flowchart LR
    X["Executor"] -->|"1. Validated initial inventory"| P["Planner"]
    P -->|"2. Choose next evidence check"| X
    X -->|"3. Validated observations"| E{"Safety evaluator"}
    P -->|"Proposed window"| E
    E -->|"4. Findings and gaps guide further checks within budget"| P
    E -->|"5. Final rejection or deferral with evidence"| R["Report validator and renderer"]
```

<details>
<summary>Detailed investigation and decision flow</summary>

```mermaid
flowchart TD
    U[Engineer: account and region] --> D[Executor: required EC2 inventory]
    D -->|Validated inventory| P{Next useful check or window proposal?}
    D -->|Empty or failed| N["No candidate verdict; explain discovery result"]
    P --> X[Executor: read-only evidence with scope and coverage]
    X --> E{Retrieved conflict with this window?}
    E -->|Yes| R[Record this window conflict and citation]
    R --> G{Further useful checks within budget?}
    E -->|No| G
    G -->|Yes| P
    G -->|"No; conflict recorded"| V[Reject this window]
    G -->|"No conflict; evidence or authority missing"| F[Defer: name gaps and next checks]
    G -->|"Technical checks complete; no conflict found"| H[Defer to authorized human decision]
    M[(H-MEM: scoped lessons)] -. Prioritize fresh checks .-> P
    Z[(Zetaris: historical records)] -. Historical comparison only .-> F
    V -. Explicit review request and readback .-> Z
    F -. Explicit review request and readback .-> Z
    H -. Explicit review request and readback .-> Z
    Z -. Validated legacy outcome lesson .-> M
```

</details>

[Architecture and authority boundaries](docs/components.md).

## 4. Tech stack

| Component                | Technology                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| Runtime and CLI          | Node.js 24+, TypeScript                                                                         |
| Orchestration and safety | Bounded stateful loop, runtime validation, deterministic evaluator and legacy-report validation |
| Current evidence         | AWS SDK read-only adapters for EC2, Cost Explorer, CloudWatch, SSM and ELBv2                    |
| Model planning           | OpenAI-compatible Chat Completions; NVIDIA-hosted Nemotron preset                               |
| Reusable lessons         | Vendored Meterless H-MEM reference, local disk persistence                                      |
| Decision follow-through  | Zetaris HTTP adapter, dedicated history reads and explicitly authorized append/readback         |
| Presentation and traces  | CLI stdout, JSON or JSONL; loopback Node HTTP server and browser UI                             |

<details>
<summary>Sponsor technology: contribution and proof</summary>

**Zetaris — decision follow-through.** Engineers can record review requests for rejected windows and evidence gaps, then revisit them with fresh evidence. Historical accepted recommendations and attributed outcomes remain readable. Validated outcome feedback can teach H-MEM which risks to check first.

**Meterless H-MEM — learning across runs.** Stores and recalls scoped lessons so the planner can investigate a previously discovered risk first. It is reasoning memory, not the model runtime or a current telemetry source.

**NVIDIA — adaptive investigation.** NVIDIA-hosted Nemotron chooses allowlisted checks and proposes windows. Trusted code binds tool arguments; the deterministic evaluator controls verdicts.

Real model calls, H-MEM persistence and remote Zetaris append/readback have [recorded proof](docs/components.md#sponsor-technology-explanation), using **synthetic AWS evidence**. The default demo uses scripted planning. No general H-MEM speedup has been established.

</details>

## 5. Setup

For the web UI, install **Docker with Compose**, then run from the project directory:

```bash
docker compose up -d
```

Open **http://127.0.0.1:36335**, choose Demo, and select a scenario. No GPU, credentials, `.env`, or external services are needed for Demo. Compose uses the host network and the server binds to `127.0.0.1` only; port 36335 must be free on the host. Use `docker compose logs -f web` for startup output and `docker compose down` to stop it. The image installs the locked Node dependencies and includes the vendored H-MEM source; do not run `npm run setup`, which refreshes H-MEM from upstream. Live H-MEM summaries persist in the `cci-hmem` named volume across `up -d --build`; `docker compose down -v` deletes that history.

For Live in Docker, create `.env` from `.env.example` **only if absent**, then supply the AWS scope, model configuration, and any other services you intend to use. Compose's optional `env_file` injects `.env` values into both the web process and its worker; recreate the service after changing them, using the same Compose files as the initial start. If `AWS_PROFILE` refers to your host's `~/.aws` files, mount them read-only and run the container as the file owner:

```bash
CCI_HOST_UID=$(id -u) CCI_HOST_GID=$(id -g) docker compose -f compose.yaml -f compose.aws.yaml up -d
```

The image copies source at build time. After source changes, use the same command with `up -d --build` to recreate the service; export any completed in-memory report first. The named H-MEM volume survives that rebuild.

The optional AWS file requires an existing `~/.aws` directory. Alternatively, use a container-accessible workload identity or supply AWS credential environment variables through your local `.env`; no host AWS mount is needed for Demo. With host networking, `127.0.0.1` service URLs refer to the host, so a host-local Zetaris URL is reachable when that service is running. Live investigation remains read-only for AWS; saving a decision still needs the explicit Zetaris append configuration and a user click.

For the local Node path, install **Git and Node.js 24+**:

```bash
git clone https://github.com/milaforge/cloud-cost-investigator.git
cd cloud-cost-investigator
npm ci
npm start
```

Choose **Demo**, select a scenario and see the investigation result. Open the printed loopback URL if the browser does not open. Stop with Ctrl+C; use `npm start -- --no-open` on a headless machine.

For service-dependent features, copy `.env.example` to `.env` **only if absent**; otherwise merge settings. Never commit credentials. Shell variables take precedence except that web startup uses project `.env` AWS profile and region when present. Configure only what you need:
- [AWS credentials, scope and data prerequisites](docs/AWS_SETUP.md) for live evidence.
- [Chat Completions provider/model configuration](docs/CLI_GUIDE.md#model-configuration) for real inference, which may incur usage.
- [Persistent H-MEM](docs/MEMORY.md#configuration) for lessons across CLI runs.
- [Zetaris installation and app connection](docs/ZETARIS_SETUP.md) for durable decision history. Retained writes require explicit authorization and append configuration.

[Full setup and clean-checkout procedure](docs/HOW.md).

## 6. Usage

First run: synthetic evidence and scripted planning. Command-local settings disable configured historical stores:

```bash
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= ZETARIS_HISTORY_ALLOW_APPEND=false npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario B
```

Output shape, abridged (evidence IDs vary):

```text
NOT RECOMMENDED — i-mock-primary
Window: 00:00–06:00 UTC daily
Why: Critical job mock-critical-daily-batch runs 02:00–03:00 UTC, overlapping proposed shutdown 00:00–06:00 UTC; reject this window.
Evidence: get_ec2_operations (ok) [current-run evidence ID]
Next: Keep the proposed window rejected; review the cited conflict with the resource owner.
Mode: MOCK (synthetic data; no AWS calls); planner: scripted
Read-only. Any infrastructure change requires human review and approval.
```

Add **one** flag: `--verbose` for full evidence/trace, `--json` for the report, or `--trace-jsonl` for decision events. Redirect stdout to save output; JSONL emits after finalization. Reports include citations, exact missing checks and human actions. New reports always have null savings. [CLI reference](docs/CLI_GUIDE.md).

For live, read-only AWS evidence, configure the intended identity first and replace the account placeholder:

```bash
npm run --silent investigate -- --account YOUR_12_DIGIT_ACCOUNT_ID --region us-east-1
```

**Live AWS is the CLI default.** The account argument verifies scope; it does not supply credentials. Planning defaults to scripted; add `--planner model` for your configured provider or `--planner nvidia` for the NVIDIA preset. Neither evidence nor model failures switch to demo results.

## 7. Sample mode and verification

`--evidence mock` selects [synthetic input observations](src/investigation/mock.ts). The engine computes reports at runtime; no stored final answers are returned.

| Scenario                          | What it demonstrates                                               | Expected result / exit              |
| --------------------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| `B`                               | A critical job contradicts the initial window                      | `not_recommended` / 0               |
| `C`                               | A dependency requires continuous operation                         | `not_recommended` / 0               |
| `missing`                         | Critical authority is unavailable                                  | `needs_verification`, partial / 2   |
| `A`                               | Technical checks find no conflict; human decision remains external | `needs_verification`, partial / 2   |
| `mixed` with `--max-candidates 3` | Three ranked candidates with different outcomes                    | Per-candidate verdicts; partial / 2 |

In **Demo**, Learn and Follow through are illustrations only: no model calls, memory storage or remote writes. In **Live**, Learn displays the selected report’s memory status, while **Save decision to Zetaris** records review requests for rejected or deferred results. Actual H-MEM learning and synthetic Zetaris round-trip proofs use separate CLI commands. [Browser workflows](docs/HOW.md#open-the-web-demo).

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
```

These checks use local fixtures and exclude paid live integration tests. [Evaluation and recorded measurements](docs/evaluation/README.md) distinguish policy tests, actual model calls and sponsor persistence.

## 8. Failure handling

| Failure                                        | Behavior                                                                                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required inventory fails                       | Retry the same read up to three times after the initial attempt within budgets; then stop with a named failure and exit 1. Invalid scoped data is terminal. Inventory precedes billing. |
| Billing unavailable or spend absent            | Preserve the gap; investigate validated running inventory, ordered by available spend then instance ID.                                                                                 |
| Authenticated empty inventory                  | Successful no-candidate result; no billing query needed.                                                                                                                                |
| Missing, partial or empty operational evidence | Preserve status and defer unknown safety. Failed reads have bounded retries; empty results cannot establish clearance.                                                                  |
| Unsupported recommendation                     | Deterministic evaluator blocks it; retrieved contradictions reject the evaluated window.                                                                                                |
| Model unavailable                              | Up to three attempts per decision for transient failures, within budgets. Permanent errors, malformed output and cancellation are terminal. No scripted fallback.                       |
| Runtime/call budget exhausted                  | Preserve completed findings and defer unresolved candidates. Live planning shares a 15-minute total budget, 60-second model-call cap and finalization reserve.                          |
| History read/write fails                       | Disclose separately; history cannot replace current evidence. Never automatically retry an uncertain append.                                                                            |
| Invalid CLI input                              | Exit 1 with a validation message before investigation.                                                                                                                                  |

Exit **0** means a completed scoped investigation, including a rejection or no candidates; **2** means partial; **1** means failure or invalid invocation. [Exact retry and deadline policy](docs/CLI_GUIDE.md#failure-behavior).

## 9. Data and licensing

Bundled scenarios and demo records are labeled synthetic. Live reports contain account/resource identifiers and operational details; keep them out of public artifacts. Credentials remain server-side.

The project [`package.json`](package.json) declares **Apache-2.0**. The vendored H-MEM reference also declares Apache-2.0 and retains its [upstream documentation and attribution](vendor/hmem/README.md).

## 10. Limitations

- AWS EC2 scheduling only, at most three candidates; daily same-day UTC windows. No resizing, multi-cloud or automated remediation.
- Native live evidence can identify dated SSM maintenance overlapping a proposed window. ELBv2 registrations are context, not proof of a continuous-operation obligation. Jobs outside SSM, dependencies outside ELBv2 and owner/calendar/recovery clearance remain unknown; synthetic job/dependency examples do not prove those live integrations.
- Low CPU, a `dev` tag or an empty query cannot establish safety. New runs never produce savings; pricing arithmetic is retained only to validate historical reports.
- Historical decisions and H-MEM lessons are not current facts. Sponsor integrations with synthetic evidence do not prove live AWS safety or realized savings.

[Current verification status and remaining release gates](docs/EXECUTION_PLAN.md) are tracked separately from product capabilities.

## 11. Pre-existing components

CCI extends the TypeScript notebook starter and [Meterless H-MEM reference](vendor/hmem/README.md), including its hash embedder and JSON persistence. The optional notebook is not invoked by the demo.

Project-specific extensions include the CLI, evidence adapters, bounded loop, safety policy, report validation and follow-through. Exact build-window attribution requires Git-history review; [Reuse and development details](docs/components.md#reused-components).
