/** USD per 1M tokens. Anthropic first-party rates (Oct 2026). */
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-fable-5-1': { input: 10, output: 50 },
  'mock-demo': { input: 0, output: 0 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICES[model] ?? PRICES['claude-opus-5-5'];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function knownModels(): string[] {
  return Object.keys(PRICES).filter((m) => m !== 'mock-demo');
}
