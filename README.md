# Cloud Cost Investigator

> Built to participate in **Open Agent Hackathon 2026**.

**Track**: The Agent That Can Explain Why

**Project**: CCI

**User**: Infrastructure & Backend Engineers

**Goal**: Answer "safe AWS EC2 shutdown windows to reduce monthly cloud costs".

It combines five evidence categories:

- instance inventory
- billing
- utilization
- job schedules
- and dependencies.

## Abstract Overview

```mermaid
flowchart LR
    User["Engineer"] -->|Find EC2 shutdown opportunities| Agent["CCI Agent"]
    Agent -->|Recommendation with evidence| User
    AWS["AWS"] -->|Read-only current evidence| Agent
    Agent <-->|Opt-in history across runs| Zetaris[("Zetaris<br/>Recommendations, decisions,<br/>due reviews and reported outcomes")]
    Agent <-->|Save and recall scoped lessons| Meterless[("Meterless H-MEM<br/>Job and dependency risks to check first")]
```

<details>

<summary>
Detailed Overview
</summary>

```mermaid
flowchart TD
    User["Engineer: EC2 account and region"] --> Entry["TypeScript / Node.js<br/>CLI or local web demo"]
    Entry --> State["Bounded investigation state<br/>Candidates, windows, evidence, trace, budgets"]
    State --> Planner["Planner: scripted or configured model<br/>Optional NVIDIA model calls"]
    Planner -->|Allowlisted action| Executor["Executor<br/>Validate scope and enforce deadlines"]
    Executor --> Tools["Read-only evidence tools<br/>Inventory, billing, utilization, jobs, dependencies"]
    AWS["Live AWS: EC2, Cost Explorer, CloudWatch<br/>Live jobs/dependency sources not configured"] -->|CLI default| Tools
    Mock["Synthetic evidence<br/>Explicit mock mode"] --> Tools
    Tools -->|Validated observations and evidence IDs| State
    Executor -->|Proposed shutdown window| State
    State --> Evaluator["Deterministic safety evaluator<br/>Challenge peaks, jobs, dependencies and authority"]
    Evaluator -->|More checks needed within budget| Planner
    Evaluator -->|Conditional recommendation, rejection or deferral| Report["Report validator<br/>Citations, policy and deterministic savings"]
    Report --> Output["CLI / web report<br/>Verdict, reasons, evidence, missing checks and trace<br/>Human review required; no infrastructure changes"]
    HMem[("Meterless H-MEM<br/>Scoped job and dependency lessons")] -->|Scoped hints prioritize fresh checks| Planner
    Report -->|Configured lesson persistence| HMem
    Zetaris[("Zetaris<br/>Historical recommendations, decisions,<br/>due reviews and reported outcomes")] -->|Optional historical context only| State
    Report -->|Explicitly enabled history append and readback| Zetaris
```

</details>

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

</details>

<details>
<summary>
DEMO
</summary>

```sh
npm run demo:web
```

- It starts a local server and opens your browser;
  - if opening fails, use the printed URL.
- Stop with Ctrl+C.

- run scenarios A/B in **Investigate**, then try **Learn**.

- **Follow through** requires configured Zetaris and explicit consent to retain demo history;

- real-service controls are opt-in.
- Load existing JSON reports or inspect evidence in the UI.

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

[How](docs/HOW.md)

</details>
