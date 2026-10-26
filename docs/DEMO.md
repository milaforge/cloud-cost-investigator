# Demo and deck preparation

[What](../README.md) · [How](HOW.md)

Use the [adopted quality bar](../the_bar.md) to show working behavior and useful decisions. This page owns the recording storyboard; the [eight-slide Markdown deck](../slides.md) owns slide content. Completion evidence belongs in the [release checklist](EXECUTION_PLAN.md).

Use the [browser preview](HOW.md#open-the-web-demo) to walk through labeled
synthetic reports and illustrative learning/follow-through paths in **Demo**.
Demo is preview-only; selecting B opens its generated report and citations
without executing a new investigation. Learning/follow-through illustrations
are not sponsor integration receipts. Use the separate CLI demonstrations below
for actual execution proof. **Live** exposes AWS investigation and attributed
Zetaris decision recording with explicit acknowledgments; it never offers the
synthetic learning or remote-write demonstration. Label each separately recorded
run and preserve source/planner labels throughout.

## A 3 minute 30 second recording

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–0:20 | Project name and Track 02; engineer's decision | “Low average CPU can hide a critical overnight job. We investigate which EC2 shutdown windows deserve human review, rejection or further verification.” |
| 0:20–0:50 | [Architecture diagram](components.md) | Planner chooses checks; trusted execution validates evidence; the evaluator can reject a proposal or demand more checks. Identify shared state and the feedback edge. |
| 0:50–1:35 | Execute the [B capture command](CLI_GUIDE.md#capture-and-read-the-decision-trace), display its own report | Keep `MOCK` and `scripted` labels visible. Explain inventory/cost selection, the proposed window, and why a plausible window still needs a challenge. For a model demonstration, select the configured real model explicitly and show its actual decisions and timing. |
| 1:35–2:10 | Proposal, evaluator challenge, retrieved operations evidence and rejection | Resolve the contradiction citation against this run's evidence. The critical job disproves the proposed window; the system never stops the instance. |
| 2:10–2:55 | [H-MEM demonstration](evaluation/README.md#learn-a-check-finish-earlier-then-change-the-conclusion) and [Zetaris follow-through](FOLLOW_UP.md#reproducible-proof) receipts | Show real persistence and retrieval, fresh evidence on reuse, and an attributed decision/review. State whether the displayed proof is a separate recorded run. Use the [sponsor explanation](components.md#sponsor-technology-explanation) for the actual roles; the standalone B run calls neither historical service nor NVIDIA. |
| 2:55–3:30 | Final disposition, next human action and limitations | Reject this window; obtain missing operational authority before considering another. Mention the missing-source deferral, read-only boundary and current live-evidence limits. Do not claim realized savings. |

Pre-run slower service-dependent demonstrations and retain their full reports; label excerpts as recorded evidence, not a single uninterrupted run. A failed real-model run stays a failure; a scripted rerun must be identified. Never show `.env`, provider keys, private endpoints or sensitive resource exports. Capture synthetic operational data for the public video. Verify the final exported duration is **1–4 minutes** and inspect the full recording for readable commands, citations, source labels and secrets before release.

## Slide deck

The [eight-slide Markdown deck](../slides.md) follows the required sequence:
problem/users, solution, agent workflow, technical stack, sponsor roles,
distinctive behavior, product output and future enhancements. Horizontal rules
separate slides; expandable speaker notes contain sources and presentation context.

Credit the inherited notebook and vendored H-MEM in the [reused-component declaration](components.md#reused-components). Confirm build-window attribution, actual Cursor activity and portal requirements with the team. Illustrative examples do not establish these facts. Store final deck/video links and their verified checks in the execution plan rather than maintaining another status list here.
