import { loadProjectEnv } from '../src/config.ts';
import { DemoJobs, demoConfiguration } from './demo-web-jobs.ts';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { pathToFileURL } from 'node:url';
import { MockProvider } from '../src/investigation/mock.ts';
import { ScriptedPlanner } from '../src/investigation/planner.ts';
import { validateReport } from '../src/investigation/report.ts';
import { runInvestigation } from '../src/investigation/run.ts';

export const MAX_REPORT_BYTES = 2 * 1024 * 1024;
export async function generateDemoReports() {
  const to = new Date();
  const request = {
    account_id: 'demo',
    region: 'us-east-1',
    max_candidates: 1,
    window: {
      from: new Date(+to - 28 * 86400000).toISOString(),
      to: to.toISOString(),
    },
  };
  const reports = {} as Record<'A' | 'B', ReturnType<typeof validateReport>>;
  for (const scenario of ['A', 'B'] as const) {
    reports[scenario] = validateReport(
      await runInvestigation(request, {
        provider: new MockProvider(scenario),
        planner: new ScriptedPlanner(),
        history: {},
      }),
    );
  }
  return reports;
}

export async function startDemoServer(port = 0) {
  const reports = await generateDemoReports();
  const jobs = new DemoJobs();
  const assets = new Map(
    await Promise.all(
      [
        ['/', 'index.html', 'text/html'],
        ['/app.js', 'app.js', 'text/javascript'],
        ['/style.css', 'style.css', 'text/css'],
      ].map(
        async ([route, file, type]) =>
          [
            route,
            {
              body: await readFile(
                new URL(`../src/web/${file}`, import.meta.url),
              ),
              type,
            },
          ] as const,
      ),
    ),
  );
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const host = `127.0.0.1:${(server.address() as AddressInfo).port}`;
    if (req.headers.host !== host) {
      reply(403, { error: 'Local access only.' });
      return;
    }
    if (req.method === 'GET' && req.url === '/api/demos') {
      reply(200, reports);
      return;
    }
    if (req.method === 'GET' && req.url === '/api/config') {
      reply(200, demoConfiguration());
      return;
    }
    if (req.method === 'GET' && req.url === '/api/job') {
      reply(200, jobs.current);
      return;
    }
    const asset = assets.get(req.url ?? '');
    if (req.method === 'GET' && asset) {
      res.writeHead(200, { 'Content-Type': `${asset.type}; charset=utf-8` });
      res.end(asset.body);
      return;
    }
    if (
      req.method !== 'POST' ||
      !['/api/validate', '/api/run', '/api/cancel'].includes(req.url ?? '')
    ) {
      reply(404, { error: 'Not found.' });
      return;
    }
    if (
      req.headers.origin !== `http://${host}` ||
      req.headers['content-type'] !== 'application/json'
    ) {
      reply(403, { error: 'Same-origin JSON required.' });
      return;
    }
    try {
      let size = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        size += chunk.length;
        const limit =
          req.url === '/api/validate'
            ? MAX_REPORT_BYTES
            : req.url === '/api/run'
              ? 24 * 1024
              : 4096;
        if (size > limit) {
          reply(413, {
            error:
              req.url === '/api/validate'
                ? 'Report exceeds 2 MiB.'
                : 'Request exceeds the size limit.',
          });
          return;
        }
        chunks.push(chunk);
      }
      const input: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (req.url === '/api/run') {
        try {
          reply(202, jobs.start(input));
        } catch (error) {
          const code = error instanceof Error ? error.message : '';
          reply(code === 'demo_busy' ? 409 : 400, {
            error:
              code === 'demo_busy'
                ? 'Another demo is still running.'
                : code === 'demo_model_not_configured'
                  ? 'Model configuration is missing or invalid. Configure server .env and restart.'
                  : code === 'demo_zetaris_not_configured'
                    ? 'Zetaris configuration and append opt-in are required in server .env. Restart after configuring.'
                    : code === 'demo_zetaris_history_not_configured'
                      ? 'Zetaris history configuration is required in server .env. Restart after configuring.'
                      : 'Invalid demo request or missing explicit service opt-in.',
          });
        }
        return;
      }
      if (req.url === '/api/cancel') {
        if (
          !input ||
          typeof input !== 'object' ||
          Object.keys(input).join(',') !== 'request_id' ||
          !('request_id' in input) ||
          typeof input.request_id !== 'string'
        )
          throw new Error();
        reply(200, jobs.cancel(input.request_id));
        return;
      }
      reply(200, validateReport(input));
    } catch {
      if (!res.writableEnded)
        reply(400, {
          error:
            'Unsupported or invalid investigation report. Choose a single CLI JSON report, not an evaluation summary or demo bundle.',
        });
    }
  });
  server.on('close', () => jobs.close());
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  return {
    server,
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  };
}

export function openBrowser(url: string): Promise<boolean> {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
        : ['xdg-open', [url]];
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore', shell: false });
    const timer = setTimeout(() => {
      child.kill();
      resolve(false);
    }, 5000);
    child.once('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--no-open') || args.length > 1) {
    console.error('Usage: npm run demo:web -- [--no-open]');
    process.exitCode = 1;
  } else {
    try {
      loadProjectEnv();
      console.log('Generating synthetic A/B investigations…');
      const { server, url } = await startDemoServer();
      console.log(
        `Demo viewer: ${url}\nOffline demos by default. Real services require explicit browser controls. Ctrl+C to stop.`,
      );
      for (const signal of ['SIGINT', 'SIGTERM'] as const)
        process.once(signal, () => {
          server.close();
          server.closeAllConnections();
        });
      if (!args.includes('--no-open') && !(await openBrowser(url)))
        console.log(`Browser could not be opened. Open ${url} manually.`);
    } catch {
      console.error('Could not start demo viewer. No fallback was used.');
      process.exitCode = 1;
    }
  }
}
