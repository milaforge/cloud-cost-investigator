# Cloud Cost Investigator

> Built to participate in **Open Agent Hackathon 2026**.

**Track**: The Agent That Can Explain Why

**Project**: CCI

**User**: Infrastructure & Backend Engineers

**Goal**: Evaluate cloud usage and recommend opportunities to reduce costs. For this hackathon, start with AWS EC2 off-hours scheduling.

CCI challenges potential shutdown windows using operational evidence, then conditionally recommends a window, advises against it, or requests further verification. It's is read-only; every infrastructure change remains a human decision.

Current five evidence categories:

- instance inventory
- billing
- utilization
- job schedules
- and dependencies.

<details>
<summary>Sponsor Technology</summary>

**Zetaris (decision follow-through).** Enables revisiting a recommendation,
seeing who accepted or deferred it, and tracking its review and reported outcome.
Zetaris preserves that trail across investigations.

**Meterless H-MEM (learning across runs).** A later investigation can check a
previously discovered risk first, such as an overnight batch job. H-MEM recalls
scoped lessons so the planner can prioritize those checks using fresh evidence.

**NVIDIA (adaptive investigation).** The investigation can change its next check
as evidence arrives. NVIDIA-hosted Nemotron selects checks and proposes shutdown
windows; a deterministic evaluator rejects contradictions and defers unknowns.

**What is unique.** An engineer's reported outcome can improve the next
investigation: validated Zetaris feedback teaches H-MEM which risks to check
first. Every recommendation still requires fresh AWS evidence and human review.

[Integration details and recorded proof](docs/components.md#sponsor-technology-explanation).
Sponsor receipts use synthetic AWS evidence; the default demo uses scripted planning.

</details>

## Components - 1

```mermaid
flowchart TD
    User["Engineer"] <-->|Request / Recommendations| CCI
    CCI["CCI System"] <-->|Read-only data| AWS["AWS Cloud"]

    subgraph CCI_System["CCI System"]
        LLM["LLM Provider"]
        Zetaris["Zetaris"]
        Meterless["Meterless H-MEM"]
    end

    CCI --- CCI_System
```

### Components - 2

```mermaid

flowchart TD
    User["Engineer<br/>(Human Decision-Maker)"]

    subgraph CCI["CCI System"]
        direction TB

        Planner["Agent Planner"] --> Collector["Evidence Collector"]
        Collector --> Evaluator["Deterministic Safety Evaluator"]
        Evaluator -->|More checks needed| Planner
        Evaluator -->|Conditional / Reject / Defer| Report["Evidence-Based Report"]

        LLM["LLM Provider<br/>Proposes, never approves"] <--> Planner

        HMem[("Meterless H-MEM<br/>Reusable Risk Lessons")] -->|Guide investigation| Planner

        Zetaris[("Zetaris<br/>Decisions & Outcomes")] -->|Historical context| Planner
        Report -.->|Record recommendations| Zetaris
        Zetaris -.->|Validated outcome lessons| HMem
    end

    AWS["AWS Cloud"]

    User -->|Request / Feedback| Planner
    Collector <-->|Read-only evidence| AWS
    Report -->|Recommendations only| User

```

<details>
<summary>
Agentic Overview — At a Glance

</summary>

```mermaid
flowchart TD
    U["Engineer: find shutdown opportunities"] --> P
    subgraph Agent["Adaptive investigation"]
        P{"What should I check next?"} --> I["Investigate<br/>Read-only checks + shared evidence"]
        I --> E{"Does the evidence support this window?"}
        E -->|Need more evidence: revise within budget| P
    end
    E -->|Conditional / reject / defer| R["Validated answer + evidence trace<br/>CLI stdout / web report"]
    subgraph Improvement["Long-term improvement"]
        Z[("Zetaris: durable decision record<br/>Recommendations → decisions<br/>→ reviews + outcomes")] -.->|Validated outcome feedback| M[("Meterless H-MEM<br/>Lessons across investigations")]
    end
    Z -.->|Prior investigations for comparison| I
    R -.->|Persist recommendation + verify readback| Z
    M -.->|Prioritize fresh checks| P
    R -.->|Learn from findings| M
    classDef decision fill:#fff0c2,stroke:#805900,color:#332200,stroke-width:2px;
    class P,E decision;
    classDef primary fill:#dbeafe,stroke:#1d4ed8,color:#172554,stroke-width:3px;
    class Z primary;
    style Agent fill:#f5f3ff,stroke:#6d28d9,stroke-width:2px
    style Improvement fill:#eff6ff,stroke:#1d4ed8,stroke-width:2px
```

**Zetaris anchors long-term improvement:** it connects recommendations to
operator decisions, due reviews and reported outcomes. Validated outcome feedback
teaches H-MEM which risks to investigate first on future runs.

Diamonds mark decisions; the return arrow shows replanning. Dotted arrows show
history and learning across runs. Failures preserve findings and defer unknowns;
sample evidence requires explicit selection. The execution detail follows below.

</details>

<details>
<summary>
The Why
</summary>

Low average CPU can hide a weekly batch job or a service that needs continuous uptime. A cost-saving suggestion is useful only if an engineer can understand the operational reasons it could fail.

CCI challenges each proposed shutdown window. In the main demo, apparently idle overnight capacity looks promising until a fresh check finds a critical batch job in that window. The agent rejects the schedule and cites the contradiction. When critical evidence is missing, it defers the decision.

The goal is to help infrastructure engineers decide which opportunities deserve human review, which should be rejected, and which need more evidence.

</details>

<details>
<summary>
The How
</summary>

[Runtime details](docs/components.md) · [Trace capture](docs/CLI_GUIDE.md#capture-and-read-the-decision-trace). [How](docs/HOW.md)

</details>

### Setup

<details>
<summary>
Dependencies
</summary>

- Node.js 24+
- npm
- and Git.
- Meterless H-MEM is vendored.
- OpenAI compatible model provider
- Zetaris
- AWS access

> DEMO needs no GPU, credentials or external services;

</details>

<details>
<summary>
Setup
</summary>

```sh
git clone --depth 1 https://github.com/milaforge/cloud-cost-investigator

cd cloud-cost-investigator

npm ci
```

For persistent history and follow-through, complete [Zetaris setup](docs/ZETARIS_SETUP.md):
installation, storage provisioning and app connection.

</details>

## DEMO

```sh
git clone --depth 1 https://github.com/milaforge/cloud-cost-investigator

cd cloud-cost-investigator

npm ci

npm run demo:web
```

- It starts a local server and opens your browser;
  - if opening fails, use the printed URL.
- Stop with Ctrl+C.

- run scenarios A/B in **Investigate**, then try **Learn**.

- **Follow through** requires configured Zetaris and explicit consent to retain demo history;

- real-service controls are opt-in.
- Load existing JSON reports or inspect evidence in the UI.

See [example traces](./docs/TRACE_EXAMPLE.md).
