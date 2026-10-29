import { aggregateRows, parseCsv, queryRows, toCsv, type Condition, type Metric, type Table } from '../../shared/engine/csv.ts';
import type { Action, Artifact, Lang, ToolName, Workspace } from '../../shared/types.ts';
import { nowIso, shortId } from '../ids.ts';

/** JSON schema subset accepted by the Messages API. */
export interface ToolDefinition {
  name: ToolName;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };
}

export interface ToolContext {
  workspace: Workspace;
  lang: Lang;
  tables: Map<string, Table>;
  onArtifact: (a: Artifact) => void;
  onAction: (a: Action) => void;
}

export interface ToolExecution {
  output: string;
  isError?: boolean;
}

/** Lower-case and strip Vietnamese diacritics for matching. */
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();

const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');

export const TOOL_DEFINITIONS: Record<ToolName, ToolDefinition> = {
  query_records: {
    name: 'query_records',
    description: 'Query rows from one of the connected data sources (CSV tables listed in the system prompt). Use `where` for exact/numeric filters, `search` for free text. Returns at most `limit` rows (default 20, max 50).',
    input_schema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Data source name exactly as listed' },
        where: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, op: { type: 'string', enum: ['eq', 'neq', 'contains', 'gt', 'gte', 'lt', 'lte', 'in'] }, value: {} }, required: ['field', 'op', 'value'] } },
        search: { type: 'string' },
        sort: { type: 'object', properties: { field: { type: 'string' }, dir: { type: 'string', enum: ['asc', 'desc'] } }, required: ['field'] },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
        fields: { type: 'array', items: { type: 'string' } },
      },
      required: ['source'],
      additionalProperties: false,
    },
  },
  aggregate_records: {
    name: 'aggregate_records',
    description: 'Group and aggregate a connected data source (sum/avg/count/min/max), optionally filtered. Use this instead of mental arithmetic over many rows.',
    input_schema: {
      type: 'object',
      properties: {
        source: { type: 'string' },
        groupBy: { type: 'string' },
        metrics: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, fn: { type: 'string', enum: ['sum', 'avg', 'count', 'min', 'max'] }, as: { type: 'string' } }, required: ['fn'] } },
        where: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, op: { type: 'string', enum: ['eq', 'neq', 'contains', 'gt', 'gte', 'lt', 'lte', 'in'] }, value: {} }, required: ['field', 'op', 'value'] } },
        sort: { type: 'object', properties: { field: { type: 'string' }, dir: { type: 'string', enum: ['asc', 'desc'] } }, required: ['field'] },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      required: ['source', 'metrics'],
      additionalProperties: false,
    },
  },
  search_knowledge: {
    name: 'search_knowledge',
    description: "Search the company's internal documents (policies, procedures, FAQs). Returns the most relevant passages with the document title. Quote them; never invent policy.",
    input_schema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 8 } }, required: ['query'], additionalProperties: false },
  },
  create_ticket: {
    name: 'create_ticket',
    description: 'Create a support/ops ticket in the helpdesk for a human to follow up. Use when a case needs action beyond a reply (refund, re-delivery, escalation).',
    input_schema: {
      type: 'object',
      properties: { customer: { type: 'string' }, subject: { type: 'string' }, priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] }, summary: { type: 'string' }, assignee: { type: 'string' }, dueDate: { type: 'string' } },
      required: ['subject', 'priority', 'summary'],
      additionalProperties: false,
    },
  },
  draft_email: {
    name: 'draft_email',
    description: 'Save an email draft in the outbox for a human to review and send. Nothing is sent automatically.',
    input_schema: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, cc: { type: 'string' } }, required: ['to', 'subject', 'body'], additionalProperties: false },
  },
  calculate: {
    name: 'calculate',
    description: 'Evaluate an arithmetic expression exactly (numbers, + - * / % ( ) and the functions round, min, max, abs). Use for any money or percentage math.',
    input_schema: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'], additionalProperties: false },
  },
  create_artifact: {
    name: 'create_artifact',
    description: 'Publish a deliverable the user can open or download: an HTML dashboard/report (self-contained, inline CSS, may include inline SVG charts), a table (columns + rows), a markdown document, or a CSV. Call it once per deliverable, after the analysis is done.',
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['html', 'table', 'markdown', 'csv', 'json'] },
        title: { type: 'string' },
        content: { type: 'string', description: 'For html/markdown/csv/json' },
        columns: { type: 'array', items: { type: 'string' }, description: 'For table' },
        rows: { type: 'array', items: { type: 'object' }, description: 'For table: objects keyed by column' },
      },
      required: ['kind', 'title'],
      additionalProperties: false,
    },
  },
  web_search: {
    name: 'web_search',
    description: 'Search the public web (news, company websites, regulations). In demo mode returns a placeholder; with the real provider this is replaced by the Anthropic web_search server tool.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
  },
};

