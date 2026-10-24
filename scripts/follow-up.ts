import { open } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { loadProjectEnv } from '../src/config.ts';
import { validateScope } from '../src/contracts.ts';
import {
  listFollowUps,
  recordDecision,
  recordOutcome,
  recordReview,
  reviewRequest,
} from '../src/investigation/follow-up.ts';
import { MockProvider, type MockScenario } from '../src/investigation/mock.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';

export const FOLLOW_UP_HELP = `Usage: npm run --silent followup -- COMMAND [flags]
  decide  --report report.json --instance ID --input decision.json
  list    --account ID --region REGION --instance ID
  review  --account ID --region REGION --decision ID --scenario A|B|C|clear|missing [--planner scripted|model]
  outcome --account ID --region REGION --decision ID --input outcome.json

Decision JSON: {"kind":"deferred","actor":"engineer-id","reason":"Review after migration","review_at":"UTC timestamp"}
Or: {"kind":"accepted","actor":"engineer-id","reason":"Accepted for separate human-controlled change process"}
Outcome JSON: {"actor":"engineer-id","reason":"Observed result","observed_at":"UTC timestamp","result":"implemented|not_implemented|rolled_back","evidence_reference":"ticket-or-receipt-id"}

Zetaris is live; writes require ZETARIS_HISTORY_ALLOW_APPEND=true. No schema provisioning.
Review evidence is MOCK; explicitly select a scenario. The optional model planner is live.
Decisions are operator-attributed, not authenticated approvals. Outcomes are operator-reported,
not verified savings. No infrastructure execution. Stdout is JSON; stderr is progress.
Exit: 0 success, 2 partial review, 1 failure. Single writer; no automatic write retries.`;

async function readJson(path: string) {
  const file = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(1_048_577);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await file.read(
        buffer,
        offset,
        buffer.length - offset,
        null,
      );
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > 1_048_576) throw new Error('follow_up_input_too_large');
    return JSON.parse(buffer.toString('utf8', 0, offset));
  } finally {
    await file.close();
  }
}
export async function followUpMain(args: string[]): Promise<number> {
  if (args.length === 1 && args[0] === '--help') {
    console.log(FOLLOW_UP_HELP);
    return 0;
  }
  const commands: Record<string, string[]> = {
    decide: ['--report', '--instance', '--input'],
    list: ['--account', '--region', '--instance'],
    review: ['--account', '--region', '--decision', '--scenario', '--planner'],
    outcome: ['--account', '--region', '--decision', '--input'],
  };
  const [command, ...rest] = args;
  const allowed = commands[command];
  if (!allowed || rest.length % 2)
    throw new Error('follow_up_arguments_invalid');
  const options = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    if (
      !allowed.includes(rest[i]) ||
      options.has(rest[i]) ||
      rest[i + 1].startsWith('--')
    )
      throw new Error('follow_up_arguments_invalid');
    options.set(rest[i], rest[i + 1]);
  }
  const required = (key: string) => {
    const value = options.get(key);
    if (!value) throw new Error('follow_up_arguments_invalid');
    return value;
  };
  for (const key of allowed.filter((k) => k !== '--planner')) required(key);
  loadProjectEnv();
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
  console.error(
    `[followup] ${command}: scoped Zetaris history; infrastructure writes disabled`,
  );
  let output: unknown;
  let exit = 0;
  if (command === 'decide') {
    output = await recordDecision(
      validateReport(await readJson(required('--report'))),
      required('--instance'),
      await readJson(required('--input')),
    );
  } else {
    const scope = validateScope({
      account_id: required('--account'),
      region: required('--region'),
    });
    if (command === 'list')
      output = await listFollowUps(scope, required('--instance'));
    else if (command === 'outcome')
      output = await recordOutcome(
        scope,
        required('--decision'),
        await readJson(required('--input')),
      );
    else {
      const scenario = required('--scenario');
      const planner = options.get('--planner') ?? 'scripted';
      if (
        !['A', 'B', 'C', 'clear', 'missing'].includes(scenario) ||
        !['scripted', 'model'].includes(planner)
      )
        throw new Error('follow_up_arguments_invalid');
      const { request, decision } = await reviewRequest(
        scope,
        required('--decision'),
      );
      if (decision.record.source_mode !== 'mock')
        throw new Error('follow_up_live_evidence_unavailable');
      console.error(
        '[followup] review due: collecting new MOCK evidence; historical verdict is not reused',
      );
      const report = await runInvestigation(request, {
        provider: new MockProvider(scenario as MockScenario),
        planner:
          planner === 'model'
            ? new OpenAICompatiblePlanner()
            : new ScriptedPlanner(),
        onProgress(event) {
          if (event.event === 'planner_start')
            console.error(`[followup] planner call ${event.call}`);
          else if (event.event === 'trace' && event.phase === 'tool')
            console.error(`[followup] ${event.tool} ${event.status}`);
          else if (event.event === 'trace' && event.failure_code)
            console.error(`[followup] ${event.failure_code}`);
        },
      });
      output = {
        report,
        receipt: await recordReview(scope, required('--decision'), report),
      };
      exit = report.completion_status === 'complete' ? 0 : 2;
    }
  }
  console.log(JSON.stringify(output, null, 2));
  return exit;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.exitCode = await followUpMain(process.argv.slice(2));
  } catch (error) {
    const code =
      error instanceof Error &&
      /^(follow_up|zetaris)_[a-z_0-9]+$/.test(error.message)
        ? error.message
        : 'follow_up_failed';
    console.error(`[followup] ${code}`);
    process.exitCode = 1;
  }
}
