import { mkdtemp, rm } from 'node:fs/promises';
import { main } from '../cli.ts';
import { loadProjectEnv } from '../src/config.ts';
import { validateReport } from '../src/investigation/report.ts';

async function proof() {
  loadProjectEnv();
  if (
    !process.env.ZETARIS_HISTORY_TABLE ||
    process.env.ZETARIS_HISTORY_ALLOW_APPEND !== 'true'
  )
    throw new Error('History read/append configuration required');
  const originalDir = process.env.HMEM_PERSIST_DIR;
  const dir = await mkdtemp('/tmp/cci-warm-live-');
  process.env.HMEM_PERSIST_DIR = dir;
  const account = `warm-proof-${Date.now()}`;
  try {
    for (let run = 1; run <= 2; run++) {
      let output = '';
      const write = process.stdout.write;
      process.stdout.write = ((chunk: string | Uint8Array) => {
        output += chunk.toString();
        return true;
      }) as typeof process.stdout.write;
      let status: number;
      try {
        status = await main([
          'investigate',
          '--account',
          account,
          '--region',
          'us-east-1',
          '--json',
        ]);
      } finally {
        process.stdout.write = write;
      }
      const report = validateReport(JSON.parse(output));
      const result = {
        run,
        exit_status: status,
        evidence_mode: report.integration_mode,
        planner: report.planner.mode,
        verdict: report.candidates[0]?.verdict,
        zetaris: report.historical_context.zetaris,
        hmem: report.historical_context.hmem,
        recalled_zetaris: report.historical_context.context_ids.filter(
          (id: string) => id.startsWith('zetaris:'),
        ).length,
        recalled_hmem: report.historical_context.context_ids.filter(
          (id: string) => id.startsWith('hmem:'),
        ).length,
        append_verified: report.historical_context.limitations.some(
          (s: string) => s.startsWith('Zetaris append verified'),
        ),
        stored_hmem: report.historical_context.limitations.some((s: string) =>
          s.startsWith('H-MEM summary stored'),
        ),
        queries: report.evidence.map((e: { tool: string }) => e.tool),
      };
      console.log(JSON.stringify(result));
      if (
        status !== 0 ||
        result.verdict !== 'not_recommended' ||
        (run === 1 &&
          (result.recalled_zetaris !== 0 ||
            result.recalled_hmem !== 0 ||
            result.queries.includes('get_ec2_dependencies'))) ||
        result.zetaris !== 'ok' ||
        result.hmem !== 'ok' ||
        !result.append_verified ||
        !result.stored_hmem ||
        (run === 2 &&
          (result.recalled_zetaris !== 1 ||
            result.recalled_hmem !== 1 ||
            result.queries.indexOf('get_ec2_dependencies') >
              result.queries.indexOf('get_ec2_operations')))
      )
        throw new Error('Warm integration proof failed');
    }
  } finally {
    if (originalDir === undefined) delete process.env.HMEM_PERSIST_DIR;
    else process.env.HMEM_PERSIST_DIR = originalDir;
    await rm(dir, { recursive: true, force: true });
  }
}
proof().catch(() => {
  console.error('Warm proof failed; provider details suppressed.');
  process.exitCode = 1;
});
