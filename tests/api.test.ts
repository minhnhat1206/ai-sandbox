import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { readConfig } from '../server/config.ts';
import { MockProvider } from '../server/providers/mock.ts';
import { Store } from '../server/store.ts';
import type { Run, RunEvent, Workspace } from '../shared/types.ts';

const ADMIN = 'test-admin-token';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response): Promise<any> => res.json();
const auth = { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json' };

function makeApp() {
  const store = new Store(null);
  const config = readConfig({ ADMIN_TOKEN: ADMIN, AI_PROVIDER: 'mock' });
  const app = createApp({ store, provider: new MockProvider(0), config });
  return { app, store };
}

async function readSse(res: Response): Promise<RunEvent[]> {
  const text = await res.text();
  return text
    .split('\n\n')
    .map((chunk) => chunk.split('\n').find((l) => l.startsWith('data:')))
    .filter((l): l is string => !!l)
    .map((l) => JSON.parse(l.slice(5).trim()) as RunEvent);
}

describe('public sandbox API', () => {
  let app: ReturnType<typeof makeApp>['app'];
  let store: Store;
  beforeEach(() => ({ app, store } = makeApp()));

  it('exposes the demo sandbox without any auth', async () => {
    const res = await app.request('/api/sandbox/demo');
    expect(res.status).toBe(200);
    const view = await json(res);
    expect(view.workspace.company).toContain('Việt Minh');
    expect(view.workflows.length).toBeGreaterThan(3);
    expect(view.creditsRemaining).toBe(100);
    expect(view.provider.isDemo).toBe(true);
  });

  it('404s unknown tokens and hides drafts', async () => {
    expect((await app.request('/api/sandbox/nope')).status).toBe(404);
    const ws = store.getWorkspaceByToken('demo')!;
    ws.status = 'draft';
    store.upsertWorkspace(ws);
    expect((await app.request('/api/sandbox/demo')).status).toBe(404);
  });

  it('streams a form workflow run, persists it and deducts a credit', async () => {
    const res = await app.request('/api/sandbox/demo/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workflowId: 'invoice-extract', lang: 'vi', sessionId: 's1', visitorName: 'Tester', inputs: { document: 'CTY A\nSố: 12 Ngày 01/01/2026\n1. Thùng - 2 cái x 10.000 = 20.000\nCộng tiền hàng: 20.000\nThuế GTGT 8%: 1.600\nTổng thanh toán: 21.600' } }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const events = await readSse(res);
    const types = events.map((e) => e.type);
    expect(types[0]).toBe('run.started');
    expect(types).toContain('step.delta');
    expect(types[types.length - 1]).toBe('run.done');
    const done = events[events.length - 1] as Extract<RunEvent, { type: 'run.done' }>;
    expect(done.run.status).toBe('done');
    expect(done.run.output).toContain('21.600');
    expect(done.run.output).toContain('✅');
    expect(done.creditsRemaining).toBe(99);
    expect(store.listRuns({ sessionId: 's1' })).toHaveLength(1);
  });

  it('rejects invalid inputs and refunds the credit', async () => {
    const res = await app.request('/api/sandbox/demo/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workflowId: 'weekly-report', inputs: { notes: '' } }),
    });
    const events = await readSse(res);
    expect(events[0].type).toBe('error');
    expect(store.getWorkspaceByToken('demo')!.credits.used).toBe(0);
  });

  it('runs a chat turn and refuses when credits are exhausted', async () => {
    const chat = async () =>
      app.request('/api/sandbox/demo/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workflowId: 'policy-assistant', lang: 'vi', sessionId: 's2', messages: [{ role: 'user', content: 'Tôi được nghỉ phép bao nhiêu ngày?' }] }),
      });
    const events = await readSse(await chat());
    const done = events.find((e) => e.type === 'run.done') as Extract<RunEvent, { type: 'run.done' }>;
    expect(done.run.output).toContain('12 ngày');
    const ws = store.getWorkspaceByToken('demo')!;
    ws.credits.used = ws.credits.total;
    store.upsertWorkspace(ws);
    expect((await chat()).status).toBe(402);
  });

  it('accepts feedback and leads', async () => {
    const run: Run = { id: 'run_x', workspaceId: 'ws_demo', workflowId: 'weekly-report', workflowName: { vi: 'a', en: 'b' }, kind: 'form', sessionId: 's', visitorName: '', lang: 'vi', inputs: {}, steps: [], output: '', status: 'done', provider: 'mock', model: 'mock-demo', inputTokens: 0, outputTokens: 0, costUsd: 0, minutesSaved: 10, startedAt: '' };
    store.upsertRun(run);
    const fb = await app.request('/api/sandbox/demo/runs/run_x/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rating: 5, feedback: 'great' }) });
    expect(fb.status).toBe(200);
    expect(store.getRun('run_x')!.rating).toBe(5);
    const lead = await app.request('/api/sandbox/demo/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'book_call', name: 'Minh', email: 'm@x.vn', message: 'Call me' }) });
    expect(lead.status).toBe(200);
    expect(store.listLeads('ws_demo')).toHaveLength(1);
    expect((await app.request('/api/sandbox/demo/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'spam' }) })).status).toBe(400);
  });
});

describe('admin API', () => {
  let app: ReturnType<typeof makeApp>['app'];
  let store: Store;
  beforeEach(() => ({ app, store } = makeApp()));

  it('requires the admin token', async () => {
    expect((await app.request('/api/admin/overview')).status).toBe(401);
    expect((await app.request('/api/admin/overview', { headers: { authorization: 'Bearer wrong' } })).status).toBe(401);
    expect((await app.request('/api/admin/overview', { headers: auth })).status).toBe(200);
  });

  it('creates, updates and deletes a workspace with a unique token', async () => {
    const created = await app.request('/api/admin/workspaces', { method: 'POST', headers: auth, body: JSON.stringify({ company: 'Công ty Thử Nghiệm', industry: 'Retail', credits: 20, workflowIds: ['weekly-report', 'bogus'] }) });
    expect(created.status).toBe(201);
    const ws = (await json(created)).workspace as Workspace;
    expect(ws.token).toBe('cong-ty-thu-nghiem');
    expect(ws.workflowIds).toEqual(['weekly-report']);
    expect(ws.credits.total).toBe(20);

    const dup = await app.request('/api/admin/workspaces', { method: 'POST', headers: auth, body: JSON.stringify({ company: 'Công ty Thử Nghiệm' }) });
    expect(((await json(dup)).workspace as Workspace).token).not.toBe(ws.token);

    const updated = await app.request(`/api/admin/workspaces/${ws.id}`, {
      method: 'PUT', headers: auth,
      body: JSON.stringify({ knowledge: [{ title: 'Doc', content: 'Hello' }], customWorkflows: [], credits: { total: 30 }, status: 'active', overrides: { 'weekly-report': { samples: { notes: 'X' } } } }),
    });
    expect(updated.status).toBe(200);
    const body = await json(updated);
    expect(body.workspace.knowledge[0].id).toMatch(/^kd_/);
    expect(body.resolved[0].inputs[0].sample).toBe('X');

    const bad = await app.request(`/api/admin/workspaces/${ws.id}`, { method: 'PUT', headers: auth, body: JSON.stringify({ customWorkflows: [{ id: 'x' }] }) });
    expect(bad.status).toBe(400);

    expect((await app.request(`/api/admin/workspaces/${ws.id}`, { method: 'DELETE', headers: auth })).status).toBe(200);
    expect(store.getWorkspace(ws.id)).toBeUndefined();
  });

  it('drafts a valid custom workflow from a brief and it can be saved then run', async () => {
    const draft = await app.request('/api/admin/ai/draft-workflow', { method: 'POST', headers: auth, body: JSON.stringify({ brief: 'Soạn thư nhắc thanh toán cho khách quá hạn', lang: 'vi' }) });
    expect(draft.status).toBe(200);
    const { workflow, problems } = await json(draft);
    expect(problems).toEqual([]);
    const ws = store.getWorkspaceByToken('demo')!;
    const saved = await app.request(`/api/admin/workspaces/${ws.id}`, { method: 'PUT', headers: auth, body: JSON.stringify({ customWorkflows: [workflow] }) });
    expect(saved.status).toBe(200);
    const view = await json(await app.request('/api/sandbox/demo'));
    expect(view.workflows.some((w: { id: string }) => w.id === workflow.id)).toBe(true);
    const run = await app.request('/api/sandbox/demo/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId: workflow.id, inputs: { content: 'abc', goal: 'x' } }) });
    const events = await readSse(run);
    expect(events[events.length - 1].type).toBe('run.done');
  });

  it('computes an overview', async () => {
    const res = await app.request('/api/admin/overview', { headers: auth });
    const o = await json(res);
    expect(o.workspaces).toBe(1);
    expect(o.provider.name).toBe('mock');
  });
});
