import type { TraceEntry } from '../contracts.ts';

export class ModelHttpError extends Error {
  constructor(
    status: number,
    readonly provider_error: NonNullable<TraceEntry['provider_error']>,
  ) {
    super(`model_http_${status}`);
  }
}

// Preserve diagnostic fields, never echoed request objects, headers or stacks.
function errorFields(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[nested details omitted]';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    value === null ||
    typeof value === 'boolean'
  )
    return value;
  if (Array.isArray(value))
    return value.slice(0, 8).map((v) => errorFields(v, depth + 1));
  if (typeof value !== 'object') return '[unsupported details]';
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) =>
        [
          'error',
          'errors',
          'message',
          'detail',
          'details',
          'code',
          'type',
          'param',
          'title',
          'status',
        ].includes(key),
      )
      .map(([key, field]) => [key, errorFields(field, depth + 1)]),
  );
}

export async function readProviderError(
  response: Response,
  secrets: string[],
): Promise<NonNullable<TraceEntry['provider_error']>> {
  const reader = response.body?.getReader();
  if (!reader) return { body: '[empty provider error body]', truncated: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let truncated = false;
  let raw = '';
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('error_body_timeout')), 1000);
    });
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      const keep = Math.min(value.byteLength, 8192 - size);
      chunks.push(value.subarray(0, keep));
      size += keep;
      if (size === 8192) {
        truncated = true;
        break;
      }
    }
    raw = Buffer.concat(chunks).toString('utf8');
    if (truncated) raw = raw.replace(/\S+$/, '[truncated]');
    try {
      raw = JSON.stringify(errorFields(JSON.parse(raw)));
    } catch {
      /* Plain-text/HTML errors are useful too. */
    }
  } catch {
    raw = '[provider error body unavailable]';
    truncated = true;
  } finally {
    if (timer) clearTimeout(timer);
    void reader.cancel().catch(() => undefined);
  }
  for (const secret of secrets
    .filter(Boolean)
    .sort((a, b) => b.length - a.length))
    for (const representation of [secret, JSON.stringify(secret).slice(1, -1)])
      raw = raw.split(representation).join('[redacted]');
  raw = raw
    .replace(/Bearer\s+[^\s"'<>]+/gi, 'Bearer [redacted]')
    .replace(/\b(?:sk-|nvapi-)[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(
      /\b(?:api[_-]?key|token|password|authorization|secret)\b["']?\s*[:=]\s*["']?[^\s,"'<>}]+/gi,
      '[credential redacted]',
    )
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[url redacted]')
    .replace(
      /\/(?:home|mnt|tmp|var|etc|root|app)\/[^\s"'<>]+/g,
      '[path redacted]',
    )
    .replace(
      /\b(?:prompt|messages|headers|request|request_body|stack|traceback)["']?\s*[:=].*/gi,
      '[request or stack omitted]',
    )
    .replace(/<[^>]*>/g, ' ')
    .split(/\n\s*at\s/)[0]
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Remove terminal escapes and control characters from upstream text.
    .replace(/[\x00-\x1f\x7f-\x9f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  truncated ||= raw.length > 2048;
  return {
    body: raw.slice(0, 2048) || '[empty provider error body]',
    truncated,
  };
}
