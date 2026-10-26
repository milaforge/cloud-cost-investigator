import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { generateDemoReports } from '../scripts/demo-web.ts';

// Execute the shipped browser script against its actual HTML. This DOM stub
// checks handlers and ancestor visibility; it does not prove browser layout.
function page(
  previewFetch?: (
    url: string,
  ) => Promise<{ ok: boolean; json: () => Promise<unknown> }>,
  reducedMotion = true,
) {
  const elements: Element[] = [];
  let focused: Element | undefined;
  class Element {
    children: Element[] = [];
    parent?: Element;
    dataset: Record<string, string> = {};
    attributes: Record<string, string> = {};
    listeners: Record<string, (event?: unknown) => unknown> = {};
    value = '';
    textContent = '';
    className = '';
    hidden = false;
    disabled = false;
    checked = false;
    open = false;
    required = false;
    style = {};
    animations: unknown[][] = [];
    classList = {
      add: (value: string) => {
        this.className += ` ${value}`;
      },
    };
    constructor(
      public tag = '',
      attributes = '',
    ) {
      for (const [, key, value] of attributes.matchAll(
        /([\w-]+)(?:="([^"]*)")?/g,
      )) {
        this.attributes[key] = value ?? '';
        if (key.startsWith('data-')) this.dataset[key.slice(5)] = value ?? '';
      }
      this.value = this.attributes.value ?? '';
      this.className = this.attributes.class ?? '';
      this.hidden = 'hidden' in this.attributes;
      this.disabled = 'disabled' in this.attributes;
    }
    addEventListener(name: string, fn: (event?: unknown) => unknown) {
      const hasPrevious = name in this.listeners;
      const previous = this.listeners[name];
      this.listeners[name] = (event) => {
        const pending = previous?.(event);
        const result = fn(event);
        return hasPrevious ? Promise.all([pending, result]) : result;
      };
    }
    setAttribute(key: string, value: string) {
      this.attributes[key] = value;
    }
    getAttribute(key: string) {
      return this.attributes[key] ?? null;
    }
    append(...children: Element[]) {
      for (const child of children) {
        child.parent = this;
        this.children.push(child);
      }
    }
    replaceChildren(...children: Element[]) {
      this.children = [];
      this.append(...children);
    }
    focus() {
      focused = this;
    }
    reset() {
      for (const field of this.querySelectorAll('input, textarea, select')) {
        field.value =
          field.tag === 'select'
            ? ((
                field.children.find(
                  (option) => 'selected' in option.attributes,
                ) ?? field.children[0]
              )?.value ?? '')
            : (field.attributes.value ?? '');
        field.checked = 'checked' in field.attributes;
      }
    }
    reportValidity() {
      return true;
    }
    scrollIntoView() {}
    animate(...args: unknown[]) {
      this.animations.push(args);
      return { cancel() {} };
    }
    matches(selector: string) {
      if (selector.startsWith('['))
        return selector.slice(1, -1) in this.attributes;
      if (selector.startsWith('.'))
        return this.className.split(' ').includes(selector.slice(1));
      return this.tag === selector;
    }
    querySelectorAll(selector: string): Element[] {
      return this.children.flatMap((child) => [
        ...(selector.split(',').some((part) => child.matches(part.trim()))
          ? [child]
          : []),
        ...child.querySelectorAll(selector),
      ]);
    }
    closest(selector: string): Element | undefined {
      return this.matches(selector) ? this : this.parent?.closest(selector);
    }
    get visible(): boolean {
      return !this.hidden && (this.parent?.visible ?? true);
    }
  }
  const documentRoot = new Element('document');
  const stack = [documentRoot];
  const html = readFileSync(
    new URL('../src/web/index.html', import.meta.url),
    'utf8',
  );
  for (const [, closing, tag, attrs] of html.matchAll(
    /<(\/?)([\w-]+)\b([^>]*)>/g,
  )) {
    if (closing) {
      stack.pop();
      continue;
    }
    const element = new Element(tag, attrs);
    stack.at(-1)?.append(element);
    elements.push(element);
    if (tag === 'option') {
      const select = stack.at(-1);
      if (
        select &&
        (!select.children.slice(0, -1).length ||
          'selected' in element.attributes)
      )
        select.value = element.value;
    }
    if (!['meta', 'link', 'input', 'br', 'hr'].includes(tag))
      stack.push(element);
  }
  const byId = new Map(
    elements
      .filter((el) => el.attributes.id)
      .map((el) => [el.attributes.id, el]),
  );
  const get = (id: string) => {
    const el = byId.get(id);
    assert.ok(el, `Missing HTML element: ${id}`);
    return el;
  };
  const requests: { url: string; body?: Record<string, unknown> }[] = [];
  const context = vm.createContext({
    document: {
      getElementById: get,
      get activeElement() {
        return focused;
      },
      querySelectorAll: (selector: string) =>
        documentRoot.querySelectorAll(selector),
      addEventListener() {},
      createElement: (tag: string) => new Element(tag),
      createElementNS: (_namespace: string, tag: string) => new Element(tag),
      createDocumentFragment: () => new Element(),
      createTextNode: (text: string) =>
        Object.assign(new Element(), { textContent: text }),
    },
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    setTimeout: () => 1,
    clearTimeout() {},
    AbortSignal,
    crypto: { randomUUID: () => 'ui-test' },
    fetch: (url: string, options?: { body?: string }) => {
      requests.push({
        url,
        ...(options?.body ? { body: JSON.parse(options.body) } : {}),
      });
      if (url.startsWith('/api/demos?') && previewFetch)
        return previewFetch(url);
      if (url === '/api/run')
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'fixture rejection' }),
        });
      return new Promise(() => {});
    },
  });
  const run = (code: string) => vm.runInContext(code, context);
  run(readFileSync(new URL('../src/web/app.js', import.meta.url), 'utf8'));
  const mode = (value: string) => {
    get('mode').value = value;
    get('mode').listeners.change();
  };
  const tab = (view: string) =>
    elements.find((el) => el.dataset.view === view)?.listeners.click();
  return { get, run, mode, tab, requests, elements, context };
}

