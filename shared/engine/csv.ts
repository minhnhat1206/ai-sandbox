/**
 * Small CSV engine shared by the server tools and the admin preview.
 * Handles quoted fields, commas/semicolons/tabs, CRLF, Vietnamese number formats.
 */

export type Row = Record<string, string>;

export interface Table {
  columns: string[];
  rows: Row[];
}

export function detectDelimiter(text: string): string {
  const head = text.split(/\r?\n/).slice(0, 5).join('\n');
  const counts = [',', ';', '\t', '|'].map((d) => ({ d, n: (head.match(new RegExp(`\\${d}`, 'g')) ?? []).length }));
  return counts.sort((a, b) => b.n - a.n)[0].n > 0 ? counts.sort((a, b) => b.n - a.n)[0].d : ',';
}

export function parseCsv(text: string): Table {
  const src = text.replace(/^﻿/, '');
  const delim = detectDelimiter(src);
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      record.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.some((f) => f.trim() !== '')) records.push(record);
      record = [];
    } else field += ch;
  }
  record.push(field);
  if (record.some((f) => f.trim() !== '')) records.push(record);
  if (!records.length) return { columns: [], rows: [] };
  const columns = records[0].map((c) => c.trim());
  const rows = records.slice(1).map((r) => Object.fromEntries(columns.map((c, i) => [c, (r[i] ?? '').trim()])));
  return { columns, rows };
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n');
}

/** "1.250.000" -> 1250000, "2,5%" -> 2.5, "25,350.00" -> 25350 */
export function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/[^\d.,-]/g, '');
  if (!s || s === '-' ) return null;
  let n: number;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) n = Number(s.replace(/\./g, '').replace(',', '.'));
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) n = Number(s.replace(/,/g, ''));
  else if (/^-?\d+,\d+$/.test(s)) n = Number(s.replace(',', '.'));
  else n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export type Op = 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
export interface Condition { field: string; op: Op; value: string | number | (string | number)[] }

function matches(row: Row, c: Condition): boolean {
  const raw = row[c.field] ?? '';
  const num = toNumber(raw);
  const target = Array.isArray(c.value) ? c.value : [c.value];
  const str = String(raw).toLowerCase();
  switch (c.op) {
    case 'eq': return target.some((t) => String(t).toLowerCase() === str || (num !== null && toNumber(t) === num));
    case 'neq': return !target.some((t) => String(t).toLowerCase() === str);
    case 'in': return target.some((t) => String(t).toLowerCase() === str);
    case 'contains': return target.some((t) => str.includes(String(t).toLowerCase()));
    case 'gt': case 'gte': case 'lt': case 'lte': {
      const t = toNumber(target[0]);
      // Date-like strings compare lexically when ISO (yyyy-mm-dd); numbers numerically.
      if (num === null || t === null) {
        const a = String(raw), b = String(target[0]);
        return c.op === 'gt' ? a > b : c.op === 'gte' ? a >= b : c.op === 'lt' ? a < b : a <= b;
      }
      return c.op === 'gt' ? num > t : c.op === 'gte' ? num >= t : c.op === 'lt' ? num < t : num <= t;
    }
    default: return false;
  }
}

export function queryRows(table: Table, opts: { where?: Condition[]; search?: string; sort?: { field: string; dir?: 'asc' | 'desc' }; limit?: number; fields?: string[] }): Row[] {
  let rows = table.rows;
  if (opts.where?.length) rows = rows.filter((r) => opts.where!.every((c) => matches(r, c)));
  if (opts.search) {
    const q = opts.search.toLowerCase();
    rows = rows.filter((r) => Object.values(r).some((v) => v.toLowerCase().includes(q)));
  }
  if (opts.sort?.field) {
    const { field, dir = 'asc' } = opts.sort;
    rows = [...rows].sort((a, b) => {
      const na = toNumber(a[field]), nb = toNumber(b[field]);
      const cmp = na !== null && nb !== null ? na - nb : String(a[field] ?? '').localeCompare(String(b[field] ?? ''));
      return dir === 'desc' ? -cmp : cmp;
    });
  }
  const limited = rows.slice(0, Math.min(opts.limit ?? 50, 200));
  if (opts.fields?.length) return limited.map((r) => Object.fromEntries(opts.fields!.filter((f) => f in r).map((f) => [f, r[f]])));
  return limited;
}

export type AggFn = 'sum' | 'avg' | 'count' | 'min' | 'max';
export interface Metric { field?: string; fn: AggFn; as?: string }

export function aggregateRows(table: Table, opts: { groupBy?: string; metrics: Metric[]; where?: Condition[]; sort?: { field: string; dir?: 'asc' | 'desc' }; limit?: number }): Record<string, string | number>[] {
  let rows = table.rows;
  if (opts.where?.length) rows = rows.filter((r) => opts.where!.every((c) => matches(r, c)));
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = opts.groupBy ? r[opts.groupBy] ?? '' : '*';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const out: Record<string, string | number>[] = [];
  for (const [key, grp] of groups) {
    const rec: Record<string, string | number> = {};
    if (opts.groupBy) rec[opts.groupBy] = key;
    for (const m of opts.metrics) {
      const name = m.as ?? (m.fn === 'count' ? 'count' : `${m.fn}_${m.field}`);
      if (m.fn === 'count') { rec[name] = grp.length; continue; }
      const nums = grp.map((r) => toNumber(r[m.field ?? ''])).filter((n): n is number => n !== null);
      if (!nums.length) { rec[name] = 0; continue; }
      const sum = nums.reduce((a, b) => a + b, 0);
      rec[name] = m.fn === 'sum' ? sum : m.fn === 'avg' ? Math.round((sum / nums.length) * 100) / 100 : m.fn === 'min' ? Math.min(...nums) : Math.max(...nums);
    }
    out.push(rec);
  }
  let result = out;
  if (opts.sort?.field) {
    const { field, dir = 'desc' } = opts.sort;
    result = [...result].sort((a, b) => {
      const na = toNumber(a[field]), nb = toNumber(b[field]);
      const cmp = na !== null && nb !== null ? na - nb : String(a[field]).localeCompare(String(b[field]));
      return dir === 'desc' ? -cmp : cmp;
    });
  }
  return result.slice(0, Math.min(opts.limit ?? 50, 200));
}

/** Column summary used in the agent's system prompt so it knows what it can query. */
export function describeTable(t: Table): string {
  return t.columns.map((c) => {
    const sample = t.rows.slice(0, 3).map((r) => r[c]).filter(Boolean).join(' | ');
    return `${c} (e.g. ${sample || 'empty'})`;
  }).join('; ');
}