export function buildTables(ws: Workspace): Map<string, Table> {
  const m = new Map<string, Table>();
  for (const ds of ws.dataSources ?? []) m.set(ds.name, parseCsv(ds.csv));
  return m;
}

function findTable(ctx: ToolContext, name: string): Table | undefined {
  if (ctx.tables.has(name)) return ctx.tables.get(name);
  const lower = name.toLowerCase();
  for (const [k, v] of ctx.tables) if (k.toLowerCase() === lower || k.toLowerCase().includes(lower)) return v;
  return undefined;
}

function safeConditions(v: unknown): Condition[] {
  if (!Array.isArray(v)) return [];
  return v.filter((c): c is Condition => !!c && typeof c === 'object' && typeof (c as Condition).field === 'string' && typeof (c as Condition).op === 'string').slice(0, 10);
}

function safeCalc(expr: string): number {
  const cleaned = expr.replace(/\s+/g, '').replace(/,/g, '');
  if (!/^[\d.+\-*/%()a-z]+$/i.test(cleaned)) throw new Error('Only numbers, operators and round/min/max/abs are allowed');
  const allowed = cleaned.replace(/\b(round|min|max|abs)\b/g, '');
  if (/[a-z]/i.test(allowed)) throw new Error('Unknown identifier in expression');
  const fn = new Function('round', 'min', 'max', 'abs', `"use strict"; return (${cleaned});`) as (r: typeof Math.round, mi: typeof Math.min, ma: typeof Math.max, ab: typeof Math.abs) => number;
  const out = fn(Math.round, Math.min, Math.max, Math.abs);
  if (typeof out !== 'number' || !Number.isFinite(out)) throw new Error('Expression did not produce a number');
  return out;
}