test('Demo is preview-only in all three tabs, including actual scenario previews and direct handler calls', async () => {
  const p = page();
  assert.deepEqual(
    p.requests.map((r) => r.url),
    ['/api/job'],
    'startup never requests previews',
  );
  const demos = await generateDemoReports();
  p.context.previews = demos;
  p.run('Object.assign(reports, previews)');
  assert.equal(p.get('mode').value, 'demo');
  assert.equal(p.run('active'), null);
  for (const id of ['run-investigate', 'load'])
    assert.equal(p.get(id).visible, false, id);
  for (const view of ['investigate', 'learn', 'followup']) {
    p.tab(view);
    assert.equal(p.get(`view-${view}`).visible, true);
    for (const el of p.elements.filter((el) => el.matches('[data-live-only]')))
      assert.equal(el.visible, false);
    for (const el of p.elements.filter((el) =>
      ['input', 'textarea'].includes(el.tag),
    ))
      assert.equal(
        el.visible,
        false,
        `Demo exposes input: ${el.attributes.id}`,
      );
  }
  assert.equal(p.get('followup-demo').visible, true);
  p.tab('learn');
  assert.equal(p.get('learn-demo').visible, true);
  p.tab('investigate');
  for (const scenario of ['A', 'B', 'C', 'missing', 'mixed']) {
    p.get('scenario').value = scenario;
    p.get('scenario').listeners.change();
    assert.equal(p.run('active'), scenario);
    assert.ok(p.get('report').children.length);
  }
  await p.run("startRun('investigate')");
  await p.run("submitRun({kind:'decision',report:{integration_mode:'live'}})");
  await p.get('decision-form').listeners.submit({ preventDefault() {} });
  await p.run("loadReport({size:2,text:async ()=>'{}'})");
  assert.deepEqual(
    p.requests.map((r) => r.url),
    ['/api/job'],
  );
  assert.equal(
    p.elements.some((el) =>
      ['run-learn', 'run-followup', 'learn-model', 'append-ack'].includes(
        el.attributes.id,
      ),
    ),
    false,
  );

  let finishPreview = () => {};
  const pending = new Promise<{
    ok: boolean;
    json: () => Promise<unknown>;
  }>((resolve) => {
    finishPreview = () =>
      resolve({ ok: true, json: async () => ({ B: demos.B }) });
  });
  const lazy = page(() => pending);
  lazy.get('scenario').value = 'B';
  const selection = lazy.get('scenario').listeners.change();
  assert.equal(lazy.requests.at(-1)?.url, '/api/demos?scenario=B');
  assert.equal(lazy.get('report').attributes['aria-busy'], 'true');
  const previewButton = lazy.elements.find((el) => el.dataset.report === 'B');
  assert.equal(previewButton?.attributes['aria-busy'], 'true');
  assert.equal(previewButton?.disabled, true);
  assert.equal(
    lazy.get('report').children[0].className,
    'empty-report preview-loading',
  );
  assert.equal(
    lazy.get('report').children[0].children[0].attributes['aria-hidden'],
    'true',
  );
  assert.equal(lazy.get('message').textContent, 'Loading synthetic preview…');
  lazy.mode('live');
  assert.equal(previewButton?.attributes['aria-busy'], 'false');
  assert.equal(previewButton?.disabled, false);
  finishPreview();
  await selection;
  assert.equal(
    lazy.run('active'),
    null,
    'late previews cannot replace Live state',
  );
  assert.equal(lazy.get('message').textContent, '');
  assert.equal(lazy.get('report').attributes['aria-busy'], 'false');

  let available = false;
  const recovery = page(async () => ({
    ok: available,
    json: async () => ({ A: demos.A }),
  }));
  await recovery.elements
    .find((el) => el.dataset.report === 'A')
    ?.listeners.click();
  assert.equal(recovery.run('active'), null);
  assert.match(recovery.get('message').textContent, /Could not load preview/);
  assert.equal(recovery.get('report').attributes['aria-busy'], 'false');
  assert.equal(
    recovery.get('report').querySelectorAll('.preview-spinner').length,
    0,
  );
  available = true;
  await recovery.get('scenario').listeners.change();
  assert.equal(recovery.run('active'), 'A');
  assert.equal(
    recovery.get('report').querySelectorAll('.preview-spinner').length,
    0,
  );
  const requests = recovery.requests.length;
  await recovery.get('scenario').listeners.change();
  assert.equal(
    recovery.requests.length,
    requests,
    'loaded previews need no repeat fetch',
  );
});

