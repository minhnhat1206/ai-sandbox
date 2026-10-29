/**
 * Shared helpers for the scripted demo agents (mock provider). Pure functions only.
 */
import type { Row } from '../../shared/engine/csv.ts';
import type { Lang } from '../../shared/types.ts';

export interface ScriptCtx {
  inputs: Record<string, string>;
  lang: Lang;
  attachmentText: string;
  say: (vi: string, en: string) => void;
  call: (tool: string, input: unknown) => Promise<{ ok: boolean; data: unknown; raw: string }>;
}

export type Script = (ctx: ScriptCtx) => Promise<string>;

export const T = (lang: Lang, vi: string, en: string) => (lang === 'vi' ? vi : en);
export const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));
export const rowsOf = (d: unknown): Row[] => (d && typeof d === 'object' && Array.isArray((d as { rows?: unknown }).rows) ? ((d as { rows: Row[] }).rows) : []);

/* ------------------------------------------------------------ html helpers */
export const CSS = `body{font-family:"Be Vietnam Pro",Inter,system-ui,sans-serif;margin:0;background:#f7f5f0;color:#1b1814;padding:24px}h1{font-size:22px;margin:0 0 4px;color:#0b2f27}p.sub{margin:0 0 20px;color:#7a7262;font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px}.kpi{background:#fff;border-radius:14px;padding:14px 16px;box-shadow:inset 0 0 0 1px rgba(27,24,20,.07)}.kpi .l{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7a7262;font-weight:600}.kpi .v{font-size:26px;font-weight:700;color:#0b2f27;margin-top:6px;font-variant-numeric:tabular-nums}.kpi .h{font-size:12px;color:#7a7262;margin-top:4px}.card{background:#fff;border-radius:14px;padding:16px;box-shadow:inset 0 0 0 1px rgba(27,24,20,.07);margin-bottom:16px}.card h2{font-size:15px;margin:0 0 10px;color:#0b2f27}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#4a4337;background:#f0ede6;padding:8px}td{padding:8px;border-top:1px solid #e7e3da;font-variant-numeric:tabular-nums}.bad{color:#9a3220;font-weight:600}.ok{color:#0c5a49;font-weight:600}.tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:#dcf1ea;color:#0c5a49}.tag.warn{background:#fbefd8;color:#8a5a0e}.tag.danger{background:#fde6e1;color:#9a3220}`;
export const html = (title: string, sub: string, body: string) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body><h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p>${body}</body></html>`;
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const kpi = (l: string, v: string, h = '') => `<div class="kpi"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div>${h ? `<div class="h">${esc(h)}</div>` : ''}</div>`;
export const tableHtml = (cols: string[], rows: Record<string, unknown>[]) => `<table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
export function svgBars(data: { label: string; value: number }[], width = 640, height = 220): string {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length || 1;
  const band = (width - 40) / n;
  const barW = Math.min(band * 0.6, 48);
  const plotH = height - 50;
  const bars = data.map((d, i) => {
    const h = Math.round((d.value / max) * plotH);
    const x = 30 + i * band + (band - barW) / 2;
    const y = 15 + plotH - h;
    return `<path d="M${x} ${15 + plotH} V${y + 4} a4 4 0 0 1 4 -4 h${barW - 8} a4 4 0 0 1 4 4 V${15 + plotH} Z" fill="#2e9a7c"/><text x="${x + barW / 2}" y="${15 + plotH + 16}" font-size="11" text-anchor="middle" fill="#4a4337">${esc(d.label)}</text><text x="${x + barW / 2}" y="${y - 6}" font-size="11" text-anchor="middle" fill="#1b1814" font-weight="600">${esc(compact(d.value))}</text>`;
  }).join('');
  const grid = [0.25, 0.5, 0.75, 1].map((p) => `<line x1="30" x2="${width - 10}" y1="${15 + plotH - plotH * p}" y2="${15 + plotH - plotH * p}" stroke="#e7e3da" stroke-width="1"/>`).join('');
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img">${grid}<line x1="30" x2="${width - 10}" y1="${15 + plotH}" y2="${15 + plotH}" stroke="#cfc9bc"/>${bars}</svg>`;
}
export const compact = (n: number) => (Math.abs(n) >= 1e9 ? `${(n / 1e9).toFixed(1)} tỷ` : Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(0)} tr` : fmt(n));


/** Days between two ISO dates (b - a). */
export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
/** Lower-case, strip Vietnamese diacritics and punctuation – for fuzzy matching names. */
export const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** The demo "today" – all sample data is dated relative to 28/10/2026. */
export const TODAY = '2026-10-28';
export const addDays = (iso: string, n: number) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
