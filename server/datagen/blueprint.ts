/**
 * Step 1 of the data studio: propose what the prospect's synthetic data should look like.
 * With Claude, the model reads the call notes, pasted headers, template files and software
 * screenshots and returns an industry profile + extra tables. In demo mode (or when the model
 * answer is unusable) a keyword-matched preset and the header parser are used instead.
 */
import { CATALOG } from '../../shared/catalog/index.ts';
import type { DataBlueprint, ExtraTableSpec, IndustryProfile } from '../../shared/types.ts';
import type { Provider, TextAttachment } from '../providers/types.ts';
import { fold, inferColumn, parseHeaderBlocks } from './generate.ts';
import { matchPreset, presetByKey } from './profiles.ts';

export interface BlueprintInput {
  company: string;
  industry: string;
  /** Discovery-call notes or the workspace brief. */
  notes: string;
  /** Pasted header rows, one table per line ("name: col1, col2" or a bare header row). */
  headers: string;
  /** Screenshots, PDFs or CSV templates the prospect shared. */
  files?: TextAttachment[];
  /** Force a preset instead of keyword matching. */
  presetKey?: string;
  asOf?: string;
}

export const CANONICAL_TABLES = ['customers', 'orders', 'receivables', 'inventory', 'tickets', 'price_list', 'deals', 'bank_transactions', 'expenses', 'reviews', 'ai_survey'];

const WORKFLOW_HINTS: [RegExp, string[]][] = [
  [/cong no|thu hoi no|no qua han|receivable|debt|collection/, ['receivables-agent', 'bank-recon-agent']],
  [/sao ke|doi soat|ngan hang|bank|reconcil/, ['bank-recon-agent']],
  [/bao gia|quote|quotation|gia ban/, ['quote-builder-agent']],
  [/khieu nai|cskh|cham soc|zalo|inbox|tin nhan|complain|customer service/, ['order-care-agent', 'inbox-triage-agent']],
  [/ton kho|kho|het hang|inventory|stock/, ['inventory-agent', 'supplier-compare-agent']],
  [/nha cung cap|mua hang|thu mua|supplier|purchas/, ['supplier-compare-agent']],
  [/bao cao|giao ban|report|dashboard/, ['weekly-ops-agent', 'monthly-review-deck']],
  [/pipeline|sales|kinh doanh|doanh so|crm|co hoi/, ['pipeline-review-agent', 'meeting-prep-agent']],
  [/danh gia|review|phan hoi|feedback/, ['voc-insights-agent']],
  [/chi phi|thanh toan|tam ung|expense/, ['expense-audit-agent']],
  [/nhan su|tuyen|onboard|nhan vien moi|hr\b/, ['onboarding-agent', 'policy-helpdesk']],
  [/chatgpt|ai ca nhan|chinh sach ai|tai khoan ca nhan|bao mat|ai policy/, ['ai-readiness-agent', 'ai-policy-agent']],
  [/hop dong|contract/, ['document-review']],
  [/excel|bang tinh|nhap lieu|lam sach|spreadsheet/, ['excel-builder', 'data-cleanup']],
];
const DEFAULT_ORDER = ['order-care-agent', 'quote-builder-agent', 'receivables-agent', 'data-chat', 'bank-recon-agent', 'weekly-ops-agent', 'inbox-triage-agent', 'policy-helpdesk', 'ai-readiness-agent'];

/** Workflows that fit the notes, always including the two chats, 8 in total, in demo order. */
export function suggestWorkflows(notes: string): string[] {
  const f = ` ${fold(notes)} `;
  const picked: string[] = [];
  for (const [re, ids] of WORKFLOW_HINTS) if (re.test(f)) for (const id of ids) if (!picked.includes(id)) picked.push(id);
  for (const id of DEFAULT_ORDER) if (picked.length < 7 && !picked.includes(id)) picked.push(id);
  const out = picked.slice(0, 7);
  if (!out.includes('data-chat')) out.splice(Math.min(3, out.length), 0, 'data-chat');
  if (!out.includes('policy-helpdesk')) out.push('policy-helpdesk');
  return out.filter((id) => CATALOG.some((w) => w.id === id));
}

