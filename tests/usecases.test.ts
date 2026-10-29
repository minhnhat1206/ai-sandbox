import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { readConfig } from '../server/config.ts';
import { MockProvider } from '../server/providers/mock.ts';
import { Store } from '../server/store.ts';
import { UploadStore } from '../server/uploads.ts';
import { CATALOG } from '../shared/catalog/index.ts';
import { sampleInputs } from '../shared/engine/template.ts';
import type { Run, RunEvent } from '../shared/types.ts';

function makeApp() {
  const store = new Store(null);
  const config = readConfig({ ADMIN_TOKEN: 't', AI_PROVIDER: 'mock' });
  const app = createApp({ store, provider: new MockProvider(0), config, uploads: new UploadStore(null), filesDir: null });
  return { app, store };
}

async function readSse(res: Response): Promise<RunEvent[]> {
  const text = await res.text();
  return text.split('\n\n').map((chunk) => chunk.split('\n').find((l) => l.startsWith('data:'))).filter((l): l is string => !!l).map((l) => JSON.parse(l.slice(5).trim()) as RunEvent);
}

async function run(app: ReturnType<typeof makeApp>['app'], workflowId: string, inputs?: Record<string, string>): Promise<Run> {
  const wf = CATALOG.find((w) => w.id === workflowId)!;
  const res = await app.request('/api/sandbox/demo/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId, lang: 'vi', sessionId: 'uc', inputs: inputs ?? sampleInputs(wf) }) });
  const events = await readSse(res);
  const err = events.find((e) => e.type === 'error') as Extract<RunEvent, { type: 'error' }> | undefined;
  expect(err, `${workflowId}: ${err?.message}`).toBeUndefined();
  return (events.find((e) => e.type === 'run.done') as Extract<RunEvent, { type: 'run.done' }>).run;
}

async function chat(app: ReturnType<typeof makeApp>['app'], workflowId: string, content: string): Promise<Run> {
  const res = await app.request('/api/sandbox/demo/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ workflowId, lang: 'vi', sessionId: 'uc', messages: [{ role: 'user', content }] }) });
  const events = await readSse(res);
  expect(events.find((e) => e.type === 'error')).toBeUndefined();
  return (events.find((e) => e.type === 'run.done') as Extract<RunEvent, { type: 'run.done' }>).run;
}

const art = (r: Run, title: string) => r.artifacts.find((a) => a.title === title);

describe('every catalog workflow runs end to end on the demo data', () => {
  const { app } = makeApp();
  for (const wf of CATALOG.filter((w) => w.kind === 'form')) {
    it(wf.id, async () => {
      const r = await run(app, wf.id);
      expect(r.status).toBe('done');
      expect(r.trace.length, 'tool calls').toBeGreaterThanOrEqual(2);
      expect(r.trace.every((t) => t.output !== undefined)).toBe(true);
      expect(r.trace.filter((t) => t.isError), JSON.stringify(r.trace.filter((t) => t.isError))).toHaveLength(0);
      expect(r.artifacts.length, 'deliverables').toBeGreaterThanOrEqual(1);
      expect(r.output.length).toBeGreaterThan(80);
    });
  }
});

describe('use-case figures are computed, not invented', () => {
  let app: ReturnType<typeof makeApp>['app'];
  beforeEach(() => ({ app } = makeApp()));

  it('quote builder prices by segment, applies the 2% tier, VAT 8% and flags stock shortfalls', async () => {
    const r = await run(app, 'quote-builder-agent');
    const lines = art(r, 'Quote lines')!.rows!;
    expect(lines.map((l) => l.sku).sort()).toEqual(['P003', 'P004', 'P005', 'P007']);
    expect(lines.find((l) => l.sku === 'P007')!.unit_price).toBe(89000); // modern-trade price for GreenMart
    // 1200×89k + 600×98k + 300×145k + 400×165k = 275.1M; -2% = 269.598M; +8% VAT = 291.16584M
    expect(r.output).toContain('291.165.840');
    expect(r.actions.some((a) => a.type === 'ticket' && /Thiếu hàng/.test(a.summary))).toBe(true);
    expect(art(r, 'Quotation')!.content).toContain('BÁO GIÁ');
  });

  it('inbox triage classifies six messages and ignores the scam', async () => {
    const r = await run(app, 'inbox-triage-agent');
    const board = art(r, 'Triage board')!.rows!;
    expect(board.map((b) => b.type)).toEqual(['complaint', 'order', 'payment', 'price_request', 'spam', 'complaint']);
    expect(board[4].priority).toBe('ignore');
    expect(board[0].priority).toBe('urgent');
    expect(r.actions.filter((a) => a.type === 'email')).toHaveLength(5);
  });

  it('bank reconciliation matches invoices, catches the duplicate and the ambiguous payment', async () => {
    const r = await run(app, 'bank-recon-agent');
    const rows = art(r, 'Reconciliation')!.rows!;
    const status = Object.fromEntries(rows.map((x) => [x.txn, x.status]));
    expect(status).toMatchObject({ BT01: 'matched', BT02: 'matched', BT03: 'ambiguous', BT04: 'matched', BT05: 'unidentified', BT06: 'matched', BT07: 'duplicate', BT08: 'matched', BT09: 'bank_fee', BT10: 'supplier_payment', BT11: 'partial', BT12: 'interest' });
    expect(art(r, 'journal_entries.csv')!.content).toContain('6425');
    expect(r.actions.filter((a) => a.type === 'ticket')).toHaveLength(3);
  });

  it('pipeline review finds the six at-risk deals and the weighted pipeline', async () => {
    const r = await run(app, 'pipeline-review-agent');
    const tasks = art(r, 'Follow-up tasks')!.rows!;
    expect(tasks.map((t) => t.deal).sort()).toEqual(['D-202', 'D-203', 'D-205', 'D-206', 'D-209', 'D-211']);
    expect(r.output).toContain('1.660.000.000'); // weighted open pipeline
  });

  it('expense audit applies every policy rule', async () => {
    const r = await run(app, 'expense-audit-agent');
    const rows = Object.fromEntries(art(r, 'Claim review')!.rows!.map((x) => [x.claim, x]));
    expect(rows['E-02'].issues).toMatch(/hoá đơn/);
    expect(rows['E-03'].on_hold).toBe(400000);
    expect(rows['E-06'].issues).toMatch(/trễ 40 ngày/);
    expect(rows['E-08'].on_hold).toBe(500000);
    expect(rows['E-10'].issues).toMatch(/Trùng với E-09/);
    expect(rows['E-14'].issues).toMatch(/Mua hàng/);
    expect(rows['E-04'].issues).toBe('OK');
    expect(r.output).toContain('11.270.000');
    expect(r.output).toContain('7.440.000');
  });

  it('supplier comparison prefers on-time delivery and payment terms over unit price', async () => {
    const r = await run(app, 'supplier-compare-agent');
    const rows = art(r, 'Supplier comparison')!.rows!;
    expect(rows[0].supplier).toBe('Hợp tác xã Lúa Thơm');
    expect(rows.find((x) => x.supplier === 'Gạo Mekong Xanh')!.on_time).toBe('no');
    expect(rows.find((x) => x.supplier === 'Gạo Mekong Xanh')!.order_qty).toBe(1000);
  });

  it('AI readiness computes adoption, shadow-AI risk and hours from the survey', async () => {
    const r = await run(app, 'ai-readiness-agent');
    expect(r.output).toContain('79.2%');
    expect(r.output).toContain('10 người (41.7%)');
    expect(r.output).toContain('213 giờ/tháng');
  });

  it('AI policy flags personal-account tools for replacement and approves planned ones', async () => {
    const r = await run(app, 'ai-policy-agent');
    const tools = Object.fromEntries(art(r, 'Tool decision')!.rows!.map((x) => [x.tool, x.decision]));
    expect(tools.Gemini).toMatch(/replace/);
    expect(tools.Copilot).toMatch(/approve/);
    expect(art(r, 'AI use policy (draft)')!.content).toContain('Cần luật sư rà soát');
  });

  it('onboarding computes working-day deadlines and opens three tickets', async () => {
    const r = await run(app, 'onboarding-agent');
    expect(r.actions.filter((a) => a.type === 'ticket')).toHaveLength(3);
    expect(art(r, 'Onboarding checklist')!.rows![0].due).toBe('2026-11-04'); // 3 working days before Mon 9/11
  });

  it('data chat answers from the receivables table and returns a table', async () => {
    const r = await chat(app, 'data-chat', 'Khách nào đang nợ quá hạn nhiều nhất?');
    expect(r.trace.map((t) => t.tool)).toContain('aggregate_records');
    // Hoa Mai's 156M invoice is only 3 days late but is the largest overdue balance; Phú Quý is second.
    expect(art(r, 'Overdue by customer')!.rows!.slice(0, 2).map((x) => x.customer_name)).toEqual(['Chuỗi cửa hàng Hoa Mai', 'Đại lý Phú Quý']);
    expect(r.output).toContain('Đại lý Phú Quý');
  });

  it('policy helpdesk quotes documents, and escalates undocumented questions to HR', async () => {
    const known = await chat(app, 'policy-helpdesk', 'Đi taxi công tác được thanh toán tối đa bao nhiêu?');
    expect(known.output).toContain('300.000đ');
    expect(known.actions).toHaveLength(0);
    const ai = await chat(app, 'policy-helpdesk', 'Tôi có được dùng ChatGPT cá nhân để soạn báo giá không?');
    expect(ai.output).toMatch(/Không/);
    const unknown = await chat(app, 'policy-helpdesk', 'Công ty có hỗ trợ học phí MBA không?');
    expect(unknown.actions).toHaveLength(1);
    expect(unknown.actions[0].type).toBe('ticket');
    expect(unknown.output).toMatch(/chưa có/);
  });
});
