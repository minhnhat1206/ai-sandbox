import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { readConfig } from '../server/config.ts';
import { MockProvider } from '../server/providers/mock.ts';
import { Store } from '../server/store.ts';
import { UploadStore } from '../server/uploads.ts';
import { aggregateRows, parseCsv, queryRows, toNumber } from '../shared/engine/csv.ts';
import { CATALOG } from '../shared/catalog/index.ts';
import type { RunEvent } from '../shared/types.ts';

const ADMIN = 'test-admin-token';
const auth = { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response): Promise<any> => res.json();

function makeApp() {
  const store = new Store(null);
  const config = readConfig({ ADMIN_TOKEN: ADMIN, AI_PROVIDER: 'mock' });
  const app = createApp({ store, provider: new MockProvider(0), config, uploads: new UploadStore(null), filesDir: null });
  return { app, store };
}

async function readSse(res: Response): Promise<RunEvent[]> {
  const text = await res.text();
  return text.split('\n\n').map((chunk) => chunk.split('\n').find((l) => l.startsWith('data:'))).filter((l): l is string => !!l).map((l) => JSON.parse(l.slice(5).trim()) as RunEvent);
}

async function runWorkflow(app: ReturnType<typeof makeApp>['app'], workflowId: string, inputs: Record<string, string>) {
  const res = await app.request('/api/sandbox/demo/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId, lang: 'vi', sessionId: 'agent-test', inputs }) });
  expect(res.status).toBe(200);
  const events = await readSse(res);
  const done = events.find((e) => e.type === 'run.done') as Extract<RunEvent, { type: 'run.done' }> | undefined;
  const error = events.find((e) => e.type === 'error') as Extract<RunEvent, { type: 'error' }> | undefined;
  expect(error, error?.message).toBeUndefined();
  expect(done).toBeDefined();
  return { events, run: done!.run };
}

describe('csv engine', () => {
  const t = parseCsv('a,b,"c, quoted"\n1,x,"hello, world"\n2,y,plain\n"3",x,"with ""quotes"""');
  it('parses quoted fields and detects delimiters', () => {
    expect(t.columns).toEqual(['a', 'b', 'c, quoted']);
    expect(t.rows[0]['c, quoted']).toBe('hello, world');
    expect(t.rows[2]['c, quoted']).toBe('with "quotes"');
    expect(parseCsv('x;y\n1;2').columns).toEqual(['x', 'y']);
  });
  it('queries and aggregates with Vietnamese numbers', () => {
    expect(toNumber('1.250.000')).toBe(1250000);
    expect(toNumber('25,350.00')).toBe(25350);
    expect(toNumber('2,5%')).toBe(2.5);
    expect(queryRows(t, { where: [{ field: 'b', op: 'eq', value: 'x' }] })).toHaveLength(2);
    expect(queryRows(t, { where: [{ field: 'a', op: 'gte', value: 2 }], sort: { field: 'a', dir: 'desc' } })[0].a).toBe('3');
    const agg = aggregateRows(t, { groupBy: 'b', metrics: [{ field: 'a', fn: 'sum' }, { fn: 'count' }] });
    expect(agg.find((r) => r.b === 'x')).toEqual({ b: 'x', sum_a: 4, count: 2 });
  });
});

describe('agent workflows (mock provider runs real tools)', () => {
  let app: ReturnType<typeof makeApp>['app'];
  let store: Store;
  beforeEach(() => ({ app, store } = makeApp()));

  it('demo sandbox exposes connected data sources and agent workflows', async () => {
    const view = await json(await app.request('/api/sandbox/demo'));
    expect(view.dataSources.map((d: { name: string }) => d.name)).toEqual(['customers', 'orders', 'receivables', 'inventory', 'tickets', 'price_list', 'deals', 'bank_transactions', 'expenses', 'reviews', 'ai_survey']);
    expect(view.workflows).toHaveLength(CATALOG.length);
    expect(view.dataSources[1].rows).toBeGreaterThan(15);
    expect(view.workflows.some((w: { id: string }) => w.id === 'order-care-agent')).toBe(true);
  });

  it('order complaint agent: looks up the order, opens a ticket, drafts the reply, publishes a case file', async () => {
    const { events, run } = await runWorkflow(app, 'order-care-agent', { message: 'Đơn 48213 chưa nhận được, huỷ và hoàn tiền giúp', channel: 'zalo' });
    const tools = run.trace.map((t) => t.tool);
    expect(tools).toContain('query_records');
    expect(tools).toContain('search_knowledge');
    expect(tools).toContain('create_ticket');
    expect(tools).toContain('draft_email');
    expect(run.trace.every((t) => t.output !== undefined && t.durationMs !== undefined)).toBe(true);
    expect(run.actions.map((a) => a.type).sort()).toEqual(['email', 'ticket']);
    expect(run.artifacts.find((a) => a.kind === 'markdown')?.content).toContain('Sen Vàng');
    expect(run.output).toMatch(/48213/);
    expect(events.filter((e) => e.type === 'tool.call').length).toBe(run.trace.length);
    expect(events.filter((e) => e.type === 'artifact').length).toBe(run.artifacts.length);
    expect(store.getRun(run.id)?.actions).toHaveLength(2);
  });

  it('receivables agent: aggregates real balances into a dashboard, call list and reminder drafts', async () => {
    const { run } = await runWorkflow(app, 'receivables-agent', { threshold: '15', tone: 'firm' });
    const html = run.artifacts.find((a) => a.kind === 'html');
    const table = run.artifacts.find((a) => a.kind === 'table');
    expect(html?.content).toContain('<svg');
    expect(html?.content).toContain('Dashboard công nợ');
    expect(table?.rows?.length).toBeGreaterThan(3);
    expect(table?.rows?.every((r) => Number(r.days_overdue) >= 15)).toBe(true);
    expect(run.actions.filter((a) => a.type === 'email').length).toBeGreaterThanOrEqual(3);
    // Total balance is the sum of the 16 sample invoices, computed by the tool rather than written in prose.
    const agg = run.trace.find((t) => t.tool === 'aggregate_records');
    expect(JSON.parse(agg!.output!).rows[0].balance).toBe(725_730_000);
  });

  it('inventory agent flags SKUs below lead time and exports CSV', async () => {
    const { run } = await runWorkflow(app, 'inventory-agent', { safety: '7', budget: '300000000' });
    const table = run.artifacts.find((a) => a.kind === 'table');
    const critical = table?.rows?.filter((r) => String(r.urgency).startsWith('critical')).map((r) => r.sku);
    expect(critical).toContain('P003'); // 60 available / 45 per day = 1.3 days < 5-day lead time
    expect(run.artifacts.find((a) => a.kind === 'csv')?.content).toContain('sku,product');
  });

  it('data clean-up normalises phones, emails, cities and merges duplicates', async () => {
    const wf = CATALOG.find((w) => w.id === 'data-cleanup')!;
    const { run } = await runWorkflow(app, 'data-cleanup', { data: wf.inputs.find((i) => i.key === 'data')!.sample });
    const table = run.artifacts.find((a) => a.kind === 'table')!;
    expect(table.rows!.length).toBe(6); // 8 rows in, 2 duplicate pairs merged
    const tuan = table.rows!.find((r) => String(r.name).includes('Tuấn'))!;
    expect(tuan.phone).toBe('0903111222');
    expect(tuan.email).toBe('tuan@minhphat.example');
    expect(tuan.city).toBe('TP. Hồ Chí Minh');
    expect(table.rows!.find((r) => String(r.email).includes('greenmart'))!.flags).toContain('email');
  });

  it('document review reads an uploaded text file and publishes a clause table', async () => {
    const form = new FormData();
    form.append('file', new File(['Điều 1. Giao hàng: phạt 0,5%/ngày tối đa 10%.\nĐiều 2. Độc quyền: không bán cho đối thủ trong 12 tháng sau khi chấm dứt.'], 'hop-dong.txt', { type: 'text/plain' }));
    const up = await json(await app.request('/api/sandbox/demo/uploads', { method: 'POST', body: form }));
    expect(up.upload.id).toMatch(/^upl_/);
    expect(up.upload.hasText).toBe(true);
    const { run } = await runWorkflow(app, 'document-review', { file: up.upload.id, text: '', side: 'B' });
    const table = run.artifacts.find((a) => a.kind === 'table')!;
    expect(table.rows!.length).toBe(2);
    expect(table.rows!.some((r) => r.risk === 'high')).toBe(true);
  });

  it('rejects unsupported uploads and unknown file ids', async () => {
    const form = new FormData();
    form.append('file', new File(['x'], 'virus.exe'));
    expect((await app.request('/api/sandbox/demo/uploads', { method: 'POST', body: form })).status).toBe(400);
    const res = await app.request('/api/sandbox/demo/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId: 'document-review', inputs: { file: 'not-an-id', text: 'abc', side: 'B' } }) });
    const events = await readSse(res);
    expect(events[0].type).toBe('error');
  });

  it('serves artifacts for download with safe headers', async () => {
    const { run } = await runWorkflow(app, 'weekly-ops-agent', { period: 'tuần 43', focus: 'giao hàng' });
    const html = run.artifacts.find((a) => a.kind === 'html')!;
    const res = await app.request(`/api/sandbox/demo/runs/${run.id}/artifacts/${html.id}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    const csv = run.artifacts.find((a) => a.kind === 'markdown')!;
    const dl = await app.request(`/api/sandbox/demo/runs/${run.id}/artifacts/${csv.id}?download`);
    expect(dl.headers.get('content-disposition')).toContain('attachment');
    expect((await app.request(`/api/sandbox/demo/runs/${run.id}/artifacts/nope`)).status).toBe(404);
  });

  it('admin can add a data source and an MCP server; the token is masked and preserved', async () => {
    const ws = store.getWorkspaceByToken('demo')!;
    const res = await app.request(`/api/admin/workspaces/${ws.id}`, { method: 'PUT', headers: auth, body: JSON.stringify({ dataSources: [{ name: 'Price List', description: 'bảng giá', csv: 'sku,price\nA,10\nB,20' }], mcpServers: [{ name: 'CRM', url: 'https://mcp.example/sse', authToken: 'secret' }] }) });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.workspace.dataSources[0].name).toBe('price_list');
    expect(body.workspace.mcpServers[0]).toMatchObject({ name: 'crm', authToken: '••••••••' });
    expect(store.getWorkspace(ws.id)!.mcpServers[0].authToken).toBe('secret');
    const again = await app.request(`/api/admin/workspaces/${ws.id}`, { method: 'PUT', headers: auth, body: JSON.stringify({ mcpServers: body.workspace.mcpServers }) });
    expect(again.status).toBe(200);
    expect(store.getWorkspace(ws.id)!.mcpServers[0].authToken).toBe('secret');
    const bad = await app.request(`/api/admin/workspaces/${ws.id}`, { method: 'PUT', headers: auth, body: JSON.stringify({ dataSources: [{ name: 'empty', csv: 'only,header' }] }) });
    expect(bad.status).toBe(400);
    const view = await json(await app.request('/api/sandbox/demo'));
    expect(view.connectors).toEqual(['crm']);
    expect(view.dataSources[0].name).toBe('price_list');
    expect(view.dataSources).toHaveLength(1);
  });
});
