import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { readConfig } from '../server/config.ts';
import { MockProvider } from '../server/providers/mock.ts';
import { plainSummary } from '../server/report.ts';
import { Store } from '../server/store.ts';
import { UploadStore } from '../server/uploads.ts';
import type { DataBlueprint, GeneratedData, Report, Workspace } from '../shared/types.ts';

const ADMIN = 'test-admin-token';
const auth = { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (res: Response): Promise<any> => res.json();

function makeApp() {
  const store = new Store(null);
  const app = createApp({ store, provider: new MockProvider(0), config: readConfig({ ADMIN_TOKEN: ADMIN, AI_PROVIDER: 'mock' }), uploads: new UploadStore(null), filesDir: null });
  return { app, store };
}

async function runOnce(app: ReturnType<typeof makeApp>['app'], workflowId: string, inputs: Record<string, string>) {
  const res = await app.request('/api/sandbox/demo/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId, lang: 'vi', sessionId: 'boss', visitorName: 'Anh Minh', inputs }) });
  const text = await res.text();
  const done = text.split('\n\n').map((c) => c.split('\n').find((l) => l.startsWith('data:'))).filter((l): l is string => !!l).map((l) => JSON.parse(l.slice(5))).find((e) => e.type === 'run.done');
  return done.run as { id: string };
}

describe('report for the decision maker', () => {
  let app: ReturnType<typeof makeApp>['app'];
  let store: Store;
  beforeEach(() => ({ app, store } = makeApp()));

  it('refuses to build a report before any run', async () => {
    const res = await app.request('/api/admin/workspaces/ws_demo/reports', { method: 'POST', headers: auth, body: '{}' });
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe('no_runs');
  });

  it('builds from runs, stays private as a draft, publishes, counts views and turns acceptance into a lead', async () => {
    const r1 = await runOnce(app, 'receivables-agent', { threshold: '15', tone: 'firm' });
    await runOnce(app, 'inventory-agent', { safety: '7', budget: '300000000' });
    await app.request(`/api/sandbox/demo/runs/${r1.id}/feedback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rating: 5, feedback: 'Rất sát thực tế' }) });

    const created = await app.request('/api/admin/workspaces/ws_demo/reports', { method: 'POST', headers: auth, body: JSON.stringify({ lang: 'vi' }) });
    expect(created.status).toBe(201);
    const report = (await json(created)).report as Report;
    expect(report.status).toBe('draft');
    expect(report.token).toMatch(/^[a-z0-9]{16}$/);
    expect(report.metrics).toMatchObject({ runs: 2, workflowsTried: 2, ratings: 1, avgRating: 5, people: 1 });
    expect(report.metrics.minutesSaved).toBeGreaterThan(0);
    expect(report.highlights[0].workflowId).toBe('receivables-agent');
    expect(report.highlights[0].headline).not.toContain('**');
    expect(report.summary).toContain('Rất sát thực tế');
    expect(report.offer.agenda.length).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(report)).not.toMatch(/costUsd|spentUsd|USD 0/);

    // Draft is not public.
    expect((await app.request(`/api/report/${report.token}`)).status).toBe(404);

    const edited = await app.request(`/api/admin/reports/${report.id}`, { method: 'PUT', headers: auth, body: JSON.stringify({ title: 'Báo cáo cho anh Minh', offer: { price: '5.000.000 đ' }, findings: ['Một', 'Hai'], status: 'published', notes: 'ignored' }) });
    const pub = (await json(edited)).report as Report;
    expect(pub).toMatchObject({ title: 'Báo cáo cho anh Minh', status: 'published', findings: ['Một', 'Hai'] });
    expect(pub.offer.price).toBe('5.000.000 đ');
    expect(pub.offer.title).toBe(report.offer.title);
    expect(pub.publishedAt).toBeTruthy();

    const view = await app.request(`/api/report/${report.token}`);
    expect(view.status).toBe(200);
    const body = (await json(view)).report;
    expect(body.company).toBe('Việt Minh Distribution');
    expect(body.workspaceId).toBeUndefined();
    expect(body.views).toBeUndefined();
    await app.request(`/api/report/${report.token}?preview`);
    expect(store.getReport(report.id)!.views).toBe(1);

    const bad = await app.request(`/api/report/${report.token}/accept`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Anh Minh' }) });
    expect(bad.status).toBe(400);
    const ok = await app.request(`/api/report/${report.token}/accept`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Anh Minh', email: '0903 000 111', message: 'Tuần sau được không?' }) });
    expect(ok.status).toBe(200);
    const leads = store.listLeads('ws_demo');
    expect(leads[0]).toMatchObject({ type: 'book_call', name: 'Anh Minh', email: '0903 000 111' });
    expect(leads[0].message).toContain('Tuần sau');
    expect(store.getReport(report.id)!.acceptedAt).toBeTruthy();

    const list = await json(await app.request('/api/admin/workspaces', { headers: auth }));
    const demo = list.workspaces.find((w: Workspace) => w.id === 'ws_demo');
    expect(demo.stats.report).toMatchObject({ status: 'published', views: 1, accepted: true });
  });

  it('rejects unknown and malformed report tokens', async () => {
    expect((await app.request('/api/report/nope')).status).toBe(404);
    expect((await app.request('/api/report/aaaaaaaaaaaaaaaa')).status).toBe(404);
  });

  it('strips Markdown and the demo footer from run summaries', () => {
    expect(plainSummary('**Tổng** nợ 5 đ.\n\n---\n*Kết quả demo*')).toBe('Tổng nợ 5 đ.');
  });
});

describe('data studio API', () => {
  let app: ReturnType<typeof makeApp>['app'];
  let store: Store;
  beforeEach(() => ({ app, store } = makeApp()));

  it('requires the admin token', async () => {
    expect((await app.request('/api/admin/datagen/blueprint', { method: 'POST', body: '{}' })).status).toBe(401);
  });

  it('proposes, previews and applies synthetic data to a sandbox', async () => {
    const ws = (await json(await app.request('/api/admin/workspaces', { method: 'POST', headers: auth, body: JSON.stringify({ company: 'Vật liệu Thành Đạt', industry: 'Phân phối vật liệu xây dựng' }) }))).workspace as Workspace;
    expect((await app.request('/api/admin/datagen/blueprint', { method: 'POST', headers: auth, body: JSON.stringify({}) })).status).toBe(400);
    const proposed = await json(await app.request('/api/admin/datagen/blueprint', { method: 'POST', headers: auth, body: JSON.stringify({ company: ws.company, industry: ws.industry, notes: 'Công nợ nhà thầu kéo dài, báo giá thép mất cả ngày', headers: 'Phiếu giao hàng: Số phiếu, Ngày giao, Khách hàng, Sản phẩm, Số lượng, Đơn giá, Thành tiền' }) }));
    const bp = proposed.blueprint as DataBlueprint;
    expect(bp.profile.key).toBe('building');
    expect(bp.source).toBe('heuristic');
    expect(bp.extraTables[0].name).toBe('phieu_giao_hang');
    expect(bp.workflowIds).toContain('receivables-agent');
    expect(bp.workflowIds).toContain('quote-builder-agent');

    bp.profile.products[0].name = 'Xi măng Đặc Biệt PCB50';
    const preview = await json(await app.request('/api/admin/datagen/preview', { method: 'POST', headers: auth, body: JSON.stringify({ blueprint: bp }) }));
    const data = preview.data as GeneratedData;
    expect(data.dataSources).toHaveLength(12);
    expect(data.dataSources.find((d) => d.name === 'price_list')!.csv).toContain('Xi măng Đặc Biệt PCB50');
    expect(data.samples['order-care-agent'].message).toMatch(/đơn \d{5}/);
    expect((await app.request('/api/admin/datagen/preview', { method: 'POST', headers: auth, body: JSON.stringify({ blueprint: { company: '' } }) })).status).toBe(400);

    const applied = await json(await app.request(`/api/admin/workspaces/${ws.id}/datagen/apply`, { method: 'POST', headers: auth, body: JSON.stringify({ blueprint: bp, mode: 'replace', setWorkflows: true }) }));
    const after = applied.workspace as Workspace;
    expect(after.dataSources).toHaveLength(12);
    expect(after.knowledge).toHaveLength(6);
    expect(after.workflowIds).toEqual(bp.workflowIds);
    expect(after.overrides['order-care-agent'].samples?.message).toBeTruthy();
    expect(store.getWorkspace(ws.id)!.dataAsOf).toBe(bp.asOf);

    // The prospect sees the new tables (but never the overrides or notes).
    const view = await json(await app.request(`/api/sandbox/${after.token}`));
    expect(view.dataSources.map((d: { name: string }) => d.name)).toContain('phieu_giao_hang');
    expect(JSON.stringify(view)).not.toContain('overrides');
  });
});
