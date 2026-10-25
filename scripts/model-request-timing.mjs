// Opt-in Node preload for model diagnostics. Never inspect headers or payloads.
import { subscribe } from 'node:diagnostics_channel';

const requests = new WeakMap();
const pending = new Set();
const codes = new Set([
  'EAI_AGAIN',
  'ENOTFOUND',
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
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ABORT_ERR',
]);
let nextId = 0;
const elapsed = (row) => Math.round(performance.now() - row.start);

function observe(name, callback) {
  subscribe(name, (message) => {
    try {
      callback(message);
    } catch {
      // An optional observer must not change a request's outcome.
    }
  });
}

function finish(row, outcome) {
  if (!pending.delete(row)) return;
  const { start: _start, ...timing } = row;
  process.stderr.write(
    `${JSON.stringify({ event: 'model_request_timing', ...timing, outcome, elapsed_ms: elapsed(row) })}\n`,
  );
}

observe('undici:request:create', ({ request }) => {
  if (
    request.method !== 'POST' ||
    !request.path.split('?')[0].endsWith('/chat/completions')
  )
    return;
  const row = { request: ++nextId, start: performance.now() };
  requests.set(request, row);
  pending.add(row);
});
observe('undici:client:sendHeaders', ({ request, socket }) => {
  const row = requests.get(request);
  if (!row) return;
  row.sent_ms = elapsed(row);
  row.tls_authorized = socket.authorized === true;
});
observe('undici:request:bodySent', ({ request }) => {
  const row = requests.get(request);
  if (row) row.body_sent_ms = elapsed(row);
});
observe('undici:request:headers', ({ request, response }) => {
  const row = requests.get(request);
  if (!row) return;
  row.headers_ms = elapsed(row);
  if (Number.isInteger(response.statusCode)) row.status = response.statusCode;
});
observe('undici:request:trailers', ({ request }) => {
  const row = requests.get(request);
  if (row) finish(row, 'body_complete');
});
observe('undici:request:error', ({ request, error }) => {
  const row = requests.get(request);
  if (!row) return;
  row.error_code = codes.has(error?.code) ? error.code : 'other';
  finish(row, 'error');
});
process.once('exit', () => {
  for (const row of pending) finish(row, 'incomplete_at_exit');
});
