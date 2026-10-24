[Documentation index](README.md)

| Aspect                             | Zetaris                                           | Meterless H-MEM                                                                       |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Information type                   | Structured, queryable historical facts            | Contextual and semantic memory                                                        |
| Example                            | Instance was running 168 hours in a recorded week | Previous investigation rejected overnight shutdown because a batch job was discovered |
| Why retrieve it?                   | Compare recorded patterns across investigations   | Prioritize relevant safety questions                                                  |
| How to use it                      | Historical reference, comparisons, trend analysis | Guide planning and tool selection                                                     |
| Can it prove current safety?       | No                                                | No                                                                                    |
| Must exist before first execution? | No                                                | No                                                                                    |

Avoid storing identical full reports in both systems. Zetaris should hold compact typed investigation records, metrics summaries, scope, timestamps, provenance, and verdict history. H-MEM should retain useful interpretations and unresolved concerns, linked by investigation IDs.

---

- Zetaris: An engineer can see what changed between recorded investigations, rather than having an opaque collection of past answers.

- Meterless: The agent carries forward relevant investigation knowledge and can select better follow-up checks rather than starting its reasoning from scratch.

the first run must remain fully useful without any prior baseline. Historical comparisons are enhancements, not prerequisites or proof of optimization safety.
