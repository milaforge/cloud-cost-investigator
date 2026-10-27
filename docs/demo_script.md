# Cloud Cost Investigator — Demo Script

A 3 minute 30 second narration companion to the [canonical recording guide](docs/DEMO.md). Keep the final video within 1–4 minutes. Show executed behavior and label synthetic evidence, scripted planning and separately recorded service proof.

## Structure (3 minutes 30 seconds)

| Time      | Segment            | What to show                                                           |
| --------- | ------------------ | ---------------------------------------------------------------------- |
| 0:00–0:20 | Problem            | The engineer, Track 02 and the shutdown-window decision                |
| 0:20–0:50 | Architecture       | README source overview, then the four-role interaction diagram         |
| 0:50–1:40 | Investigation      | Execute synthetic Scenario B and show its report                       |
| 1:40–2:20 | Role interactions  | Proposed window, fresh contradiction, evaluator rejection and citation |
| 2:20–2:50 | Sponsor technology | Separately labeled H-MEM, Zetaris and NVIDIA execution receipts        |
| 2:50–3:30 | Output and impact  | Window-scoped verdict, missing evidence and next human action          |

## Script

### 0:00–0:20 — Problem

> "Low average CPU makes an EC2 instance look safe to shut down overnight. But a critical job or dependency may still need it. Cloud Cost Investigator is our Track 02 entry: The Agent That Can Explain Why. It finds a specific reason to reject a shutdown window, or explains what's missing and defers."

### 0:20–0:50 — Architecture

Show the [README diagrams](README.md#3-what-makes-this-an-agent-system): first the scattered sources, then role interactions. Keep the detailed investigation diagram collapsed unless needed.

> "The engineer starts an investigation across EC2 inventory, billing, CloudWatch metrics, SSM maintenance windows and load balancer dependencies. One engine has four roles: the Planner chooses checks, the Executor fetches and validates evidence, the Safety evaluator challenges the window, findings feed back into planning, and the Report validator and renderer checks and explains the result. "

### 0:50–1:40 — Investigation

Execute this isolated synthetic run. Keep its `MOCK` and `scripted` labels visible; it makes no AWS, model or historical-service calls.

```bash
ZETARIS_HISTORY_TABLE= HMEM_PERSIST_DIR= npm run --silent investigate -- --evidence mock --planner scripted --account demo --region us-east-1 --scenario B --verbose
```

> "Here we're asking whether an overnight shutdown window has an operational conflict. This demonstration uses synthetic AWS evidence and scripted planning. Inventory discovery runs first. Available billing helps rank candidates, then the investigator checks utilization and operational constraints. Low CPU suggests a possible window; it doesn't establish safety."

For a real-model segment, use a separately captured [model-driven trace](docs/TRACE_EXAMPLE.md), preserving its actual date, evidence mode and policy. Do not describe the scripted command above as NVIDIA execution or a live AWS run.

### 1:40–2:20 — Role interactions

Show this run's proposed and contradicted hypothesis, then resolve its contradiction citation against its own operations evidence. Do not splice evidence IDs from different runs.

> "The proposed window is midnight to six UTC. Freshly retrieved evidence identifies a critical job from two to three, directly inside that window. The evaluator rejects the proposal because of that conflict. The engine still attempts the remaining checks within its budget, and the report ties the rejection to the retrieved evidence. No instance is stopped."

Only narrate retries if the displayed trace actually contains them. A separate missing-source example should show deferral, not invented certainty or recovery.

### 2:20–2:50 — Sponsor technology

Show separately recorded [sponsor receipts](docs/components.md#sponsor-technology-explanation), [H-MEM learning proof](docs/evaluation/README.md#learn-a-check-prioritize-it-then-change-the-conclusion) and [Zetaris follow-through proof](docs/FOLLOW_UP.md#reproducible-proof). Label historical recommendation/outcome receipts with their original policy; they do not establish new-policy live verification.

> "These separate recordings show the sponsor integrations. Meterless H-MEM stores scoped lessons that prioritize future checks, while fresh evidence still decides the result. Zetaris preserves decision follow-through and review history; validated historical outcomes can teach H-MEM. NVIDIA-hosted Nemotron supplies adaptive planning in model-driven runs. Meterless is the reasoning memory, not the model-call router."

Use this narration only alongside matching receipts. The browser's Demo learning and follow-through illustrations are not proof of remote sponsor calls.

### 2:50–3:30 — Output and impact

Return to Scenario B's report. Point to the rejected window, its reason and the concrete next human action. Briefly show a labeled missing-evidence result if time permits.

> "The useful result is specific: reject this midnight-to-six window because it overlaps a critical job. If essential evidence is missing, the system names the gap and defers. Even complete checks with no conflict defer the authorized shutdown decision to a human. Engineers get an explanation they can inspect and a concrete next step. CCI stays read-only against AWS and claims no realized savings."

## Recording checklist

- [ ] Final export is 1–4 minutes and names Track 02 and the engineer's decision.
- [ ] Shows both simple diagrams and describes four roles within one engine.
- [ ] Shows an executed investigation with evidence and planner modes visible.
- [ ] Shows the proposal, fresh contradiction, rejected window and matching citation.
- [ ] Labels separate sponsor recordings, historical policies and synthetic data accurately.
- [ ] Shows the next human action and preserves the infrastructure approval boundary.
- [ ] Contains no API keys, credentials, private endpoints or sensitive AWS exports.

Record final video links and verified release checks in [docs/EXECUTION_PLAN.md](docs/EXECUTION_PLAN.md).
