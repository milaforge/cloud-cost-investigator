# Why

[What](../README.md) · **Why** · [How](HOW.md)

Low average CPU can hide a weekly batch job or a service that needs continuous uptime. A cost-saving suggestion is useful only if an engineer can understand the operational reasons it could fail.

CCI challenges each proposed shutdown window. In the main demo, apparently idle overnight capacity looks promising until a fresh check finds a critical batch job in that window. The agent rejects the schedule and cites the contradiction. When critical evidence is missing, it defers the decision.

The goal is to help infrastructure engineers decide which opportunities deserve human review, which should be rejected, and which need more evidence.

[How: try the demo and explore the implementation](HOW.md).
