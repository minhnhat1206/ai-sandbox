import { describe, expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { readConfig } from '../server/config.ts';
import { applyGeneratedData, generateData, heuristicBlueprint, PRESET_KEYS, suggestWorkflows } from '../server/datagen/index.ts';
import { inferColumn, parseHeaderBlocks } from '../server/datagen/generate.ts';
import { MockProvider } from '../server/providers/mock.ts';
import { Store } from '../server/store.ts';
import { UploadStore } from '../server/uploads.ts';
import { resolveWorkflows } from '../server/workflows.ts';
import { parseCsv, type Row } from '../shared/engine/csv.ts';
import { sampleInputs, validateInputs } from '../shared/engine/template.ts';
import type { GeneratedData, Run, RunEvent } from '../shared/types.ts';

const AS_OF = '2027-03-15';
const rowsOf = (d: GeneratedData, name: string): Row[] => parseCsv(d.dataSources.find((t) => t.name === name)!.csv).rows;
const n = (v: string) => Number(v) || 0;

function blueprint(presetKey: string, headers = '') {
  return heuristicBlueprint({ company: 'Công ty Thử Nghiệm', industry: '', notes: 'công nợ, báo giá, khiếu nại', headers, presetKey, asOf: AS_OF });
}

async function readSse(res: Response): Promise<RunEvent[]> {
  const text = await res.text();
  return text.split('\n\n').map((c) => c.split('\n').find((l) => l.startsWith('data:'))).filter((l): l is string => !!l).map((l) => JSON.parse(l.slice(5).trim()) as RunEvent);
}

describe('synthetic data generator', () => {
  it('is deterministic for the same company and industry', () => {
    expect(generateData(blueprint('packaging')).dataSources[1].csv).toBe(generateData(blueprint('packaging')).dataSources[1].csv);
  });

  for (const { key } of PRESET_KEYS) {
    it(`${key}: tables are consistent with each other`, () => {
      const d = generateData(blueprint(key));
      expect(d.dataSources.map((t) => t.name)).toEqual(['customers', 'orders', 'receivables', 'inventory', 'tickets', 'price_list', 'deals', 'bank_transactions', 'expenses', 'reviews', 'ai_survey']);
      const customers = rowsOf(d, 'customers');
      const ids = new Set(customers.map((c) => c.customer_id));
      const orders = rowsOf(d, 'orders');
      expect(orders.every((o) => ids.has(o.customer_id) && n(o.amount) === n(o.qty) * n(o.unit_price))).toBe(true);
      expect(orders.some((o) => o.status === 'delayed' && o.promised_date < AS_OF)).toBe(true);
      const recv = rowsOf(d, 'receivables');
      expect(recv.every((r) => n(r.balance) === n(r.amount) - n(r.paid) && ids.has(r.customer_id))).toBe(true);
      expect(recv.filter((r) => n(r.days_overdue) > 30).length).toBeGreaterThanOrEqual(2);
      const skus = rowsOf(d, 'inventory').map((i) => i.sku);
      expect(rowsOf(d, 'price_list').map((p) => p.sku)).toEqual(skus);
      expect(rowsOf(d, 'inventory').some((i) => n(i.on_hand) - n(i.reserved) < n(i.reorder_point))).toBe(true);
      const invoices = new Set(recv.map((r) => r.invoice_id));
      const refs = rowsOf(d, 'bank_transactions').flatMap((t) => /INV-?(\d{4})/.exec(t.description)?.[1] ?? []);
      expect(refs.length).toBeGreaterThanOrEqual(3);
      expect(refs.every((r) => invoices.has(`INV-${r}`))).toBe(true);
      expect(rowsOf(d, 'ai_survey')).toHaveLength(24);
      expect(d.knowledge).toHaveLength(6);
      expect(d.asOf).toBe(AS_OF);
    });
  }

  it('reads pasted headers into extra tables with sensible column kinds', () => {
    const specs = parseHeaderBlocks('Phiếu xuất kho: Số phiếu, Ngày xuất, Khách hàng, Mã hàng, Số lượng, Đơn giá, Thành tiền, Trạng thái\nHọ tên\tPhòng ban\tSĐT\tEmail\tLương', ['customers']);
    expect(specs.map((s) => s.name)).toEqual(['phieu_xuat_kho', 'bang_2']);
    expect(specs[0].columns.map((c) => c.kind)).toEqual(['id', 'date', 'customer', 'id', 'integer', 'money', 'money', 'enum']);
    expect(specs[1].columns.map((c) => c.kind)).toEqual(['person', 'enum', 'phone', 'email', 'money']);
    expect(inferColumn('Số lượng').kind).toBe('integer');
    const d = generateData(blueprint('fmcg', 'Phiếu xuất kho: Số phiếu, Khách hàng, Số lượng, Đơn giá, Thành tiền'));
    const extra = rowsOf(d, 'phieu_xuat_kho');
    expect(extra).toHaveLength(20);
    expect(extra.every((r) => n(r.thanh_tien) === n(r.so_luong) * n(r.don_gia))).toBe(true);
  });

  it('suggests workflows from the call notes and always includes both chats', () => {
    const ids = suggestWorkflows('Kế toán đối soát sao kê ngân hàng mỗi sáng, tồn kho hay hết hàng');
    expect(ids).toContain('bank-recon-agent');
    expect(ids).toContain('inventory-agent');
    expect(ids).toContain('data-chat');
    expect(ids).toContain('policy-helpdesk');
  });
});

describe('every catalog agent runs on generated data', () => {
  for (const key of ['packaging', 'medical', 'fnb']) {
    describe(key, () => {
      const store = new Store(null);
      const ws = store.getWorkspaceByToken('demo')!;
      ws.company = 'Công ty Thử Nghiệm';
      applyGeneratedData(ws, blueprint(key), { mode: 'replace' });
      store.upsertWorkspace(ws);
      const app = createApp({ store, provider: new MockProvider(0), config: readConfig({ ADMIN_TOKEN: 't', AI_PROVIDER: 'mock' }), uploads: new UploadStore(null), filesDir: null });
      const workflows = resolveWorkflows(ws);

      for (const wf of workflows) {
        it(wf.id, async () => {
          const inputs = sampleInputs(wf, ws.overrides[wf.id]);
          expect(validateInputs(wf.inputs, inputs)).toEqual([]);
          const body = wf.kind === 'form'
            ? { workflowId: wf.id, lang: 'vi', sessionId: 'gen', inputs }
            : { workflowId: wf.id, lang: 'vi', sessionId: 'gen', messages: [{ role: 'user', content: wf.chat!.starters[0].vi }] };
          const events = await readSse(await app.request(`/api/sandbox/demo/${wf.kind === 'form' ? 'runs' : 'chat'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
          const err = events.find((e) => e.type === 'error');
          expect(err, JSON.stringify(err)).toBeUndefined();
          const run = (events.find((e) => e.type === 'run.done') as Extract<RunEvent, { type: 'run.done' }>).run as Run;
          expect(run.status).toBe('done');
          expect(run.trace.filter((t) => t.isError), JSON.stringify(run.trace.filter((t) => t.isError))).toHaveLength(0);
          expect(run.output).not.toContain('Việt Minh');
          expect(run.output).not.toContain('NaN');
          if (wf.kind === 'form') expect(run.artifacts.length).toBeGreaterThanOrEqual(1);
        });
      }

      it('order care finds the delayed order from the generated sample', async () => {
        const wf = workflows.find((w) => w.id === 'order-care-agent')!;
        const events = await readSse(await app.request('/api/sandbox/demo/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId: wf.id, lang: 'vi', sessionId: 'gen', inputs: sampleInputs(wf, ws.overrides[wf.id]) }) }));
        const run = (events.find((e) => e.type === 'run.done') as Extract<RunEvent, { type: 'run.done' }>).run;
        const orderId = /đơn (\d{5})/.exec(sampleInputs(wf, ws.overrides[wf.id]).message)![1];
        expect(run.output).toContain(orderId);
        expect(run.actions.length).toBeGreaterThanOrEqual(1);
      });

      it('quote builder prices every requested line', async () => {
        const wf = workflows.find((w) => w.id === 'quote-builder-agent')!;
        const events = await readSse(await app.request('/api/sandbox/demo/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId: wf.id, lang: 'vi', sessionId: 'gen', inputs: sampleInputs(wf, ws.overrides[wf.id]) }) }));
        const run = (events.find((e) => e.type === 'run.done') as Extract<RunEvent, { type: 'run.done' }>).run;
        expect(run.artifacts.find((a) => a.title === 'Quote lines')?.rows?.length).toBe(4);
      });
    });
  }
});
