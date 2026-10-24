import { parseArgs, createEvidenceProvider } from '../cli.ts';
import { loadProjectEnv } from '../src/config.ts';
import { OpenAICompatiblePlanner } from '../src/investigation/model.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';
import { validateReport } from '../src/investigation/report.ts';
import { demonstrateWarmLearning } from './demo-warm.ts';
import { demonstrateFollowUps } from './demo-follow-up.ts';
import { validateDemoRun } from './demo-web-jobs.ts';

let completed = false;
process.once('disconnect', () => {
  if (!completed) process.exit(1);
});

const progress = (text: string) => process.send?.({ type: 'progress', text });
process.once('message', async (value) => {
  try {
    const run = validateDemoRun(value);
    if (run.real_services) {
      loadProjectEnv();
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    }
    let result: unknown;
    if (run.kind === 'learn') {
      progress(
        `Evidence: synthetic · Planner: ${run.planner} · H-MEM: real temporary local storage · Zetaris: disabled`,
      );
      result = await demonstrateWarmLearning(run.planner, progress);
    } else if (run.kind === 'followup') {
      if (process.env.ZETARIS_HISTORY_ALLOW_APPEND !== 'true')
        throw new Error();
      progress(
        'Real Zetaris append/readback · seven retained synthetic records · scripted planner · no AWS changes',
      );
      result = await demonstrateFollowUps(progress);
    } else {
      const args = [
        'investigate',
        '--evidence',
        run.evidence,
        '--planner',
        run.planner,
        '--account',
        run.evidence === 'mock' ? 'demo' : run.account,
        '--region',
        run.region,
        '--max-candidates',
        String(run.max_candidates),
      ];
      if (run.evidence === 'mock') args.push('--scenario', run.scenario);
      const options = parseArgs(args);
      if (options === 'help') throw new Error();
      progress(
        `Evidence: ${run.evidence} · Planner: ${run.planner} · History: ${run.history ? 'Zetaris read-only' : 'disabled'}`,
      );
      const report = validateReport(
        await runInvestigation(options.request, {
          planner:
            run.planner === 'model'
              ? new OpenAICompatiblePlanner()
              : new ScriptedPlanner(),
          provider: createEvidenceProvider(options),
          history: run.history ? { zetaris: true, zetaris_append: false } : {},
          ...(run.evidence === 'aws'
            ? { limits: { tool_timeout_ms: 25000 } }
            : {}),
          onProgress(event) {
            if (event.event === 'planner_start')
              progress(`Planner call ${event.call} started`);
            else if (event.event === 'planner_pause')
              progress(`Planner pacing: ${event.delay_ms} ms`);
            else
              progress(
                `${event.step}. ${event.phase}${event.tool ? ` · ${event.tool}` : ''}${event.status ? ` · ${event.status}` : ''}${event.failure_code ? ` · ${event.failure_code}` : ''}`,
              );
          },
        }),
      );
      if (run.evidence === 'aws') {
        for (const observation of report.evidence.filter(
          (item) => item.status === 'unavailable' || item.status === 'error',
        )) {
          const codes = observation.missing_fields.filter((field) =>
            /^(MISSING_CREDENTIALS|ACCESS_DENIED|SCOPE_MISMATCH|NETWORK_UNAVAILABLE|AWS_REQUEST_FAILED|TIMEOUT|SOURCE_UNAVAILABLE|billing_not_enabled|cost_explorer_not_enabled)$/.test(
              field,
            ),
          );
          if (codes.length)
            progress(`${observation.tool}: ${codes.join(', ')}`);
        }
      }
      if (run.history)
        progress(
          `Zetaris history read: ${report.historical_context.zetaris}; append disabled`,
        );
      result = report;
    }
    process.send?.({ type: 'result', result }, undefined, undefined, () => {
      completed = true;
      process.disconnect();
    });
  } catch {
    process.send?.({ type: 'failure' }, undefined, undefined, () => {
      completed = true;
      process.exitCode = 1;
      process.disconnect();
    });
  }
});
