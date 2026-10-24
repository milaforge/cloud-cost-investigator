import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  exact,
  member,
  identifier,
  integer,
  validateScope,
} from '../src/contracts.ts';
import { modelConfigFromEnv } from '../src/config.ts';

export type DemoRun = {
  request_id: string;
  kind: 'investigate' | 'learn' | 'followup';
  planner: 'scripted' | 'model';
  real_services: boolean;
  allow_append: boolean;
  history: boolean;
  evidence: 'mock' | 'aws';
  scenario: 'A' | 'B' | 'C' | 'mixed' | 'missing';
  account: string;
  region: string;
  max_candidates: number;
};
export function validateDemoRun(value: unknown): DemoRun {
  const o = exact(value, [
    'request_id',
    'kind',
    'planner',
    'real_services',
    'allow_append',
    'history',
    'evidence',
    'scenario',
    'account',
    'region',
    'max_candidates',
  ]);
  const kind = member(o.kind, ['investigate', 'learn', 'followup']);
  const planner = member(o.planner, ['scripted', 'model']);
  const evidence = member(o.evidence, ['mock', 'aws']);
  const scenario = member(o.scenario, ['A', 'B', 'C', 'mixed', 'missing']);
  if (
    typeof o.real_services !== 'boolean' ||
    typeof o.allow_append !== 'boolean' ||
    typeof o.history !== 'boolean'
  )
    throw new Error('Explicit service choices required');
  if (
    (planner === 'model' ||
      evidence === 'aws' ||
      kind === 'followup' ||
      o.history) &&
    !o.real_services
  )
    throw new Error('Real services require opt-in');
  if (
    kind === 'followup' &&
    (!o.allow_append || planner !== 'scripted' || evidence !== 'mock')
  )
    throw new Error(
      'Follow-through requires explicit append and synthetic evidence',
    );
  if (kind !== 'followup' && o.allow_append)
    throw new Error('No history writes on this action');
  if (kind !== 'investigate' && o.history)
    throw new Error('History recall is an investigation option');
  if (kind !== 'investigate' && evidence !== 'mock')
    throw new Error('This demonstration requires mock evidence');
  const scope = validateScope({ account_id: o.account, region: o.region });
  if (evidence === 'aws' && !/^\d{12}$/.test(scope.account_id))
    throw new Error('AWS account required');
  return {
    request_id: identifier(o.request_id),
    kind,
    planner,
    evidence,
    scenario,
    real_services: o.real_services,
    allow_append: o.allow_append,
    history: o.history,
    account: scope.account_id,
    region: scope.region,
    max_candidates: integer(o.max_candidates, 1, 3),
  };
}
export function demoConfiguration() {
  let model = false;
  try {
    modelConfigFromEnv();
    model = true;
  } catch {
    /* Presence/format only, no network probe. */
  }
  const env = process.env;
  const login = !!(env.ZETARIS_USERNAME && env.ZETARIS_PASSWORD);
  const token = !!(env.ZETARIS_API_KEY && env.ZETARIS_ORG_ID);
  return {
    model,
    zetaris: !!(
      env.ZETARIS_BASE_URL &&
      env.ZETARIS_HISTORY_TABLE &&
      (login || token)
    ),
    zetaris_append: env.ZETARIS_HISTORY_ALLOW_APPEND === 'true',
  };
}
export type DemoJob = {
  request_id: string;
  kind: DemoRun['kind'];
  status: 'running' | 'complete' | 'failed' | 'cancelled';
  started_at: string;
  finished_at?: string;
  events: string[];
  result?: unknown;
  error?: string;
};
/** One isolated worker at a time; never retry external effects after uncertainty. */
export class DemoJobs {
  current: DemoJob | null = null;
  private child?: ChildProcess;
  private requestSignature?: string;
  start(input: unknown) {
    const run = validateDemoRun(input);
    const signature = JSON.stringify(run);
    if (this.current?.request_id === run.request_id) {
      if (this.requestSignature !== signature)
        throw new Error('demo_request_conflict');
      return this.current;
    }
    if (this.child) throw new Error('demo_busy');
    const config = demoConfiguration();
    if (run.planner === 'model' && !config.model)
      throw new Error('demo_model_not_configured');
    if (run.kind === 'followup' && (!config.zetaris || !config.zetaris_append))
      throw new Error('demo_zetaris_not_configured');
    if (run.history && !config.zetaris)
      throw new Error('demo_zetaris_history_not_configured');
    const job: DemoJob = {
      request_id: run.request_id,
      kind: run.kind,
      status: 'running',
      started_at: new Date().toISOString(),
      events: [],
    };
    const directory = mkdtempSync(join(tmpdir(), 'cci-web-job-'));
    let child: ChildProcess;
    try {
      child = fork(
        fileURLToPath(new URL('./demo-web-worker.ts', import.meta.url)),
        [],
        {
          execArgv: ['--import', 'tsx'],
          env: { ...process.env, TMPDIR: directory },
          stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        },
      );
    } catch {
      rmSync(directory, { recursive: true, force: true });
      throw new Error('demo_worker_start_failed');
    }
    this.current = job;
    this.requestSignature = signature;
    this.child = child;
    const stop = (message: string, status: 'failed' | 'cancelled') => {
      if (job.status !== 'running') return;
      job.status = status;
      job.error = message;
      job.finished_at = new Date().toISOString();
      child.kill('SIGTERM');
    };
    // Existing per-call bounds still apply. A hard worker limit also contains stalled adapters.
    const timeout = setTimeout(
      () =>
        stop(
          'Demo deadline exceeded. External writes may have completed; inspect history before a new attempt.',
          'failed',
        ),
      run.kind === 'followup'
        ? 180_000
        : run.planner === 'model'
          ? 1_200_000
          : 120_000,
    );
    child.on('message', (message: unknown) => {
      if (job.status !== 'running' || !message || typeof message !== 'object')
        return;
      const m = message as { type?: string; text?: unknown; result?: unknown };
      if (m.type === 'progress' && typeof m.text === 'string') {
        job.events.push(m.text.slice(0, 500));
        if (job.events.length > 160) job.events.shift();
      } else if (m.type === 'result') {
        job.result = m.result;
      } else if (m.type === 'failure')
        stop(
          'Demo failed. No fallback or automatic retry was used. Inspect retained progress before retrying; external writes may have completed.',
          'failed',
        );
    });
    child.once('error', () =>
      stop('Could not start the demo worker.', 'failed'),
    );
    child.once('close', (code) => {
      clearTimeout(timeout);
      rmSync(directory, { recursive: true, force: true });
      this.child = undefined;
      if (job.status === 'running') {
        job.status =
          code === 0 && job.result !== undefined ? 'complete' : 'failed';
        if (job.status === 'failed')
          job.error =
            'Demo worker exited without a complete result. No retry was attempted.';
        job.finished_at = new Date().toISOString();
      }
    });
    child.send(run);
    return job;
  }
  cancel(requestId: string) {
    if (!this.current || this.current.request_id !== requestId)
      throw new Error('demo_job_not_found');
    if (this.current.status === 'running') {
      this.current.status = 'cancelled';
      delete this.current.result;
      this.current.finished_at = new Date().toISOString();
      this.current.error =
        'Stopped. External writes may have completed; inspect history before a new attempt.';
      this.child?.kill('SIGTERM');
    }
    return this.current;
  }
  close() {
    if (this.current) this.cancel(this.current.request_id);
  }
}