test('expected AWS limits explain uncertainty without raw missing-evidence alarms', async () => {
  const p = page();
  const report = structuredClone((await generateDemoReports()).A);
  const candidate = report.candidates[0];
  candidate.missing_checks = [
    'get_ec2_operations (partial; JOBS_OUTSIDE_SSM_UNKNOWN, OWNER_CALENDAR_RECOVERY_CLEARANCE_REQUIRED): Ask the workload owner to supply an authoritative job schedule.',
    'get_ec2_dependencies (partial; DEPENDENCIES_OUTSIDE_ELBV2_UNKNOWN, OWNER_CALENDAR_RECOVERY_CLEARANCE_REQUIRED): Ask service owners to verify consumers.',
  ];
  candidate.next_human_actions = [
    'Obtain authorized human approval before any infrastructure change.',
  ];
  for (const observation of report.evidence) {
    if (observation.tool === 'get_ec2_operations') {
      observation.status = 'partial';
      observation.missing_fields = [
        'JOBS_OUTSIDE_SSM_UNKNOWN',
        'OWNER_CALENDAR_RECOVERY_CLEARANCE_REQUIRED',
      ];
    }
    if (observation.tool === 'get_ec2_dependencies') {
      observation.status = 'partial';
      observation.missing_fields = [
        'DEPENDENCIES_OUTSIDE_ELBV2_UNKNOWN',
        'OWNER_CALENDAR_RECOVERY_CLEARANCE_REQUIRED',
      ];
    }
  }
  p.context.coverageReport = report;
  p.run("reports.coverage = coverageReport; active = 'coverage'; render()");
  const visibleText = p
    .get('report')
    .querySelectorAll('p, span')
    .map((el) => el.textContent)
    .join(' ');
  assert.match(visibleText, /AWS operational reads completed/);
  assert.doesNotMatch(
    visibleText,
    /JOBS_OUTSIDE_SSM_UNKNOWN|OWNER_CALENDAR_RECOVERY_CLEARANCE_REQUIRED|open checks/,
  );
});

