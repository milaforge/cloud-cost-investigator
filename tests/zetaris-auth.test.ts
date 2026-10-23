import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { queryZetaris } from '../src/tools/zetaris.ts';

function configure(t: TestContext) {
  const values = {
    ZETARIS_BASE_URL: 'https://zetaris.example',
    ZETARIS_AUTH_MODE: 'password',
    ZETARIS_USERNAME: 'app-user',
    ZETARIS_PASSWORD: 'test-password',
    ZETARIS_ORG_ID: '',
    ZETARIS_API_KEY: 'old-admin-key',
    NODE_TLS_REJECT_UNAUTHORIZED: '1',
  };
  const previous = Object.keys(values).map((key) => process.env[key]);
  Object.assign(process.env, values);
  t.after(() =>
    Object.keys(values).forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    }),
  );
}

test('Zetaris password login uses verified UI contract and never the old token', async (t) => {
  configure(t);
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async (url: string | URL | Request, options?: RequestInit) => {
      assert.equal(options?.redirect, 'error');
      if (String(url).endsWith('/api/auth/login')) {
        assert.equal(new Headers(options?.headers).get('Authorization'), null);
        assert.deepEqual(JSON.parse(String(options?.body)), {
          username: 'app-user',
          password: 'test-password',
        });
        return Response.json({ idToken: 'app-token', orgId: 7 });
      }
      assert.equal(
        new Headers(options?.headers).get('Authorization'),
        'Bearer app-token',
      );
      assert.equal(new Headers(options?.headers).get('X-Org-ID'), '7');
      return Response.json({ headers: ['1'], data: [['1']], total: 1 });
    },
  );
  await queryZetaris('SELECT 1');
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('Zetaris password login failure is sanitized without token fallback or retry', async (t) => {
  configure(t);
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('private credentials diagnostic', { status: 401 }),
  );
  await assert.rejects(queryZetaris('SELECT 1'), {
    message: 'zetaris_auth_http_401',
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('Zetaris blocks wrong org and malformed login data before querying', async (t) => {
  configure(t);
  process.env.ZETARIS_ORG_ID = 'other-org';
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ idToken: 'app-token', orgId: '7' }),
  );
  await assert.rejects(queryZetaris('SELECT 1'), {
    message: 'zetaris_org_mismatch',
  });
  assert.equal(fetchMock.mock.callCount(), 1);
  process.env.ZETARIS_ORG_ID = '';
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ idToken: 'secret\r\ninjected', orgId: '7' }),
  );
  await assert.rejects(queryZetaris('SELECT 1'), {
    message: 'zetaris_auth_invalid_response',
  });
});

test('Zetaris accepts orgId in the login token payload, as the UI does', async (t) => {
  configure(t);
  const token = `header.${Buffer.from(JSON.stringify({ orgId: '7' })).toString('base64url')}.signature`;
  t.mock.method(
    globalThis,
    'fetch',
    async (url: string | URL | Request, options?: RequestInit) => {
      if (String(url).endsWith('/api/auth/login'))
        return Response.json({ idToken: token });
      assert.equal(new Headers(options?.headers).get('X-Org-ID'), '7');
      return Response.json({ headers: ['1'], data: [['1']], total: 1 });
    },
  );
  await queryZetaris('SELECT 1');
});
