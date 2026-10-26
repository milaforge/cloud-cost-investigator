import assert from 'node:assert/strict';
import test from 'node:test';
import { request } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  startDemoServer,
  MAX_REPORT_BYTES,
  openBrowser,
} from '../scripts/demo-web.ts';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { runInvestigation } from '../src/investigation/run.ts';

test('local viewer generates fresh A/B, validates uploads and confines its HTTP surface', async () => {
  const started = performance.now();
  const { server, url } = await startDemoServer();
  try {
    assert.ok(
      performance.now() - started < 2000,
      'startup must not wait for investigations',
    );
    assert.equal((await fetch(url)).status, 200);
    assert.equal(
      (await fetch(`${url}/api/demos?scenario=unknown`)).status,
      400,
    );
    const [first, duplicate] = await Promise.all([
      fetch(`${url}/api/demos?scenario=A`).then((r) => r.json()),
      fetch(`${url}/api/demos?scenario=A`).then((r) => r.json()),
    ]);
    assert.deepEqual(
      Object.keys(first),
      ['A'],
      'generate only the requested preview',
    );
    assert.deepEqual(
      first,
      duplicate,
      'concurrent requests share one investigation',
    );
    const get = await fetch(`${url}/api/demos`);
    const demos = await get.json();
    assert.deepEqual(
      demos.A,
      first.A,
      'cache previews for the server lifetime',
    );
    assert.equal(demos.A.candidates[0].verdict, 'conditional_recommendation');
    assert.equal(demos.B.candidates[0].verdict, 'not_recommended');
    assert.equal(demos.A.integration_mode, 'mock');
    assert.equal(demos.A.planner.mode, 'scripted');
    assert.equal(demos.A.historical_context.zetaris, 'not_configured');
    assert.equal(demos.A.historical_context.hmem, 'not_configured');
    assert.notEqual(demos.A.investigation_id, demos.B.investigation_id);
    assert.deepEqual(Object.keys(demos).sort(), [
      'A',
      'B',
      'C',
      'missing',
      'mixed',
    ]);
    assert.equal(demos.C.candidates[0].verdict, 'not_recommended');
    assert.equal(demos.missing.candidates[0].verdict, 'needs_verification');
    assert.equal(demos.mixed.candidates.length, 3);
    assert.deepEqual(await (await fetch(`${url}/api/demos`)).json(), demos);
    const page = await fetch(url);
    assert.match(
      page.headers.get('content-security-policy') ?? '',
      /frame-ancestors 'none'/,
    );
    assert.equal(page.headers.get('cache-control'), 'no-store');
    assert.match(await page.text(), /Load report/);
    for (const path of ['/app.js', '/style.css'])
      assert.equal((await fetch(url + path)).status, 200);
    for (const path of ['/.env', '/package.json', '/api/rerun'])
      assert.equal((await fetch(url + path)).status, 404);
    const post = (body: string, origin = url) =>
      fetch(`${url}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: origin },
        body,
      });
    assert.deepEqual(
      await (await post(JSON.stringify(demos.A))).json(),
      demos.A,
    );
    const missing = await runInvestigation(demos.A.request, {
      provider: new MockProvider('missing'),
      planner: new ScriptedPlanner(),
    });
    assert.equal(missing.completion_status, 'partial');
    assert.equal((await post(JSON.stringify(missing))).status, 200);
    for (const invalid of ['{', '{}', JSON.stringify({ rows: [demos.A] })])
      assert.equal((await post(invalid)).status, 400);
    const forged = structuredClone(demos.A);
    forged.candidates[0].estimated_monthly_savings = 99999;
    assert.equal((await post(JSON.stringify(forged))).status, 400);
    const citation = structuredClone(demos.B);
    citation.candidates[0].contradicting_evidence_ids = ['invented'];
    assert.equal((await post(JSON.stringify(citation))).status, 400);
    assert.equal((await post('{}', 'https://example.com')).status, 403);
    assert.equal((await post(' '.repeat(MAX_REPORT_BYTES + 1))).status, 413);
    const hostStatus = await new Promise<number | undefined>(
      (resolve, reject) => {
        const req = request(
          url,
          { headers: { Host: 'evil.example' } },
          (res) => {
            res.resume();
            resolve(res.statusCode);
          },
        );
        req.on('error', reject);
        req.end();
      },
    );
    assert.equal(hostStatus, 403);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('browser launcher reports success and gracefully handles a missing opener', {
  skip: process.platform === 'win32',
}, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cci-browser-'));
  const previous = process.env.PATH;
  try {
    await writeFile(
      join(directory, process.platform === 'darwin' ? 'open' : 'xdg-open'),
      '#!/bin/sh\n[ "$1" = "http://127.0.0.1:12345" ]\n',
      { mode: 0o700 },
    );
    process.env.PATH = directory;
    assert.equal(await openBrowser('http://127.0.0.1:12345'), true);
    process.env.PATH = '';
    assert.equal(await openBrowser('http://127.0.0.1:12345'), false);
  } finally {
    if (previous === undefined) delete process.env.PATH;
    else process.env.PATH = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