test('Live tabs expose operations and report context while excluding every demo control', async () => {
  const p = page();
  p.mode('live');
  for (const id of [
    'planner',
    'investigate-history',
    'account',
    'region',
    'candidate-limit',
    'live-services',
    'real-investigate',
    'live-scope',
    'service-status',
  ])
    assert.equal(
      p.elements.some((el) => el.attributes.id === id),
      false,
      id,
    );
  for (const id of ['run-investigate', 'load'])
    assert.equal(p.get(id).visible, true, id);
  const tabs = p.elements.filter((el) => el.dataset.view);
  for (const view of ['learn', 'followup']) {
    assert.equal(tabs.find((el) => el.dataset.view === view)?.disabled, true);
    p.tab(view);
    p.run(`showView('${view}')`);
    assert.equal(p.get(`view-${view}`).visible, false);
    assert.equal(p.get('view-investigate').visible, true);
  }
  for (const status of ['running', 'failed']) {
    p.run(
      `paintJob({request_id:'gate',kind:'investigate',source_mode:'live',status:'${status}',events:[]})`,
    );
    assert.equal(
      tabs.find((el) => el.dataset.view === 'learn')?.disabled,
      true,
    );
    assert.equal(
      tabs.find((el) => el.dataset.view === 'followup')?.disabled,
      true,
    );
  }
  // Synthetic fixture relabeled only to exercise browser state, not live proof.
  const demos = await generateDemoReports();
  p.context.liveReport = { ...demos.A, integration_mode: 'live' };
  p.run(
    "paintJob({request_id:'result',kind:'investigate',source_mode:'live',status:'complete',events:[],result:liveReport})",
  );
  for (const view of ['investigate', 'learn', 'followup']) {
    assert.equal(tabs.find((el) => el.dataset.view === view)?.disabled, false);
    p.tab(view);
    assert.equal(p.get(`view-${view}`).visible, true);
    for (const el of p.elements.filter((el) => el.matches('[data-demo-only]')))
      assert.equal(el.visible, false);
  }
  assert.equal(p.get('followup-investigation').visible, true);
  p.tab('learn');
  assert.equal(p.get('learn-live').visible, true);
  p.tab('investigate');
  await p.run("startRun('investigate')");
  assert.equal(p.requests.at(-1)?.body?.evidence, 'aws');
  assert.equal(p.requests.at(-1)?.body?.real_services, true);
  assert.deepEqual(Object.keys(p.requests.at(-1)?.body ?? {}).sort(), [
    'allow_append',
    'evidence',
    'kind',
    'lookback_days',
    'real_services',
    'request_id',
  ]);
  assert.equal('owner_evidence' in (p.requests.at(-1)?.body ?? {}), false);
  const count = p.requests.length;
  await p.run("submitRun({kind:'learn'})");
  await p.run("submitRun({kind:'investigate',evidence:'mock'})");
  await p.run("submitRun({kind:'decision',report:{integration_mode:'mock'}})");
  assert.equal(p.requests.length, count);
  p.context.fetch = async () => ({
    ok: true,
    json: async () => ({ integration_mode: 'mock' }),
  });
  p.run("active = 'unchanged'");
  await p.run("loadReport({size:2,text:async ()=>'{}'})");
  assert.equal(
    p.run('active'),
    'unchanged',
    'synthetic imports cannot replace a Live report',
  );
  p.mode('demo');
  assert.equal(p.run('active'), null);
  assert.equal(p.get('scenario').value, '');
  assert.ok(
    tabs.every((el) => !el.disabled),
    'Demo tabs remain enabled',
  );
  p.mode('live');
  assert.equal(tabs.find((el) => el.dataset.view === 'learn')?.disabled, true);
  p.context.fetch = async () => ({
    ok: true,
    json: async () => p.context.liveReport,
  });
  await p.run("loadReport({size:2,text:async ()=>'{}'})");
  assert.ok(
    tabs.every((el) => !el.disabled),
    'loading a live report unlocks tabs',
  );
});

test('Run investigation reports configuration errors without presenting a running job', async () => {
  const p = page();
  p.mode('live');
  p.context.fetch = async () => ({
    ok: false,
    json: async () => ({
      error: 'Set AWS_EXPECTED_ACCOUNT_ID in .env, then restart npm start.',
    }),
  });
  await p.get('run-investigate').listeners.click();
  assert.match(
    p.get('toast-message').textContent,
    /AWS_EXPECTED_ACCOUNT_ID.*\.env.*restart npm start/,
  );
  assert.equal(p.get('toast').visible, true);
  assert.equal(p.get('run-state').visible, false);
  assert.equal(p.get('cancel-run').visible, false);
  assert.equal(p.get('run-events').closest('.event-panel')?.visible, false);
  assert.equal(p.get('run-investigate'), p.run('document.activeElement'));
  p.get('dismiss-toast').listeners.click();
  assert.equal(p.get('run-investigate'), p.run('document.activeElement'));
  p.context.fetch = async () => ({
    ok: true,
    json: async () => ({
      request_id: 'valid-config',
      kind: 'investigate',
      source_mode: 'live',
      status: 'running',
      events: [],
    }),
  });
  await p.get('run-investigate').listeners.click();
  assert.equal(p.get('run-state').visible, true);
  assert.equal(p.get('cancel-run').visible, true);
  assert.equal(p.get('run-investigate').textContent, 'Investigating…');
});

