> Built to participate in **Open Agent Hackathon 2026 — Track 02: The Agent That Can Explain Why**.
# Cloud Cost Investigator

**An agent that finds AWS EC2 savings and challenges proposed shutdowns with fresh evidence.** It never changes infrastructure.

**Dependencies:** Node.js 24+, npm and Git. The synthetic scripted demo needs no GPU, credentials or services; live features need AWS access, a model provider and/or Zetaris. Meterless H-MEM is vendored.
**Setup:** clone this repository and run `npm ci`.
**Usage (synthetic demo):** `npm run investigate -- --evidence mock --account demo --region us-east-1`

[Why](docs/WHY.md) · [How](docs/HOW.md)
