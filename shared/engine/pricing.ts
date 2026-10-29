/** USD per 1M tokens. Anthropic first-party rates (Oct 2026). */
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
  'claude-fable-5-1': { input: 10, output: 50, cacheRead: 0.25 },
  'mock-demo': { input: 0, output: 0, cacheRead: 0 },
};

/** `inputTokens` is the total input; `cacheReadTokens` (a subset) is billed at the cache-read rate. */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number, cacheReadTokens = 0): number {
  const p = PRICES[model] ?? PRICES['claude-opus-5-5'];
  const fresh = Math.max(0, inputTokens - cacheReadTokens);
  return (fresh * p.input + cacheReadTokens * p.cacheRead + outputTokens * p.output) / 1_000_000;
}

/** Rough cost of one more run, used to stop a trial slightly before the cap instead of after. */
export function typicalRunCostUsd(model: string, agent: boolean): number {
  return estimateCostUsd(model, agent ? 90_000 : 2_500, agent ? 12_000 : 1_500, agent ? 70_000 : 0);
}

export function knownModels(): string[] {
  return Object.keys(PRICES).filter((m) => m !== 'mock-demo');
}
