import type { ChatMessage, Lang } from '../../shared/types.ts';

export interface CompletionRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  /** Hints for the mock provider so demo output looks like the real thing. */
  meta: { workflowId: string; stepId: string; lang: Lang; inputs: Record<string, string> };
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface Provider {
  readonly name: string;
  readonly model: string;
  readonly isDemo: boolean;
  /** Stream text deltas via onDelta and resolve with the full result. */
  complete(req: CompletionRequest, onDelta: (text: string) => void, signal?: AbortSignal): Promise<CompletionResult>;
  /** Non-streaming helper used for admin tooling (e.g. drafting a workflow). */
  completeText(system: string, user: string, maxTokens?: number): Promise<string>;
}

export class ProviderError extends Error {
  constructor(message: string, public readonly code: 'auth' | 'rate_limit' | 'refusal' | 'network' | 'unknown' = 'unknown') {
    super(message);
    this.name = 'ProviderError';
  }
}