function headersFromFiles(files: TextAttachment[] = []): string {
  return files
    .filter((f) => f.text && /csv|text|markdown/.test(f.mime))
    .map((f) => `${f.name.replace(/\.[a-z0-9]+$/i, '')}: ${(f.text ?? '').split(/\r?\n/).find((l) => l.trim()) ?? ''}`)
    .join('\n');
}

export function heuristicBlueprint(input: BlueprintInput, notes: string[] = []): DataBlueprint {
  const profile = (input.presetKey && presetByKey(input.presetKey)) || matchPreset(`${input.industry} ${input.notes}`);
  const headerText = [input.headers, headersFromFiles(input.files)].filter(Boolean).join('\n');
  const extraTables = parseHeaderBlocks(headerText, CANONICAL_TABLES);
  const images = (input.files ?? []).filter((f) => f.mime.startsWith('image/') || f.mime === 'application/pdf');
  return {
    company: input.company,
    industry: input.industry || profile.label,
    asOf: input.asOf ?? new Date().toISOString().slice(0, 10),
    profile,
    extraTables,
    workflowIds: suggestWorkflows(`${input.industry} ${input.notes}`),
    notes: [
      `Dùng bộ từ vựng mẫu ngành "${profile.label}". Sửa tên khách, sản phẩm, giá cho sát với khách thật.`,
      ...(extraTables.length ? [`${extraTables.length} bảng theo cấu trúc file của khách: kiểm tra kiểu từng cột.`] : []),
      ...(images.length ? [`${images.length} ảnh/PDF chưa được đọc ở chế độ demo. Khi bật Claude, AI sẽ đọc cột từ ảnh màn hình.`] : []),
      ...notes,
    ],
    source: 'heuristic',
  };
}

/* ------------------------------------------------------------- AI proposal */

const SYSTEM = `You design realistic synthetic business data for a Vietnamese company's AI trial sandbox. The data must feel like THEIR company (industry vocabulary, customer types, product names, units, price levels, cities) but must be entirely fictional: never use real company names, real people or real brands.
Return ONLY a JSON object (no prose, no code fences) of this TypeScript type:
{
  "profile": {
    "label": string,                 // industry label in Vietnamese
    "segments": string[],            // exactly 4 customer segments, short, in the language the company would use
    "customers": { "name": string, "segment": string, "city": string, "contact": string }[],   // exactly 12, fictional, segment must be one of segments; contact like "Anh Tuấn", "Chị Mai", "Mr. Lee"
    "products": { "name": string, "category": string, "unit": string, "price": number, "supplier": string }[], // exactly 10 products or services they SELL; unit in Vietnamese (cái, bộ, kg, thùng, chuyến, giờ...); price = list price in VND per unit; supplier = fictional
    "carriers": string[],            // 3 delivery methods (2nd one = an outside carrier)
    "prospects": { "name": string, "segment": string }[],  // 4 fictional prospects not yet customers
    "qtyRange": [number, number],    // typical quantity per order line
    "departments": string[]          // 8 departments, Vietnamese, first = sales, second = accounting
  },
  "extraTables": { "name": string, "description": string, "rows": number, "columns": { "name": string, "label": string, "kind": "id"|"text"|"person"|"customer"|"product"|"enum"|"integer"|"money"|"percent"|"date"|"email"|"phone"|"boolean", "values"?: string[], "min"?: number, "max"?: number }[] }[],
  "workflowIds": string[],           // 6-9 ids from the list below that best fit their pains, most impressive first; always include "data-chat"
  "notes": string[]                  // 2-5 short Vietnamese notes: assumptions the engineer should verify with the prospect
}
extraTables: one table per structure the prospect showed us (pasted headers, template files, software screenshots), reproducing THEIR column labels; table and column "name" = lower_snake_case ASCII; rows 15-40. Empty array if they showed none.
Available workflows: ${CATALOG.map((w) => `${w.id} (${w.name.en})`).join('; ')}.`;

