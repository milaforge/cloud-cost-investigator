import { pathToFileURL } from 'node:url';
import { loadProjectEnv } from './src/config.ts';
import { type InvestigationRequest, validateRequest } from './src/contracts.ts';
import type { CurrentEvidenceProvider } from './src/investigation/mock.ts';
import { MockProvider, type MockScenario } from './src/investigation/mock.ts';
import { OpenAICompatiblePlanner } from './src/investigation/model.ts';
import { NvidiaPlanner } from './src/investigation/nvidia.ts';
import { ScriptedPlanner } from './src/investigation/planner.ts';
import { renderReport, validateReport } from './src/investigation/report.ts';
import { runInvestigation } from './src/investigation/run.ts';
import { renderTraceJsonl } from './src/investigation/trace.ts';
import { createAwsEvidenceProvider } from './src/tools/aws-agent.ts';

export const HELP = `Cloud Cost Investigator

Usage: npm run investigate -- --account YOUR_12_DIGIT_ACCOUNT_ID --region us-east-1 [options]

Options:
  --account ID          Required investigation account scope
  --region REGION       Required AWS region scope
  --lookback-days N     UTC observation days: mock 1–90 (28), aws 1–14 (14)
  --max-candidates N    Investigate 1–3 ranked candidates (default: 1)
  --planner MODE        scripted (default), model, or nvidia (legacy alias)
  --evidence MODE       aws (default, read-only AWS APIs) or mock
  --scenario MODE       A, B (default), C, mixed, clear, or missing
  --json                Write only the validated report JSON to stdout
  --trace-jsonl          Write readable decision events as JSONL (excludes --json)
  --help                Show this help

AWS mode ends at the last complete UTC day and requires a 12-digit account ID.
--scenario is available only with mock evidence. AWS billing queries require
AWS_ENABLE_COST_EXPLORER=true; missing billing/operations/dependencies stay unknown.
The CLI loads .env without overriding shell variables. The model planner uses
LLM_BASE_URL, LLM_MODEL and optional LLM_API_KEY (or legacy NVIDIA settings).
Model failure never falls back to scripted planning. Set HMEM_PERSIST_DIR for local reasoning memory and
ZETARIS_HISTORY_TABLE for history reads; appends require ZETARIS_HISTORY_ALLOW_APPEND=true.
Exit status: 0 complete, 2 partial, 1 failed or invalid invocation.
`;

export interface CliOptions {
  request: InvestigationRequest;
  planner: 'scripted' | 'model' | 'nvidia';
  scenario: MockScenario;
  evidence: 'mock' | 'aws';
  json: boolean;
  trace_jsonl?: boolean;
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
  let traceJsonl = false;
  const allowed = [
    '--account',
    '--region',
    '--lookback-days',
    '--max-candidates',
    '--planner',
    '--scenario',
    '--evidence',
  ];
  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--trace-jsonl') {
      if (traceJsonl) throw new Error('Duplicate flag');
      traceJsonl = true;
      continue;
    }
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
  const evidence = values.get('--evidence') ?? 'aws';
  if (json && traceJsonl) throw new Error('Choose JSON or JSONL output');
  if (evidence !== 'mock' && evidence !== 'aws')
    throw new Error('Invalid evidence provider');
  if (
    evidence === 'aws' &&
    (values.has('--scenario') ||
      !/^\d{12}$/.test(values.get('--account') ?? ''))
  )
    throw new Error('AWS requires an account ID and no mock scenario');
  const days =
    values.get('--lookback-days') ?? (evidence === 'aws' ? '14' : '28');
  if (!/^(?:[1-9]|[1-8][0-9]|90)$/.test(days))
    throw new Error('Invalid lookback');
  if (evidence === 'aws' && Number(days) > 14)
    throw new Error('AWS lookback exceeds collector limit');
  const end =
    evidence === 'aws' ? Math.floor(now / 86_400_000) * 86_400_000 : now;
  if (!/^[1-3]$/.test(values.get('--max-candidates') ?? '1'))
    throw new Error('Unsupported candidate limit');
  const planner = values.get('--planner') ?? 'scripted';
  const scenario = values.get('--scenario') ?? 'B';
  if (planner !== 'scripted' && planner !== 'model' && planner !== 'nvidia')
    throw new Error('Invalid planner');
  if (!['A', 'B', 'C', 'mixed', 'clear', 'missing'].includes(scenario))
    throw new Error('Invalid scenario');
  const request = validateRequest({
    account_id: values.get('--account'),
    region: values.get('--region'),
    max_candidates: Number(values.get('--max-candidates') ?? '1'),
    window: {
      from: new Date(end - Number(days) * 86_400_000).toISOString(),
      to: new Date(end).toISOString(),
    },
  });
  return {
    request,
    planner,
    scenario: scenario as MockScenario,
    evidence,
    json,
    trace_jsonl: traceJsonl,
  };
}

export function createEvidenceProvider(
  options: CliOptions,
): CurrentEvidenceProvider {
  return options.evidence === 'aws'
    ? createAwsEvidenceProvider({
        config: {
          region: options.request.region,
          expectedAccountId: options.request.account_id,
          window: options.request.window,
          timeoutMs: 20_000,
        },
      })
    : new MockProvider(options.scenario);
}

export async function main(
  argv = process.argv.slice(2),
  providerFactory = createEvidenceProvider,
): Promise<number> {
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
        provider: providerFactory(options),
        ...(options.evidence === 'aws'
          ? { limits: { tool_timeout_ms: 25_000 } }
          : {}),
        planner,
        history: {
          hmem_directory: process.env.HMEM_PERSIST_DIR || undefined,
          zetaris: !!process.env.ZETARIS_HISTORY_TABLE,
        },
      }),
    );
    process.stdout.write(
      options.trace_jsonl
        ? renderTraceJsonl(report)
        : options.json
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
