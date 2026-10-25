import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const preload = fileURLToPath(
  new URL('../scripts/model-request-timing.mjs', import.meta.url),
);

function diagnostic(events: string) {
  return execFileSync(
    process.execPath,
    [
      '--import',
      preload,
      '--input-type=module',
      '-e',
      `import {channel} from 'node:diagnostics_channel';
       const lines=[];
       process.stderr.write=(line)=>{lines.push(line);return true;};
       const request={method:'POST',path:'/v1/chat/completions?secret=value',origin:'https://private.example',headers:'Bearer secret-key',body:'private prompt'};
       const emit=(name,data)=>channel('undici:'+name).publish({request,...data});
       ${events}
       console.log(JSON.stringify(lines));`,
    ],
    { encoding: 'utf8' },
  );
}

test('request timing captures phases without headers, endpoint or payload data', () => {
  const output = diagnostic(`
    emit('request:create',{});
    emit('client:sendHeaders',{socket:{authorized:true},headers:'secret-key'});
    emit('request:bodySent',{});
    emit('request:headers',{response:{statusCode:200,headers:['private response']}});
    emit('request:trailers',{});
    emit('request:trailers',{});
  `);
  const lines = JSON.parse(output) as string[];
  assert.equal(lines.length, 1);
  const row = JSON.parse(lines[0]);
  assert.equal(row.status, 200);
  assert.equal(row.tls_authorized, true);
  assert.equal(row.outcome, 'body_complete');
  assert.equal(typeof row.sent_ms, 'number');
  assert.equal(typeof row.body_sent_ms, 'number');
  assert.equal(typeof row.headers_ms, 'number');
  assert.doesNotMatch(output, /secret|private|Bearer|https|prompt|value/);
});

test('request timing allowlists error codes and ignores malformed events', () => {
  const output = diagnostic(`
    channel('undici:request:create').publish({request:{}});
    emit('request:create',{});
    emit('request:error',{error:{code:'secret-key',message:'private failure',cause:{stack:'private'}}});
  `);
  const lines = JSON.parse(output) as string[];
  assert.equal(lines.length, 1);
  const row = JSON.parse(lines[0]);
  assert.equal(row.outcome, 'error');
  assert.equal(row.error_code, 'other');
  assert.doesNotMatch(output, /secret|private|https|stack/);
});

test('explicit preload observes native fetch success and cancellation with tsx', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      preload,
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      `import http from 'node:http';
       const controller = new AbortController();
       const server = http.createServer((request, response) => {
         if (request.url.includes('stall')) {
           setTimeout(() => controller.abort(), 20);
         } else response.end('private model output');
       });
       await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
       const base = 'http://127.0.0.1:' + server.address().port;
       try {
         await (await fetch(base + '/v1/chat/completions', {
           method: 'POST', headers: {authorization: 'Bearer secret-key'}, body: 'private prompt'
         })).text();
         await fetch(base + '/stall/chat/completions', {
           method: 'POST', body: '{}', signal: controller.signal
         }).catch(() => {});
         await new Promise(resolve => setTimeout(resolve, 20));
       } finally {server.closeAllConnections(); server.close();}`,
    ],
    { encoding: 'utf8', timeout: 5000 },
  );
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  const rows = result.stderr
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].outcome, 'body_complete');
  assert.equal(rows[0].status, 200);
  assert.equal(rows[1].outcome, 'error');
  assert.equal(typeof rows[1].body_sent_ms, 'number');
  assert.equal(rows[1].headers_ms, undefined);
  assert.doesNotMatch(
    result.stderr,
    /secret|private|Bearer|127\.0\.0\.1|prompt/,
  );
});
