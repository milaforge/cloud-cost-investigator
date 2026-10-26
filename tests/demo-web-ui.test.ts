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
    reset() {}
    reportValidity() {
      return true;
    }
    scrollIntoView() {}
    animate() {
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
    window: { matchMedia: () => ({ matches: true }) },
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
  lazy.mode('live');
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
  available = true;
  await recovery.get('scenario').listeners.change();
  assert.equal(recovery.run('active'), 'A');
  const requests = recovery.requests.length;
  await recovery.get('scenario').listeners.change();
  assert.equal(
    recovery.requests.length,
    requests,
    'loaded previews need no repeat fetch',
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
