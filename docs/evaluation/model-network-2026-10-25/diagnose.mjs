import { subscribe, unsubscribe } from 'node:diagnostics_channel';
import { lookup } from 'node:dns/promises';
import { connect } from 'node:tls';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const local = (path) => import(pathToFileURL(resolve(path)).href);
const { loadProjectEnv, modelConfigFromEnv } = await local('src/config.ts');
const { OpenAICompatiblePlanner } = await local('src/investigation/model.ts');
const { validateAction } = await local('src/contracts.ts');
const { validateReport } = await local('src/investigation/report.ts');
const { sanitizedPlannerFailure } = await local('src/investigation/planner.ts');
const { ModelHttpError } = await local('src/investigation/provider-error.ts');
loadProjectEnv();
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '1')
  throw new Error('TLS verification required');
const config = modelConfigFromEnv();
const target = new URL(config.baseUrl);
const output = process.argv[2];
if (!output) throw new Error('New output file required');
const report = validateReport(
  JSON.parse(
    await readFile(
      'docs/evaluation/model-reliability-2026-10-25/round-2-C.json',
      'utf8',
    ),
  ),
);
const codeAllowlist = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ABORT_ERR',
]);
const code = (error) => (codeAllowlist.has(error?.code) ? error.code : 'other');
const began = performance.now();
const elapsed = () => Math.round(performance.now() - began);
let phase = 'setup';
const requests = [];
const connections = [];
const byRequest = new WeakMap();
const handlers = [];
function listen(name, callback) {
  const handler = (message) => {
    try {
      callback(message);
    } catch {
      /* Diagnostic observers must never affect a request. */
    }
  };
  subscribe(name, handler);
  handlers.push([name, handler]);
}
listen('undici:request:create', ({ request }) => {
  if (new URL(request.origin).origin !== target.origin) return;
  const row = { id: requests.length + 1, phase, created_ms: elapsed() };
  requests.push(row);
  byRequest.set(request, row);
});
listen('undici:client:sendHeaders', ({ request, socket }) => {
  const row = byRequest.get(request);
  if (row)
    Object.assign(row, {
      sent_ms: elapsed(),
      tls_authorized: socket.authorized === true,
    });
});
listen('undici:request:bodySent', ({ request }) => {
  const row = byRequest.get(request);
  if (row) row.body_sent_ms = elapsed();
});
listen('undici:request:headers', ({ request, response }) => {
  const row = byRequest.get(request);
  if (row)
    Object.assign(row, { headers_ms: elapsed(), status: response.statusCode });
});
listen('undici:request:bodyChunkReceived', ({ request, chunk }) => {
  const row = byRequest.get(request);
  if (row) {
    row.first_body_ms ??= elapsed();
    row.response_bytes = (row.response_bytes ?? 0) + chunk.length;
  }
});
listen('undici:request:trailers', ({ request }) => {
  const row = byRequest.get(request);
  if (row) row.complete_ms = elapsed();
});
listen('undici:request:error', ({ request, error }) => {
  const row = byRequest.get(request);
  if (row) Object.assign(row, { error_ms: elapsed(), error_code: code(error) });
});
for (const [name, event] of [
  ['beforeConnect', 'connection_started'],
  ['connected', 'connection_established'],
  ['connectError', 'connection_failed'],
]) {
  listen(`undici:client:${name}`, ({ connectParams, socket, error }) => {
    if (connectParams.hostname !== target.hostname) return;
    connections.push({
      event,
      phase,
      elapsed_ms: elapsed(),
      ...(socket ? { tls_authorized: socket.authorized === true } : {}),
      ...(error ? { error_code: code(error) } : {}),
    });
  });
}
const result = {
  measured_at: new Date().toISOString(),
  model: config.model,
  node: process.version,
  undici: process.versions.undici,
  thinking_disabled:
    config.extraBody?.chat_template_kwargs?.enable_thinking === false,
  methodology:
    'Three serial DNS/TLS samples, one authenticated catalog request, four serial pairs of initial and reconstructed timed-out planner states. No tools/history, retries, fallback, prompts, raw responses, headers, hostnames or IPs recorded. Planner diagnostic deadline 45 seconds; this does not replace the failed release gate. Connection events are global pool observations, not per-request attribution.',
  network: [],
  model_calls: [],
  requests,
  connections,
};
const proxyConfigured = !!(
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.ALL_PROXY
);
result.proxy_configured = proxyConfigured;
for (let sample = 1; sample <= 3; sample++) {
  phase = `network-${sample}`;
  const start = elapsed();
  try {
    const answers = await lookup(target.hostname, { all: true });
    result.network.push({
      sample,
      test: 'dns',
      outcome: 'ok',
      elapsed_ms: elapsed() - start,
      address_count: answers.length,
      families: [...new Set(answers.map((a) => a.family))],
    });
  } catch (error) {
    result.network.push({
      sample,
      test: 'dns',
      outcome: 'failed',
      elapsed_ms: elapsed() - start,
      error_code: code(error),
    });
  }
  if (proxyConfigured) {
    result.network.push({
      sample,
      test: 'tls',
      outcome: 'skipped_proxy_configured',
    });
    continue;
  }
  const tlsStart = elapsed();
  const tls = await new Promise((resolve) => {
    const socket = connect({
      host: target.hostname,
      port: Number(target.port || 443),
      servername: target.hostname,
      rejectUnauthorized: true,
    });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(value);
    };
    const timer = setTimeout(
      () => finish({ outcome: 'timeout', elapsed_ms: elapsed() - tlsStart }),
      10000,
    );
    socket.once('secureConnect', () =>
      finish({
        outcome: 'ok',
        elapsed_ms: elapsed() - tlsStart,
        authorized: socket.authorized,
        protocol: socket.getProtocol(),
      }),
    );
    socket.once('error', (error) =>
      finish({
        outcome: 'failed',
        elapsed_ms: elapsed() - tlsStart,
        error_code: code(error),
      }),
    );
  });
  result.network.push({ sample, test: 'tls', ...tls });
}
phase = 'catalog';
try {
  const start = elapsed();
  const response = await fetch(`${config.baseUrl}/models`, {
    headers: {
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  await response.body?.cancel();
  result.catalog = { status: response.status, elapsed_ms: elapsed() - start };
} catch (error) {
  result.catalog = {
    outcome: 'failed',
    error_code: code(error?.cause ?? error),
  };
}
console.error(
  'DNS/TLS/catalog samples complete; starting eight bounded planner diagnostics.',
);
const states = {
  initial: {
    request: report.request,
    candidate_id: null,
    proposed_window: null,
    observations: [],
    trace: [],
    historical_hints: [],
  },
  after_inventory: {
    request: report.request,
    candidate_id: null,
    proposed_window: null,
    observations: report.evidence,
    trace: report.trace.slice(0, 2),
    historical_hints: [],
  },
};
for (let pair = 1; pair <= 4; pair++) {
  for (const name of ['initial', 'after_inventory']) {
    phase = `pair-${pair}-${name}`;
    const start = elapsed();
    const signal = AbortSignal.timeout(45000);
    let outcome;
    try {
      const action = validateAction(
        await new OpenAICompatiblePlanner(config).next(states[name], signal),
      );
      outcome = {
        outcome: 'action_returned',
        action: action.type === 'tool' ? action.tool : action.type,
      };
    } catch (error) {
      outcome = {
        outcome: 'failed',
        failure_code: signal.aborted
          ? 'diagnostic_deadline_exceeded'
          : sanitizedPlannerFailure(error),
        ...(error instanceof ModelHttpError
          ? { provider_error: error.provider_error }
          : {}),
      };
    }
    const row = {
      pair,
      state: name,
      elapsed_ms: elapsed() - start,
      ...outcome,
    };
    result.model_calls.push(row);
    console.error(
      `${phase}: ${row.outcome}; ${row.elapsed_ms}ms${row.failure_code ? `; ${row.failure_code}` : ''}`,
    );
  }
}
for (const [name, handler] of handlers) unsubscribe(name, handler);
result.elapsed_ms = elapsed();
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
