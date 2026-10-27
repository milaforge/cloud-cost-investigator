# Slide evidence captures

These files support the eight-slide source in [slides.md](../../slides.md).
They contain synthetic operational data only.

| Files | Origin and meaning |
| --- | --- |
| `B.json`, `missing.json`, `changed.json` | Captured Oct 27, 2026 using `generateDemoReports()` in `scripts/demo-web.ts`, then checked with `validateReport`. They correspond to browser B, D and G. Current observations come from the mock provider; planning is scripted; Zetaris/H-MEM preview history is isolated in memory. |
| Matching `.txt` files | Exact `renderReport(report, { verbose: false })` output from those JSON reports. |
| `B-excerpt.txt`, `scenario-b-cli.png` | Verbatim selected lines from B, retaining the citation, mock/scripted label and human-approval boundary. The image renders text using ImageMagick and Noto Sans Mono. It is not a browser or terminal screenshot. |
| `hmem-proof.json` | Metadata/checks from `demonstrateWarmLearning('scripted')`: real temporary local H-MEM reopened between cold C, warm C and changed A runs. All 15 checks passed. No Zetaris, AWS or paid model calls. Both planner and tool call savings were zero; tiny fixture timing differences do not establish a speedup. |

The complete B report resolves the pictured citation to the actual retrieved
operations observation. D retains partial job coverage; G compares a seeded old
rejection with a fresh deferral. The seeded browser history is distinct from the
separate H-MEM persistence measurement.

To reproduce policy behavior, run the local demo and explicitly select B, D or G.
To reproduce real local memory behavior, run `npm run demo:warm`. IDs, execution
timestamps and timings will differ. Do not silently regenerate these captures
without updating the corresponding slide image and verifying its citation.

To rerender the current retained CLI excerpt with the installed font:

```bash
magick -background '#0b1724' -fill '#f3f7fa' \
  -font /usr/share/fonts/google-noto/NotoSansMono-Regular.ttf \
  -pointsize 23 -interline-spacing 6 \
  label:@docs/presentation-assets/B-excerpt.txt \
  -bordercolor '#0b1724' -border 30 \
  docs/presentation-assets/scenario-b-cli.png
```

The deck also links separately retained October 26 real-model reliability and
sanitized live AWS/NVIDIA receipts. This capture did not rerun those services.