export async function executeTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolExecution> {
  const inp = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  try {
    switch (name as ToolName) {
      case 'query_records': {
        const table = findTable(ctx, str(inp.source, 100));
        if (!table) return { output: `Unknown data source "${str(inp.source, 100)}". Available: ${[...ctx.tables.keys()].join(', ') || 'none'}`, isError: true };
        const rows = queryRows(table, {
          where: safeConditions(inp.where),
          search: str(inp.search, 200) || undefined,
          sort: inp.sort && typeof inp.sort === 'object' ? (inp.sort as { field: string; dir?: 'asc' | 'desc' }) : undefined,
          limit: typeof inp.limit === 'number' ? inp.limit : 20,
          fields: Array.isArray(inp.fields) ? (inp.fields as string[]) : undefined,
        });
        return { output: JSON.stringify({ count: rows.length, rows }) };
      }
      case 'aggregate_records': {
        const table = findTable(ctx, str(inp.source, 100));
        if (!table) return { output: `Unknown data source "${str(inp.source, 100)}". Available: ${[...ctx.tables.keys()].join(', ') || 'none'}`, isError: true };
        const metrics = Array.isArray(inp.metrics) ? (inp.metrics as Metric[]).filter((m) => m && typeof m.fn === 'string').slice(0, 8) : [];
        if (!metrics.length) return { output: 'metrics is required', isError: true };
        const rows = aggregateRows(table, {
          groupBy: str(inp.groupBy, 100) || undefined,
          metrics,
          where: safeConditions(inp.where),
          sort: inp.sort && typeof inp.sort === 'object' ? (inp.sort as { field: string; dir?: 'asc' | 'desc' }) : undefined,
          limit: typeof inp.limit === 'number' ? inp.limit : 50,
        });
        return { output: JSON.stringify({ count: rows.length, rows }) };
      }
      case 'search_knowledge': {
        // Accent-insensitive so "nghi phep" finds "nghỉ phép" (staff often type without diacritics).
        const q = fold(str(inp.query, 200));
        const terms = q.split(/\s+/).filter((t) => t.length > 1);
        const hits: { title: string; passage: string; score: number }[] = [];
        for (const doc of ctx.workspace.knowledge) {
          const passages = doc.content.split(/\n{2,}|\n(?=[-•*\d])/).map((p) => p.trim()).filter(Boolean);
          for (const p of passages) {
            const lower = ` ${fold(p)} `;
            const score = terms.reduce((n, t) => n + (lower.includes(` ${t}`) ? 1 : 0), 0) + (q && lower.includes(q) ? 3 : 0) + (fold(doc.title).includes(q) ? 1 : 0);
            if (score > 0) hits.push({ title: doc.title, passage: p.slice(0, 600), score });
          }
        }
        hits.sort((a, b) => b.score - a.score);
        const limit = typeof inp.limit === 'number' ? Math.min(8, inp.limit) : 4;
        const top = hits.slice(0, limit).map(({ title, passage }) => ({ title, passage }));
        return { output: JSON.stringify({ count: top.length, results: top, note: top.length ? undefined : 'No matching passage in the company documents.' }) };
      }
      case 'create_ticket': {
        const action: Action = {
          id: `TK-${shortId(5).toUpperCase()}`,
          type: 'ticket',
          summary: `[${str(inp.priority, 10) || 'normal'}] ${str(inp.subject, 200)}`,
          payload: { customer: str(inp.customer, 200), subject: str(inp.subject, 200), priority: str(inp.priority, 10) || 'normal', summary: str(inp.summary, 2000), assignee: str(inp.assignee, 100), dueDate: str(inp.dueDate, 40) },
          createdAt: nowIso(),
        };
        ctx.onAction(action);
        return { output: JSON.stringify({ ok: true, ticketId: action.id, status: 'open', note: 'Simulated helpdesk: the ticket is recorded in the sandbox outbox for a human to review.' }) };
      }
      case 'draft_email': {
        const action: Action = {
          id: `EM-${shortId(5).toUpperCase()}`,
          type: 'email',
          summary: `${str(inp.to, 200)} — ${str(inp.subject, 200)}`,
          payload: { to: str(inp.to, 200), cc: str(inp.cc, 200), subject: str(inp.subject, 200), body: str(inp.body, 8000) },
          createdAt: nowIso(),
        };
        ctx.onAction(action);
        return { output: JSON.stringify({ ok: true, draftId: action.id, status: 'draft', note: 'Saved to the outbox. Nothing is sent without a human.' }) };
      }
      case 'calculate': {
        const value = safeCalc(str(inp.expression, 300));
        return { output: JSON.stringify({ expression: str(inp.expression, 300), value }) };
      }
      case 'create_artifact': {
        const kind = str(inp.kind, 20) as Artifact['kind'];
        if (!['html', 'table', 'markdown', 'csv', 'json'].includes(kind)) return { output: 'kind must be html|table|markdown|csv|json', isError: true };
        const artifact: Artifact = { id: `art_${shortId(8)}`, kind, title: str(inp.title, 200) || 'Untitled' };
        if (kind === 'table') {
          const rows = Array.isArray(inp.rows) ? (inp.rows as Record<string, unknown>[]).slice(0, 500) : [];
          const columns = Array.isArray(inp.columns) && inp.columns.length ? (inp.columns as string[]).map(String) : Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
          artifact.columns = columns;
          artifact.rows = rows.map((r) => Object.fromEntries(columns.map((c) => [c, normalizeCell(r[c])])));
          artifact.content = toCsv(columns, artifact.rows);
        } else {
          artifact.content = str(inp.content, 400_000);
          if (!artifact.content) return { output: 'content is required for this kind', isError: true };
        }
        ctx.onArtifact(artifact);
        return { output: JSON.stringify({ ok: true, artifactId: artifact.id, note: 'Published. Refer to it by title in your final answer; do not repeat its full content.' }) };
      }
      case 'web_search': {
        return { output: JSON.stringify({ note: 'Demo mode: live web search is available when the sandbox runs on the real provider. Proceed using connected data and company documents, and say that web facts were not checked.', results: [] }) };
      }
      default:
        return { output: `Unknown tool ${name}`, isError: true };
    }
  } catch (err) {
    return { output: err instanceof Error ? err.message : String(err), isError: true };
  }
}

function normalizeCell(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.slice(0, 2000);
  return JSON.stringify(v).slice(0, 2000);
}

/** The data-source catalogue injected into agent system prompts. */
export function describeSources(ctx: Pick<ToolContext, 'tables' | 'workspace'>): string {
  if (!ctx.tables.size) return '(no connected data sources)';
  const { describeTable } = csvHelpers;
  return [...ctx.tables.entries()].map(([name, t]) => {
    const ds = ctx.workspace.dataSources.find((d) => d.name === name);
    return `- "${name}" (${t.rows.length} rows)${ds?.description ? `: ${ds.description}` : ''}\n  columns: ${describeTable(t)}`;
  }).join('\n');
}

import * as csvHelpers from '../../shared/engine/csv.ts';