test('resumed jobs and completed results stay out of Demo; Live progress uses actual source mode', () => {
  const p = page();
  p.run(
    "paintJob({request_id:'live',kind:'investigate',source_mode:'live',status:'running',events:[]})",
  );
  assert.equal(p.get('run-state').visible, false);
  assert.equal(
    p.get('mode').disabled,
    false,
    'can enter Live to manage the active run',
  );
  p.mode('live');
  assert.equal(p.get('run-state').visible, true);
  assert.equal(p.get('cancel-run').visible, true);
  assert.equal(p.get('mode').disabled, true);
  p.run(
    "paintJob({request_id:'live',kind:'investigate',source_mode:'live',status:'failed',events:[]})",
  );
  assert.equal(
    p.get('run-state').visible,
    true,
    'failed Live runs remain visible without a result',
  );
  p.run(
    "paintJob({request_id:'mock',kind:'learn',source_mode:'mock',status:'complete',events:[],result:{}})",
  );
  assert.equal(p.get('run-state').visible, false);
  assert.equal(p.get('view-last-result').visible, false);
  p.mode('demo');
  assert.equal(p.get('run-state').visible, false);
  assert.equal(p.run('active'), null);
});

test('action loading follows pending and resumed jobs, restores labels on terminal states and failed starts', async () => {
  const p = page();
  p.get('run-investigate').textContent = 'Run investigation';
  p.get('save-decision').textContent = 'Save decision to Zetaris';
  p.mode('live');
  await p.run("startRun('investigate')");
  assert.equal(p.get('run-investigate').attributes['aria-busy'], 'false');
  assert.equal(p.get('run-state').visible, false, 'validation starts no job');
  assert.equal(p.get('run-investigate'), p.run('document.activeElement'));

  let resolveStart!: (value: unknown) => void;
  p.context.fetch = () =>
    new Promise((resolve) => {
      resolveStart = resolve;
    });
  const pending = p.run("startRun('investigate')");
  assert.equal(p.get('run-investigate').attributes['aria-busy'], 'true');
  assert.equal(p.get('run-investigate').textContent, 'Checking configuration…');
  assert.equal(
    p.get('run-state').visible,
    false,
    'configuration is not yet accepted',
  );
  assert.equal(p.get('run-investigate').disabled, true);
  assert.equal(p.get('save-decision').attributes['aria-busy'], 'false');
  assert.equal(p.get('cancel-run').visible, false, 'start is not confirmed');
  resolveStart({ ok: false, json: async () => ({ error: 'Rejected' }) });
  await pending;
  assert.equal(p.get('run-investigate').attributes['aria-busy'], 'false');
  assert.equal(p.get('run-investigate').textContent, 'Run investigation');
  assert.equal(p.get('run-investigate').disabled, false);

  for (const terminal of ['complete', 'failed', 'cancelled']) {
    p.run(
      "paintJob({request_id:'live',kind:'investigate',source_mode:'live',status:'running',events:[]})",
    );
    p.run(
      "paintJob({request_id:'live',kind:'investigate',source_mode:'live',status:'running',activity:'Checking evidence',events:[]})",
    );
    assert.equal(p.get('run-investigate').textContent, 'Investigating…');
    assert.equal(p.get('run-investigate').attributes['aria-busy'], 'true');
    p.context.terminal = terminal;
    p.run(
      "paintJob({request_id:'live',kind:'investigate',source_mode:'live',status:terminal,events:[]})",
    );
    assert.equal(p.get('run-investigate').attributes['aria-busy'], 'false');
    assert.equal(p.get('run-investigate').textContent, 'Run investigation');
    assert.equal(p.get('run-investigate').disabled, false);
    assert.equal(p.get('cancel-run').visible, false);
  }
  p.run(
    "paintJob({request_id:'decision',kind:'decision',source_mode:'live',status:'running',events:[]})",
  );
  assert.equal(p.get('save-decision').attributes['aria-busy'], 'true');
  assert.equal(p.get('save-decision').textContent, 'Saving decision…');
  assert.equal(p.get('run-investigate').attributes['aria-busy'], 'false');
  p.run('paintJob(null)');
  assert.equal(p.get('save-decision').textContent, 'Save decision to Zetaris');
  assert.equal(p.get('save-decision').attributes['aria-busy'], 'false');
});

