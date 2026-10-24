> Built to participate in **Open Agent Hackathon 2026 — Track 02: The Agent That Can Explain Why**.
# Cloud Cost Investigator

**An agent that finds AWS EC2 savings and challenges proposed shutdowns with fresh evidence.** It never changes infrastructure.

**Dependencies:** Node.js 24+, npm and Git. Offline investigation and learning need no GPU, credentials or external services; Meterless H-MEM is vendored. Optional live features require AWS access, a model provider and/or Zetaris.
**Setup:** clone this repository, enter its directory and run `npm ci`.
**Launch the web demo:** run `npm run demo:web`. It starts a local server and opens your browser; if opening fails, use the printed URL. Stop with Ctrl+C.
**For judges:** run scenarios A/B in **Investigate**, then try **Learn**. Load existing JSON reports or inspect evidence in the UI. **Follow through** requires configured Zetaris and explicit consent to retain demo history; real-service controls are opt-in.
[Why](docs/WHY.md) · [How](docs/HOW.md)