function clampStr(v: unknown, max: number, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback;
}

/** Validate and repair a model-proposed profile, filling gaps from the closest preset. */
export function normalizeProfile(raw: unknown, base: IndustryProfile): IndustryProfile {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const segments = Array.isArray(r.segments) ? r.segments.map((s) => clampStr(s, 40)).filter(Boolean).slice(0, 4) : [];
  const segs = segments.length >= 3 ? segments : base.segments;
  const customers = (Array.isArray(r.customers) ? r.customers : [])
    .map((c) => c as Record<string, unknown>)
    .map((c) => ({ name: clampStr(c.name, 80), segment: segs.includes(String(c.segment)) ? String(c.segment) : segs[0], city: clampStr(c.city, 40, 'Hồ Chí Minh'), contact: clampStr(c.contact, 40, 'Anh Nam') }))
    .filter((c, i, all) => c.name && all.findIndex((x) => x.name === c.name) === i)
    .slice(0, 14);
  const products = (Array.isArray(r.products) ? r.products : [])
    .map((p) => p as Record<string, unknown>)
    .map((p) => ({ name: clampStr(p.name, 80), category: clampStr(p.category, 40, 'Khác'), unit: clampStr(p.unit, 12, 'cái'), price: Math.max(1000, Math.min(5e9, Math.round(Number(p.price) || 0))), supplier: clampStr(p.supplier, 80, 'Nhà cung cấp chính') }))
    .filter((p, i, all) => p.name && p.price > 1000 && all.findIndex((x) => x.name === p.name) === i)
    .slice(0, 12);
  const carriers = Array.isArray(r.carriers) ? r.carriers.map((s) => clampStr(s, 40)).filter(Boolean).slice(0, 3) : [];
  const prospects = (Array.isArray(r.prospects) ? r.prospects : []).map((p) => p as Record<string, unknown>).map((p) => ({ name: clampStr(p.name, 80), segment: segs.includes(String(p.segment)) ? String(p.segment) : segs[0] })).filter((p) => p.name).slice(0, 6);
  const qr = Array.isArray(r.qtyRange) ? r.qtyRange.map(Number) : [];
  const departments = Array.isArray(r.departments) ? r.departments.map((s) => clampStr(s, 40)).filter(Boolean).slice(0, 8) : [];
  // Segments of a repaired customer list must exist; fill short lists from the preset (re-segmented).
  const fill = <T,>(got: T[], min: number, from: T[]) => (got.length >= min ? got : [...got, ...from.slice(got.length)]);
  const baseCustomers = base.customers.map((c, i) => ({ ...c, segment: segs[i % segs.length] }));
  return {
    key: 'custom',
    label: clampStr(r.label, 80, base.label),
    segments: segs,
    customers: fill(customers, 8, baseCustomers),
    products: fill(products, 6, base.products),
    carriers: carriers.length === 3 ? carriers : base.carriers,
    prospects: prospects.length >= 2 ? prospects : base.prospects.map((p, i) => ({ ...p, segment: segs[i % segs.length] })),
    qtyRange: qr.length === 2 && qr[0] > 0 && qr[1] >= qr[0] && qr[1] < 1e6 ? [Math.round(qr[0]), Math.round(qr[1])] : base.qtyRange,
    departments: departments.length >= 6 ? departments : base.departments,
  };
}

