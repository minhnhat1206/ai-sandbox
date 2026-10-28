import type { Config } from '../config.ts';
import { AnthropicProvider } from './anthropic.ts';
import { MockProvider } from './mock.ts';
import type { Provider } from './types.ts';

export function createProvider(cfg: Config, opts: { mockDelayMs?: number } = {}): Provider {
  if (cfg.provider === 'anthropic') {
    return new AnthropicProvider({ apiKey: cfg.anthropicApiKey, model: cfg.model, effort: cfg.effort });
  }
  return new MockProvider(opts.mockDelayMs ?? 6);
}

export type { Provider, CompletionRequest, CompletionResult } from './types.ts';
export { ProviderError } from './types.ts';
