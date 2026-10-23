import { loadEnvFile } from 'node:process';

/** Native Node parsing; shell variables take precedence. Never print file contents. */
export function loadProjectEnv(path = '.env'): boolean {
  try {
    loadEnvFile(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw new Error('env_file_unreadable');
  }
}

export interface ModelConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  responseFormat?: 'text' | 'json_object' | 'json_schema';
  extraBody?: Record<string, unknown>;
}

export const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';

export function validateModelConfig(config: ModelConfig): ModelConfig {
  try {
    const url = new URL(config.baseUrl);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
    if (
      !config.model ||
      config.model.length > 128 ||
      Array.from(config.model).some(
        (char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127,
      )
    )
      throw new Error();
    if (
      config.apiKey !== undefined &&
      (!config.apiKey || /[\r\n]/.test(config.apiKey))
    )
      throw new Error();
    const responseFormat = config.responseFormat ?? 'text';
    if (!['text', 'json_object', 'json_schema'].includes(responseFormat))
      throw new Error();
    const extra = config.extraBody === undefined ? {} : config.extraBody;
    if (
      extra === null ||
      typeof extra !== 'object' ||
      Array.isArray(extra) ||
      Buffer.byteLength(JSON.stringify(extra)) > 4096
    )
      throw new Error();
    const reserved = [
      'model',
      'messages',
      'stream',
      'tools',
      'tool_choice',
      'n',
      'response_format',
      '__proto__',
      'constructor',
      'prototype',
    ];
    if (Object.keys(extra).some((key) => reserved.includes(key)))
      throw new Error();
    for (const key of ['max_tokens', 'max_completion_tokens']) {
      if (
        extra[key] !== undefined &&
        (!Number.isInteger(extra[key]) ||
          Number(extra[key]) < 1 ||
          Number(extra[key]) > 4096)
      )
        throw new Error();
    }
    if (
      extra.max_tokens !== undefined &&
      extra.max_completion_tokens !== undefined
    )
      throw new Error();
    return {
      baseUrl: url.href.replace(/\/$/, ''),
      model: config.model,
      apiKey: config.apiKey,
      responseFormat,
      extraBody: structuredClone(extra),
    };
  } catch {
    throw new Error('model_configuration_invalid');
  }
}

/** Generic configuration never borrows an NVIDIA credential for a different endpoint. */
export function modelConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ModelConfig {
  const generic = [
    'LLM_BASE_URL',
    'LLM_MODEL',
    'LLM_API_KEY',
    'LLM_RESPONSE_FORMAT',
    'LLM_EXTRA_BODY',
  ].some((key) => env[key] !== undefined && env[key] !== '');
  if (generic) {
    try {
      return validateModelConfig({
        baseUrl: env.LLM_BASE_URL ?? '',
        model: env.LLM_MODEL ?? '',
        apiKey: env.LLM_API_KEY || undefined,
        responseFormat:
          env.LLM_RESPONSE_FORMAT as ModelConfig['responseFormat'],
        extraBody: env.LLM_EXTRA_BODY
          ? JSON.parse(env.LLM_EXTRA_BODY)
          : undefined,
      });
    } catch {
      throw new Error('model_configuration_invalid');
    }
  }
  if (!env.NVIDIA_API_KEY) throw new Error('model_configuration_required');
  return nvidiaConfig(
    env.NVIDIA_MODEL ?? DEFAULT_NVIDIA_MODEL,
    env.NVIDIA_API_KEY,
  );
}

export function nvidiaConfig(model: string, apiKey?: string): ModelConfig {
  if (!apiKey) throw new Error('model_api_key_required');
  return validateModelConfig({
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model,
    apiKey,
    responseFormat: 'json_schema',
    extraBody: {
      temperature: 1,
      top_p: 0.95,
      chat_template_kwargs: { enable_thinking: false },
    },
  });
}
