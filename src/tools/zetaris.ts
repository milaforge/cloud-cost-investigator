import { randomUUID } from 'node:crypto';
import { loadProjectEnv } from '../config.ts';
import { readBoundedJson } from '../http.ts';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function headerValue(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 16_384 &&
    !/[\r\n]/.test(value)
  );
}

async function requestJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  signal: AbortSignal,
  phase: 'auth' | 'query',
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': randomUUID(),
        ...headers,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      phase === 'auth'
        ? 'zetaris_auth_unavailable'
        : 'zetaris_transport_unavailable',
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(
      phase === 'auth'
        ? `zetaris_auth_http_${response.status}`
        : `zetaris_http_${response.status}`,
    );
  }
  try {
    return await readBoundedJson(response, phase === 'auth' ? 65_536 : 262_144);
  } catch {
    throw new Error(
      phase === 'auth'
        ? 'zetaris_auth_invalid_response'
        : 'zetaris_invalid_response',
    );
  }
}

// Internal transport only. Never expose arbitrary SQL or credentials to the planner.
export async function queryZetaris(
  sql: string,
  parentSignal?: AbortSignal,
): Promise<unknown> {
  loadProjectEnv();
  const base = process.env.ZETARIS_BASE_URL;
  if (!base) throw new Error('zetaris_configuration_required');
  let baseUrl: string;
  try {
    const url = new URL(base);
    if (
      (url.protocol !== 'https:' &&
        !(
          url.protocol === 'http:' && process.env.ZETARIS_ALLOW_HTTP === 'true'
        )) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
    baseUrl = url.href.replace(/\/$/, '');
  } catch {
    throw new Error('zetaris_configuration_invalid');
  }
  if (!sql || Buffer.byteLength(sql) > 32_768)
    throw new Error('zetaris_query_invalid');
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0')
    throw new Error('zetaris_tls_verification_required');
  // One deadline covers login, query and body decoding; no automatic write retries.
  const signal = parentSignal
    ? AbortSignal.any([parentSignal, AbortSignal.timeout(15_000)])
    : AbortSignal.timeout(15_000);
  const mode =
    process.env.ZETARIS_AUTH_MODE ??
    (process.env.ZETARIS_USERNAME || process.env.ZETARIS_PASSWORD
      ? 'password'
      : 'token');
  let token: string;
  let orgId: string;
  if (mode === 'password') {
    const username = process.env.ZETARIS_USERNAME;
    const password = process.env.ZETARIS_PASSWORD;
    if (!username || !password)
      throw new Error('zetaris_login_configuration_required');
    if (username.length > 320 || password.length > 4096)
      throw new Error('zetaris_configuration_invalid');
    const login = await requestJson(
      `${baseUrl}/api/auth/login`,
      { username, password },
      {},
      signal,
      'auth',
    );
    if (!object(login) || !headerValue(login.idToken))
      throw new Error('zetaris_auth_invalid_response');
    token = login.idToken;
    let returnedOrg: unknown = login.orgId;
    // This deployment's UI also accepts orgId in the returned token's payload.
    // The configured login server is the authority; this is not local JWT authentication.
    if (returnedOrg === undefined || returnedOrg === null) {
      try {
        const claims: unknown = JSON.parse(
          Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
        );
        if (object(claims)) returnedOrg = claims.orgId;
      } catch {
        throw new Error('zetaris_auth_invalid_response');
      }
    }
    orgId =
      typeof returnedOrg === 'number' && Number.isSafeInteger(returnedOrg)
        ? String(returnedOrg)
        : typeof returnedOrg === 'string'
          ? returnedOrg
          : '';
    if (!headerValue(orgId)) throw new Error('zetaris_auth_invalid_response');
    const expectedOrg = process.env.ZETARIS_ORG_ID;
    if (expectedOrg && expectedOrg !== orgId)
      throw new Error('zetaris_org_mismatch');
  } else if (mode === 'token') {
    const key = process.env.ZETARIS_API_KEY;
    const org = process.env.ZETARIS_ORG_ID;
    if (!key || !org) throw new Error('zetaris_configuration_required');
    if (!headerValue(key) || !headerValue(org))
      throw new Error('zetaris_configuration_invalid');
    token = key;
    orgId = org;
  } else {
    throw new Error('zetaris_configuration_invalid');
  }
  return requestJson(
    `${baseUrl}/api/proxy/sql-editor/sqls/run-query`,
    { sql, limit: 100 },
    { Authorization: `Bearer ${token}`, 'X-Org-ID': orgId },
    signal,
    'query',
  );
}

export function parseZetarisTable(value: unknown): {
  headers: string[];
  data: unknown[][];
  total: number;
} {
  if (
    !object(value) ||
    !Array.isArray(value.headers) ||
    value.headers.length > 100 ||
    !value.headers.every((h) => typeof h === 'string' && h.length <= 200) ||
    !Array.isArray(value.data) ||
    value.data.length > 100 ||
    !value.data.every(
      (row) =>
        Array.isArray(row) &&
        row.length === (value.headers as unknown[]).length,
    ) ||
    !Number.isSafeInteger(value.total) ||
    Number(value.total) < value.data.length
  )
    throw new Error('zetaris_invalid_response');
  return {
    headers: value.headers,
    data: value.data,
    total: Number(value.total),
  };
}
