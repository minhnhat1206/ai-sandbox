import Anthropic from '@anthropic-ai/sdk';
import type { CompletionRequest, CompletionResult, Provider } from './types.ts';
import { ProviderError } from './types.ts';

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  effort: 'low' | 'medium' | 'high';
}

/**
 * Real Claude provider. Every run is billed to the founder's key, which is the
 * whole point of the sandbox: the prospect needs no account of their own.
 * Server-side refusal fallbacks are enabled so a safety decline on the primary
 * model is retried automatically on a fallback model inside the same call.
 */
export class AnthropicProvider implements Provider {
  readonly name = 'anthropic';
  readonly model: string;
  readonly isDemo = false;
  private readonly client: Anthropic;
  private readonly effort: AnthropicProviderOptions['effort'];

  constructor(opts: AnthropicProviderOptions) {
    this.client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 2, timeout: 10 * 60 * 1000 });
    this.model = opts.model;
    this.effort = opts.effort;
  }

  async complete(req: CompletionRequest, onDelta: (t: string) => void, signal?: AbortSignal): Promise<CompletionResult> {
    try {
      const stream = this.client.beta.messages.stream(
        {
          model: this.model,
          max_tokens: req.maxTokens ?? 8000,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
          output_config: { effort: this.effort },
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
        },
        { signal },
      );
      let text = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          text += event.delta.text;
          onDelta(event.delta.text);
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') {
        throw new ProviderError('The model declined this request for safety reasons.', 'refusal');
      }
      return {
        text,
        inputTokens: (final.usage.input_tokens ?? 0) + (final.usage.cache_read_input_tokens ?? 0) + (final.usage.cache_creation_input_tokens ?? 0),
        outputTokens: final.usage.output_tokens ?? 0,
      };
    } catch (err) {
      throw toProviderError(err);
    }
  }

  async completeText(system: string, user: string, maxTokens = 8000): Promise<string> {
    try {
      const stream = this.client.beta.messages.stream({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
        output_config: { effort: this.effort },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') throw new ProviderError('The model declined this request.', 'refusal');
      return final.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    } catch (err) {
      throw toProviderError(err);
    }
  }
}

function toProviderError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new ProviderError('Invalid Anthropic API key.', 'auth');
  if (err instanceof Anthropic.RateLimitError) return new ProviderError('Rate limited by the AI provider. Please try again in a minute.', 'rate_limit');
  if (err instanceof Anthropic.APIConnectionError) return new ProviderError('Could not reach the AI provider.', 'network');
  if (err instanceof Anthropic.APIError) return new ProviderError(`AI provider error (${err.status}): ${err.message}`, 'unknown');
  return new ProviderError(err instanceof Error ? err.message : 'Unknown provider error', 'unknown');
}
