# Why Cloud Cost Investigator exists

[Documentation index](../README.md) · [Project](../../README.md)

**Find ways to cut AWS costs while protecting the jobs your business depends on.**

Cloud Cost Investigator (CCI) checks when EC2 servers could be turned off,
explains the risks, and recommends what needs human review. It never changes
your infrastructure.

With memory enabled, it learns from past investigations and reported outcomes
which checks to try first. Repeated use can help it catch recurring problems
sooner, while checking fresh evidence every time.

EC2 scheduling is the hackathon scope. The long-term goal is a cost optimization
specialist agent.

## Why this exists

Low average CPU can hide a weekly batch job or a dependency that needs continuous
uptime. A useful cost recommendation must explain both the opportunity and the
operational reasons it could fail.

This investigator actively tries to disprove each proposed shutdown window.
In the main demo, utilization suggests an attractive window; a later operational
check finds a critical batch job that overlaps it. The agent rejects that window
and shows the evidence behind the change. Missing evidence leads to an explicit
deferral. Savings remain unknown unless the required pricing and scheduling
assumptions are available.

## How it works

1. Discover and rank up to three EC2 candidates in the requested account/region.
2. Propose a UTC shutdown window from current utilization evidence.
3. Challenge it with peaks, jobs, dependencies and operational clearance.
4. Replan within bounded call/time budgets, then apply deterministic safety rules.
5. Report the verdict, evidence citations, rejected hypotheses and unresolved checks.

Optional **Meterless H-MEM** lessons help choose which fresh check to run first.
**Zetaris** retains investigation history, explicit operator decisions, due reviews
and reported outcomes. Historical records never replace current telemetry or
provide permission to change AWS. [Components and architecture](../components.md).

[Next: run the demo](getting-started.md).