test('confirmed Zetaris save clears the form and shows only a storage receipt', () => {
  const p = page();
  p.mode('live');
  p.get('decision-choice').value = 'deferred';
  p.get('decision-actor').value = 'engineer-42';
  p.get('decision-reason').value = 'Private review detail';
  p.get('decision-review').value = '2026-11-02T12:00';
  p.get('decision-review-field').hidden = false;
  p.get('decision-review').required = true;
  p.context.receipt = {
    recommendation: { record: { record_id: 'recommendation-1' } },
    decision: {
      record: {
        record_id: 'decision-1',
        investigation_id: 'investigation-1',
        summary_json: JSON.stringify({ reason: 'Private review detail' }),
      },
    },
  };
  p.run(
    "paintJob({request_id:'saved-1',kind:'decision',source_mode:'live',status:'complete',events:[],result:receipt})",
  );
  for (const id of [
    'decision-choice',
    'decision-actor',
    'decision-reason',
    'decision-review',
  ])
    assert.equal(p.get(id).value, '', id);
  assert.equal(p.get('decision-review-field').hidden, true);
  assert.equal(p.get('decision-review').required, false);
  assert.equal(p.get('toast').className, 'toast success');
  assert.match(p.get('toast-message').textContent, /Saved to Zetaris/);
  const receiptText = p
    .get('decision-receipt')
    .querySelectorAll('p, summary')
    .map((el) => el.textContent)
    .join(' ');
  assert.match(receiptText, /Zetaris storage receipt/);
  assert.doesNotMatch(receiptText, /Private review detail/);
  assert.equal(p.get('decision-receipt').querySelectorAll('button').length, 1);
  p.run(
    "paintJob({request_id:'saved-1',kind:'decision',source_mode:'live',status:'complete',events:[],result:receipt})",
  );
  assert.equal(p.get('decision-receipt').querySelectorAll('button').length, 1);
});

test('Live decision save requests Zetaris append without a checkbox', async () => {
  const p = page();
  assert.equal(
    p.elements.some((el) => el.attributes.id === 'decision-ack'),
    false,
  );
  const report = (await generateDemoReports()).A;
  p.context.liveReport = { ...report, integration_mode: 'live' };
  p.mode('live');
  p.run("reports.loaded = liveReport; active = 'loaded'; render()");
  p.get('decision-choice').value = 'deferred';
  p.get('decision-actor').value = 'engineer-42';
  p.get('decision-reason').value = 'Review current evidence';
  p.get('decision-review').value = '2099-01-01T12:00';
  await p.get('decision-form').listeners.submit({ preventDefault() {} });
  const request = p.requests.find((entry) => entry.url === '/api/run');
  assert.equal(request?.body?.kind, 'decision');
  assert.equal(request?.body?.allow_append, true);
  assert.equal(request?.body?.real_services, true);
  assert.equal(request?.body?.instance_id, report.candidates[0].instance_id);
});

test('stop and report validation show loading only for their pending requests', async () => {
  const p = page();
  p.get('cancel-run').textContent = 'Stop run';
  p.get('load').textContent = 'Load report';
  p.mode('live');
  p.run(
    "paintJob({request_id:'live',kind:'investigate',source_mode:'live',status:'running',events:[]})",
  );
  let rejectRequest!: (error: Error) => void;
  p.context.fetch = () =>
    new Promise((_resolve, reject) => {
      rejectRequest = reject;
    });
  const stopping = p.get('cancel-run').listeners.click();
  assert.equal(p.get('cancel-run').attributes['aria-busy'], 'true');
  assert.equal(p.get('cancel-run').textContent, 'Stopping…');
  rejectRequest(new Error('Network failure'));
  await stopping;
  assert.equal(p.get('cancel-run').attributes['aria-busy'], 'false');
  assert.equal(p.get('cancel-run').textContent, 'Stop run');
  assert.equal(p.get('run-investigate').attributes['aria-busy'], 'true');
  const validating = p.run("loadReport({size:2,text:async ()=>'{}'})");
  assert.equal(p.get('load').attributes['aria-busy'], 'true');
  // Allow the async file read to reach the pending validation request.
  await Promise.resolve();
  rejectRequest(new Error('Invalid report'));
  await validating;
  assert.equal(p.get('load').attributes['aria-busy'], 'false');
  assert.equal(p.get('load').textContent, 'Load report');
});

