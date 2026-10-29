import { describe, expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { readConfig } from '../server/config.ts';
import { MockProvider } from '../server/providers/mock.ts';
import type { AgentHooks, AgentRequest, CompletionRequest, CompletionResult, Provider } from '../server/providers/types.ts';
import { Store } from '../server/store.ts';
import { UploadStore } from '../server/uploads.ts';
import { estimateCostUsd, typicalRunCostUsd } from '../shared/engine/pricing.ts';
import type { RunEvent, WorkflowDef } from '../shared/types.ts';

/** A "real" provider for billing tests: not demo, reports Opus-like token usage with cache reads. */
class PaidProvider implements Provider {
  readonly name = 'paid';
  readonly model = 'claude-opus-5-5';
  readonly isDemo = false;
  private readonly inner = new MockProvider(0);
  constructor(private readonly usage: CompletionResult) {}
  async complete(req: CompletionRequest, onDelta: (t: string) => void): Promise<CompletionResult> {
    const r = await this.inner.complete(req, onDelta);
    return { ...r, ...this.usage };
  }
  async runAgent(req: AgentRequest, hooks: AgentHooks): Promise<CompletionResult> {
    const r = await this.inner.runAgent(req, hooks);
    return { ...r, ...this.usage };
  }
  completeText(system: string, user: string): Promise<string> {
    return this.inner.completeText(system, user);
  }
}

const ADMIN = 'test-admin-token';
const auth = { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response): Promise<any> => res.json();

function makeApp(usage: CompletionResult, budget?: string) {
  const store = new Store(null);
  const config = readConfig({ ADMIN_TOKEN: ADMIN, AI_PROVIDER: 'mock', ...(budget ? { DEFAULT_BUDGET_USD: budget } : {}) });
  const app = createApp({ store, provider: new PaidProvider(usage), config, uploads: new UploadStore(null), filesDir: null });
  return { app, store };
}

async function readSse(res: Response): Promise<RunEvent[]> {
  const text = await res.text();
  return text.split('\n\n').map((chunk) => chunk.split('\n').find((l) => l.startsWith('data:'))).filter((l): l is string => !!l).map((l) => JSON.parse(l.slice(5).trim()) as RunEvent);
}

const SIMPLE: WorkflowDef = { id: 'custom-simple', version: 1, kind: 'form', category: 'general', icon: 'Sparkles', name: { vi: 'Đơn giản', en: 'Simple' }, tagline: { vi: 'a', en: 'a' }, description: { vi: 'a', en: 'a' }, tags: [], minutesSavedPerRun: 5, inputs: [{ key: 'message', label: { vi: 'Nội dung', en: 'Content' }, type: 'textarea', sample: 'x' }], steps: [{ id: 'main', title: { vi: 'a', en: 'a' }, system: 's', prompt: '{{input.message}}' }] };

/** Adds a non-agent custom workflow so the cheap-run path can be exercised. */
function withSimple(store: Store) {
  const ws = store.getWorkspaceByToken('demo')!;
  ws.customWorkflows = [SIMPLE];
  store.upsertWorkspace(ws);
}

const runOnce = (app: ReturnType<typeof makeApp>['app'], workflowId = 'order-care-agent') =>
  app.request('/api/sandbox/demo/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId, lang: 'vi', sessionId: 'b', inputs: { message: 'Đơn 48213 trễ', channel: 'zalo' } }) });

describe('pricing', () => {
  it('bills cache reads at the cache rate', () => {
    expect(estimateCostUsd('claude-opus-5-5', 100_000, 0, 100_000)).toBeCloseTo(0.02, 6);
    expect(estimateCostUsd('claude-opus-5-5', 100_000, 0, 0)).toBeCloseTo(0.4, 6);
    expect(estimateCostUsd('claude-opus-5-5', 1_000, 1_000, 0)).toBeCloseTo(0.024, 6);
    expect(typicalRunCostUsd('claude-opus-5-5', true)).toBeGreaterThan(typicalRunCostUsd('claude-opus-5-5', false));
  });
});

describe('per-sandbox USD budget', () => {
  it('accumulates spend per run and refuses runs once the budget is reached', async () => {
    // Each run: 20k fresh input + 100k output = 0.08 + 2.0 = $2.08 -> 5 runs fit a $10 budget, the 6th is refused.
    const { app, store } = makeApp({ text: '', inputTokens: 20_000, outputTokens: 100_000, cacheReadTokens: 0 });
    const ws = store.getWorkspaceByToken('demo')!;
    expect(ws.budgetUsd).toBe(10);
    let accepted = 0;
    for (let i = 0; i < 8; i++) {
      const res = await runOnce(app);
      if (res.status === 200) {
        const done = (await readSse(res)).find((e) => e.type === 'run.done') as Extract<RunEvent, { type: 'run.done' }>;
        expect(done.run.costUsd).toBeCloseTo(2.08, 3);
        accepted++;
      } else {
        expect(res.status).toBe(402);
        expect((await json(res)).code).toBe('no_budget');
      }
    }
    expect(accepted).toBe(5);
    const after = store.getWorkspaceByToken('demo')!;
    expect(after.spentUsd).toBeCloseTo(10.4, 3);
    expect(after.credits.used).toBe(5); // refused runs do not consume credits
    const view = await json(await app.request('/api/sandbox/demo'));
    expect(view.budgetExhausted).toBe(true);
    expect(JSON.stringify(view)).not.toContain('spentUsd'); // prospects never see USD
  });

  it('stops slightly early when the next run would clearly cross the cap', async () => {
    const { app, store } = makeApp({ text: '', inputTokens: 1_000, outputTokens: 1_000, cacheReadTokens: 0 });
    withSimple(store);
    const ws = store.getWorkspaceByToken('demo')!;
    ws.spentUsd = 9.9;
    store.upsertWorkspace(ws);
    expect((await runOnce(app, 'custom-simple')).status).toBe(200); // cheap run, half a typical simple run fits
    ws.spentUsd = 9.95;
    store.upsertWorkspace(ws);
    expect((await runOnce(app, 'order-care-agent')).status).toBe(402); // half a typical agent run does not
  });

  it('admin can raise the budget to unlock the sandbox; default comes from DEFAULT_BUDGET_USD', async () => {
    const { app, store } = makeApp({ text: '', inputTokens: 1_000, outputTokens: 1_000, cacheReadTokens: 0 }, '25');
    const ws = store.getWorkspaceByToken('demo')!;
    ws.spentUsd = 10;
    store.upsertWorkspace(ws);
    expect((await runOnce(app)).status).toBe(402);
    const res = await app.request(`/api/admin/workspaces/${ws.id}`, { method: 'PUT', headers: auth, body: JSON.stringify({ budgetUsd: 20 }) });
    expect((await json(res)).workspace.budgetUsd).toBe(20);
    expect((await runOnce(app)).status).toBe(200);
    const created = await json(await app.request('/api/admin/workspaces', { method: 'POST', headers: auth, body: JSON.stringify({ company: 'New Co' }) }));
    expect(created.workspace.budgetUsd).toBe(25);
    const overview = await json(await app.request('/api/admin/overview', { headers: auth }));
    expect(overview.budgetUsd).toBe(45);
  });

  it('demo provider never exhausts a budget (runs are free)', async () => {
    const store = new Store(null);
    const config = readConfig({ ADMIN_TOKEN: ADMIN, AI_PROVIDER: 'mock' });
    const app = createApp({ store, provider: new MockProvider(0), config, uploads: new UploadStore(null), filesDir: null });
    const ws = store.getWorkspaceByToken('demo')!;
    ws.spentUsd = 999;
    store.upsertWorkspace(ws);
    expect((await runOnce(app)).status).toBe(200);
  });
});
