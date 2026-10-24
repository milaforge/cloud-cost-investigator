# How

[What](../README.md) · [Why](WHY.md) · **How**

## Run the demo

Install the prerequisites listed in [What](../README.md). `package-lock.json` pins the CLI's TypeScript/tsx and AWS SDK dependencies; Meterless H-MEM is vendored, with no separate service required.

```bash
git clone https://github.com/milaforge/cloud-cost-investigator.git
cd cloud-cost-investigator
npm ci
npm run investigate -- --evidence mock --account demo --region us-east-1
```

The intended user is an infrastructure/platform engineer deciding which proposed shutdowns warrant human review. Expect `not_recommended`: a conflicting batch job disproves the proposed shutdown window. This demo uses **synthetic evidence and a scripted planner**. If local history is already configured, it can also read/append records; leave `ZETARIS_HISTORY_TABLE` empty and `HMEM_PERSIST_DIR` unset for an isolated run.

## Configure your investigation

Copy [.env.example](../.env.example) to `.env` **only if `.env` does not exist**; otherwise merge the needed keys. Keep it untracked. Commands load it from the working directory; existing shell variables take precedence.

| Choose | Continue here |
| --- | --- |
| Live AWS evidence and permissions | [AWS authentication](AWS_TOOLS.md#authentication-and-live-smoke-check) |
| A real model, including NVIDIA | [Model configuration](CLI_GUIDE.md#model-configuration) |
| Persistent investigation lessons | [H-MEM configuration](MEMORY.md#configuration) |
| Historical recommendations and decisions | [Zetaris provisioning](ZETARIS_HISTORY.md) |

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