test('motion enters changed status and new events without replaying prior events; reduced motion skips it', () => {
  for (const reducedMotion of [false, true]) {
    const p = page(undefined, reducedMotion);
    p.mode('live');
    p.run(
      "paintJob({request_id:'live',kind:'investigate',source_mode:'live',status:'running',events:['Planner call 1 started','1. Discover instances · ok']})",
    );
    const statusAnimations = p.get('run-status').animations.length;
    assert.equal(statusAnimations > 0, !reducedMotion);
    p.run('paintJob(currentJob)');
    assert.equal(p.get('run-status').animations.length, statusAnimations);
    p.run(
      "paintJob({...currentJob,events:[...currentJob.events,'2. Check billing · partial']})",
    );
    const leaves = p.get('run-events').querySelectorAll('.event-leaf');
    assert.equal(leaves[0].animations.length, 0, 'old event stays still');
    assert.equal(leaves[1].animations.length, reducedMotion ? 0 : 1);
    assert.equal(p.get('run-events').closest('.event-panel')?.visible, true);
  }
});

test('planner exchanges use literal text disclosures and retain open state across polling', () => {
  const p = page();
  p.mode('live');
  const prompt =
    'Model prompt: {"content":"<img src=x onerror=alert(1)>"}\nChoose the next read-only evidence check.';
  const output =
    'Model output: {"action":"discover_instances","reason":"Inventory first"}';
  p.context.exchangeEvents = ['Planner call 1 started', prompt, output];
  p.run(
    "paintJob({request_id:'live',kind:'investigate',source_mode:'live',status:'running',events:exchangeEvents})",
  );
  const messages = () => p.get('run-events').querySelectorAll('.model-message');
  assert.equal(messages().length, 2);
  assert.ok(messages()[0].closest('.event-branch'));
  assert.equal(messages()[0].tag, 'details');
  assert.equal(messages()[0].open, false);
  assert.equal(
    messages()[0].querySelectorAll('summary')[0].textContent,
    'Model prompt',
  );
  assert.equal(
    messages()[1].querySelectorAll('summary')[0].textContent,
    'Model output',
  );
  assert.equal(
    messages()[0].querySelectorAll('pre')[0].textContent,
    prompt.slice('Model prompt: '.length),
  );
  assert.equal(
    messages()[1].querySelectorAll('pre')[0].textContent,
    output.slice('Model output: '.length),
  );
  assert.equal(messages()[0].querySelectorAll('img').length, 0);
  messages()[0].open = true;
  p.run('paintJob(currentJob)');
  assert.equal(messages()[0].open, true);
  assert.equal(messages()[1].open, false);
  p.run(
    "paintJob({...currentJob,events:[...currentJob.events,'1. Discover instances · ok']})",
  );
  assert.equal(messages()[0].open, true);
  messages()[0].open = false;
  p.run('paintJob(currentJob)');
  assert.equal(messages()[0].open, false);
  p.run('paintJob(null)');
  assert.equal(messages().length, 0);
});

test('Live lookback is bounded before submission and included in the request', async () => {
  const p = page();
  assert.equal(p.get('lookback-days').visible, false);
  p.mode('live');
  assert.equal(p.get('lookback-days').visible, true);
  const bodies: { lookback_days: number }[] = [];
  p.context.fetch = async (_url: string, options: { body: string }) => {
    bodies.push(JSON.parse(options.body));
    return {
      ok: false,
      json: async () => ({ error: 'test configuration missing' }),
    };
  };
  for (const value of ['', '0', '15', '1.5', 'invalid']) {
    p.get('lookback-days').value = value;
    await p.get('run-investigate').listeners.click();
    assert.equal(bodies.length, 0);
    assert.equal(p.get('lookback-days'), p.run('document.activeElement'));
    assert.equal(p.get('run-state').visible, false);
  }
  p.get('lookback-days').value = '2';
  await p.get('run-investigate').listeners.click();
  assert.equal(bodies[0].lookback_days, 2);
});