export function normalizeExtraTables(raw: unknown): ExtraTableSpec[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set(CANONICAL_TABLES);
  const kinds = new Set(['id', 'text', 'person', 'customer', 'product', 'enum', 'integer', 'money', 'percent', 'date', 'email', 'phone', 'boolean']);
  const out: ExtraTableSpec[] = [];
  for (const t of raw.slice(0, 8)) {
    if (!t || typeof t !== 'object') continue;
    const r = t as Record<string, unknown>;
    let name = fold(clampStr(r.name, 40)).replace(/ /g, '_') || `bang_${out.length + 1}`;
    while (used.has(name)) name = `${name}_2`;
    used.add(name);
    const columns = (Array.isArray(r.columns) ? r.columns : []).slice(0, 25).map((c) => {
      const col = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
      const label = clampStr(col.label, 60) || clampStr(col.name, 60) || 'Cột';
      const guess = inferColumn(label);
      const kind = kinds.has(String(col.kind)) ? (col.kind as ExtraTableSpec['columns'][number]['kind']) : guess.kind;
      const values = Array.isArray(col.values) ? col.values.map((v) => clampStr(v, 40)).filter(Boolean).slice(0, 12) : undefined;
      return { name: fold(clampStr(col.name, 40) || label).replace(/ /g, '_') || guess.name, label, kind, ...(values?.length ? { values } : {}), ...(typeof col.min === 'number' ? { min: col.min } : {}), ...(typeof col.max === 'number' ? { max: col.max } : {}) };
    }).filter((c, i, all) => all.findIndex((x) => x.name === c.name) === i);
    if (columns.length < 2) continue;
    out.push({ name, description: clampStr(r.description, 200, 'Bảng theo cấu trúc của khách'), rows: Math.min(60, Math.max(5, Number(r.rows) || 20)), columns });
  }
  return out;
}

export async function proposeBlueprint(provider: Provider, input: BlueprintInput): Promise<DataBlueprint> {
  if (provider.isDemo) return heuristicBlueprint(input);
  const base = (input.presetKey && presetByKey(input.presetKey)) || matchPreset(`${input.industry} ${input.notes}`);
  const user = `Company (fictional name for the sandbox): ${input.company}
Industry: ${input.industry || '(not given)'}

Discovery-call notes:
"""
${input.notes.slice(0, 6000) || '(none)'}
"""

Table structures the prospect showed us (one per line; may be empty):
"""
${[input.headers, headersFromFiles(input.files)].filter(Boolean).join('\n').slice(0, 4000) || '(none)'}
"""
${(input.files ?? []).some((f) => f.mime.startsWith('image/') || f.mime === 'application/pdf') ? 'Attached screenshots/PDFs show their current software or templates: reproduce their tables and column labels in extraTables.' : ''}

For reference, a profile we use for a similar industry ("${base.label}"): ${JSON.stringify({ segments: base.segments, products: base.products.slice(0, 3), qtyRange: base.qtyRange })}`;
  try {
    const text = await provider.completeText(SYSTEM, user, 8000, input.files);
    const json = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')) as Record<string, unknown>;
    const profile = normalizeProfile(json.profile, base);
    const ids = Array.isArray(json.workflowIds) ? json.workflowIds.filter((id): id is string => typeof id === 'string' && CATALOG.some((w) => w.id === id)) : [];
    return {
      company: input.company,
      industry: input.industry || profile.label,
      asOf: input.asOf ?? new Date().toISOString().slice(0, 10),
      profile,
      extraTables: [...normalizeExtraTables(json.extraTables), ...parseHeaderBlocks(input.headers, CANONICAL_TABLES).filter(() => !Array.isArray(json.extraTables) || !(json.extraTables as unknown[]).length)],
      workflowIds: ids.length >= 4 ? [...new Set([...ids, 'data-chat'])].slice(0, 10) : suggestWorkflows(`${input.industry} ${input.notes}`),
      notes: Array.isArray(json.notes) ? json.notes.map((n) => clampStr(n, 300)).filter(Boolean).slice(0, 6) : [],
      source: 'ai',
    };
  } catch (err) {
    const why = err instanceof Error ? err.message : 'unknown error';
    return heuristicBlueprint(input, [`AI chưa đề xuất được (${why.slice(0, 120)}); đang dùng bộ mẫu theo ngành.`]);
  }
}
