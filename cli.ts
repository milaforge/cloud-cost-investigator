import { pathToFileURL } from 'node:url';
import { loadProjectEnv } from './src/config.ts';
import { type InvestigationRequest, validateRequest } from './src/contracts.ts';
import { MockProvider } from './src/investigation/mock.ts';
import { OpenAICompatiblePlanner } from './src/investigation/model.ts';
import { NvidiaPlanner } from './src/investigation/nvidia.ts';
import { ScriptedPlanner } from './src/investigation/planner.ts';
import { renderReport, validateReport } from './src/investigation/report.ts';
import { runInvestigation } from './src/investigation/run.ts';

export const HELP = `Cloud Cost Investigator

Usage: npm run investigate -- --account demo --region us-east-1 [options]

Options:
  --account ID          Required investigation account scope
  --region REGION       Required AWS region scope
  --lookback-days N     UTC observation period, 1–90 days (default: 28)
  --max-candidates 1    This first slice supports one discovered candidate
  --planner MODE        scripted (default), model, or nvidia (legacy alias)
  --scenario MODE       B (default), clear, or missing
  --json                Write only the validated report JSON to stdout
  --help                Show this help

Current evidence always comes from labeled synthetic mocks; AWS is never called.
The CLI loads .env without overriding shell variables. The model planner uses
LLM_BASE_URL, LLM_MODEL and optional LLM_API_KEY (or legacy NVIDIA settings).
Current evidence remains mock; model failure never falls back to
scripted planning. Set HMEM_PERSIST_DIR for local reasoning memory and
ZETARIS_HISTORY_TABLE for history reads; appends require ZETARIS_HISTORY_ALLOW_APPEND=true.
Exit status: 0 complete, 2 partial, 1 failed or invalid invocation.
`;

export interface CliOptions {
  request: InvestigationRequest;
  planner: 'scripted' | 'model' | 'nvidia';
  scenario: 'B' | 'clear' | 'missing';
  json: boolean;
}

export function parseArgs(
  argv: string[],
  now = Date.now(),
): CliOptions | 'help' {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h'))
    return 'help';
  if (argv[0] !== 'investigate')
    throw new Error('Expected investigate command');
  if (argv.length === 2 && argv[1] === '--help') return 'help';
  const values = new Map<string, string>();
  let json = false;
  const allowed = [
    '--account',
    '--region',
    '--lookback-days',
    '--max-candidates',
    '--planner',
    '--scenario',
  ];
  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--json') {
      if (json) throw new Error('Duplicate flag');
      json = true;
      continue;
    }
    if (!allowed.includes(flag) || values.has(flag))
      throw new Error('Unknown or duplicate flag');
    const value = argv[++i];
    if (value === undefined || value.startsWith('--'))
      throw new Error('Missing flag value');
    values.set(flag, value);
  }
  const days = values.get('--lookback-days') ?? '28';
  if (!/^(?:[1-9]|[1-8][0-9]|90)$/.test(days))
    throw new Error('Invalid lookback');
  if ((values.get('--max-candidates') ?? '1') !== '1')
    throw new Error('Unsupported candidate limit');
  const planner = values.get('--planner') ?? 'scripted';
  const scenario = values.get('--scenario') ?? 'B';
  if (planner !== 'scripted' && planner !== 'model' && planner !== 'nvidia')
    throw new Error('Invalid planner');
  if (scenario !== 'B' && scenario !== 'clear' && scenario !== 'missing')
    throw new Error('Invalid scenario');
  const request = validateRequest({
    account_id: values.get('--account'),
    region: values.get('--region'),
    max_candidates: 1,
    window: {
      from: new Date(now - Number(days) * 86_400_000).toISOString(),
      to: new Date(now).toISOString(),
    },
  });
  return { request, planner, scenario, json };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  let options: CliOptions | 'help';
  try {
    options = parseArgs(argv);
  } catch {
    process.stderr.write(
      'Invalid invocation. Run with --help for supported arguments.\n',
    );
    return 1;
  }
  if (options === 'help') {
    process.stdout.write(HELP);
    return 0;
  }
  try {
    const planner =
      options.planner === 'model'
        ? new OpenAICompatiblePlanner()
        : options.planner === 'nvidia'
          ? new NvidiaPlanner()
          : new ScriptedPlanner();
    const report = validateReport(
      await runInvestigation(options.request, {
        provider: new MockProvider(options.scenario),
        planner,
        history: {
          hmem_directory: process.env.HMEM_PERSIST_DIR || undefined,
          zetaris: !!process.env.ZETARIS_HISTORY_TABLE,
        },
      }),
    );
    process.stdout.write(
      options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : renderReport(report),
    );
    return report.completion_status === 'complete'
      ? 0
      : report.completion_status === 'partial'
        ? 2
        : 1;
  } catch {
    process.stderr.write(
      'Investigation failed. Check the selected planner configuration and supported inputs; no fallback was used.\n',
    );
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    loadProjectEnv();
    process.exitCode = await main();
  } catch {
    process.stderr.write('Unable to load .env configuration.\n');
    process.exitCode = 1;
  }
}
