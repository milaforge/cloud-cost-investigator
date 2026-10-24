# Learning from outcomes

[Documentation index](../README.md) · [Project](../../README.md)

Suppose a team accepts a shutdown recommendation, then rolls it back because
another service needs the server running:

1. The engineer records the rollback in Zetaris and selects the dependency check
   as the relevant issue.
2. On the next investigation of that server and shutdown window, CCI automatically
   stores the feedback as an H-MEM lesson and checks dependencies first.
3. Fresh evidence decides the result. If the dependency is gone, CCI continues its
   other safety checks and replaces the old lesson with the new findings.

This works with **Zetaris history and H-MEM persistence enabled**. Today, structured
rollback feedback can prioritize dependency or critical-job checks; free-text notes
are not interpreted as instructions. Outcomes remain operator-reported, and a
successful outcome never removes required safety checks. An offline end-to-end
test proves this example with synthetic evidence and a Zetaris HTTP fixture;
[live-service verification remains separate](../EXECUTION_PLAN.md).
See [how to record an outcome](../FOLLOW_UP.md#automatic-learning-from-outcomes).

[Next: inspect components and architecture](../components.md).
