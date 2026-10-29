import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Context } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { CATALOG } from '../shared/catalog/index.ts';
import { parseCsv } from '../shared/engine/csv.ts';
import { validateWorkflow } from '../shared/engine/validate.ts';
import { WORKFLOW_ICONS } from '../shared/icons.ts';
import { sampleInputs } from '../shared/engine/template.ts';
import type { AdminOverview, Artifact, ChatMessage, DataSource, Lang, Lead, LeadType, McpServer, Run, RunEvent, SandboxView, Workspace, WorkspaceStatus } from '../shared/types.ts';
import type { Config } from './config.ts';
import { nowIso, shortId, slugify } from './ids.ts';
import type { Provider } from './providers/types.ts';
import { ProviderError } from './providers/types.ts';
import { RunError, runChat, runWorkflow } from './runner.ts';
import type { Store } from './store.ts';
import type { UploadStore } from './uploads.ts';
import { resolveWorkflow, resolveWorkflows } from './workflows.ts';

export interface AppDeps {
  store: Store;
  provider: Provider;
  config: Config;
  uploads: UploadStore;
  /** Directory for provider-generated files (null = keep in memory only). */
  filesDir: string | null;
}

const MASK = '••••••••';
const fileBuffers = new Map<string, Buffer>();

type Env = { Variables: { workspace: Workspace } };

const LANGS = new Set<Lang>(['vi', 'en']);
const asLang = (v: unknown, fallback: Lang): Lang => (typeof v === 'string' && LANGS.has(v as Lang) ? (v as Lang) : fallback);
const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '');
const providerInfo = (p: Provider) => ({ name: p.name, model: p.model, isDemo: p.isDemo });

function publicView(ws: Workspace, provider: Provider): SandboxView {
  return {
    workspace: { id: ws.id, token: ws.token, company: ws.company, industry: ws.industry, language: ws.language, status: ws.status, brief: ws.brief, expiresAt: ws.expiresAt },
    workflows: resolveWorkflows(ws),
    knowledgeTitles: ws.knowledge.map((k) => k.title),
    dataSources: (ws.dataSources ?? []).map((d) => { const t = parseCsv(d.csv); return { id: d.id, name: d.name, description: d.description, rows: t.rows.length, columns: t.columns }; }),
    connectors: (ws.mcpServers ?? []).map((m) => m.name),
    creditsRemaining: Math.max(0, ws.credits.total - ws.credits.used),
    creditsTotal: ws.credits.total,
    provider: providerInfo(provider),
  };
}

function sanitizeInputs(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(k) && typeof v === 'string') out[k] = v.slice(0, 20000);
    }
  }
  return out;
}

export function createApp(deps: AppDeps): Hono {
  const { store, provider, config, uploads, filesDir } = deps;

  const saveFile = (run: Run, file: { filename: string; mime: string; bytes: Buffer }): Artifact => {
    const id = `art_${shortId(8)}`;
    const safe = path.basename(file.filename).replace(/[^\w.\-]+/g, '_').slice(0, 100) || 'file';
    if (filesDir) {
      const dir = path.join(filesDir, run.id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${id}_${safe}`), file.bytes);
    } else fileBuffers.set(id, file.bytes);
    return { id, kind: 'file', title: safe, filename: safe, mime: file.mime, size: file.bytes.length };
  };
  const app = new Hono();

  app.onError((err, c) => {
    console.error('[api]', err);
    return c.json({ error: 'Internal error' }, 500);
  });

  app.get('/api/health', (c) =>
    c.json({ ok: true, provider: providerInfo(provider), adminTokenIsDefault: config.adminTokenIsDefault, time: nowIso() }),
  );

  // =====================================================================
  // Public sandbox routes (no account needed; the invite token is the key)
  // =====================================================================
  const sandbox = new Hono<Env>();

  sandbox.use('/:token/*', async (c, next) => {
    const ws = store.getWorkspaceByToken(c.req.param('token'));
    if (!ws || ws.status === 'archived' || ws.status === 'draft') return c.json({ error: 'Sandbox not found', code: 'not_found' }, 404);
    if (ws.expiresAt && new Date(ws.expiresAt).getTime() < Date.now()) return c.json({ error: 'This sandbox has expired', code: 'expired' }, 410);
    c.set('workspace', ws);
    await next();
  });

  sandbox.get('/:token', (c) => {
    const ws = store.getWorkspaceByToken(c.req.param('token'));
    if (!ws || ws.status === 'archived' || ws.status === 'draft') return c.json({ error: 'Sandbox not found', code: 'not_found' }, 404);
    if (ws.expiresAt && new Date(ws.expiresAt).getTime() < Date.now()) return c.json({ error: 'This sandbox has expired', code: 'expired' }, 410);
    return c.json(publicView(ws, provider));
  });

  sandbox.get('/:token/workflows/:id', (c) => {
    const ws = c.get('workspace');
    const wf = resolveWorkflow(ws, c.req.param('id'));
    if (!wf) return c.json({ error: 'Workflow not found', code: 'not_found' }, 404);
    return c.json({ workflow: wf, sample: sampleInputs(wf) });
  });

  /** Shared streaming handler for runs and chat turns. */
  async function streamRun(c: Context<Env>, kind: 'form' | 'chat') {
    const ws = c.get('workspace');
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const wf = resolveWorkflow(ws, str(body.workflowId, 100));
    if (!wf) return c.json({ error: 'Workflow not found', code: 'not_found' }, 404);
    if (wf.kind !== kind) return c.json({ error: 'Wrong workflow kind', code: 'wrong_kind' }, 400);
    const remaining = ws.credits.total - ws.credits.used;
    if (remaining <= 0) return c.json({ error: 'No credits left in this sandbox', code: 'no_credits' }, 402);

    const lang = asLang(body.lang, ws.language);
    const sessionId = str(body.sessionId, 64) || `anon_${shortId(6)}`;
    const visitorName = str(body.visitorName, 120);
    const inputs = sanitizeInputs(body.inputs);
    const messages = Array.isArray(body.messages)
      ? (body.messages as unknown[]).filter((m): m is ChatMessage => !!m && typeof m === 'object' && typeof (m as ChatMessage).content === 'string' && ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant')).map((m) => ({ role: m.role, content: m.content.slice(0, 20000) }))
      : [];

    // Deduct one credit up front; refund on provider failure.
    ws.credits.used += 1;
    ws.updatedAt = nowIso();
    store.upsertWorkspace(ws);

    return streamSSE(c, async (stream) => {
      // If the prospect closes the tab mid-run we still finish and persist the
      // run (the credit is spent and the founder wants to see the output).
      let clientGone = false;
      const emit = async (e: RunEvent) => {
        if (clientGone) return;
        try {
          await stream.writeSSE({ event: e.type, data: JSON.stringify(e) });
        } catch {
          clientGone = true;
        }
      };
      stream.onAbort(() => { clientGone = true; });
      const persist = (run: Run) => store.upsertRun(run);
      const common = { creditsRemaining: ws.credits.total - ws.credits.used, onRunCreated: persist, getUpload: (id: string) => uploads.get(id), saveFile };
      try {
        const run = kind === 'form'
          ? await runWorkflow({ workspace: ws, workflow: wf, inputs, lang, sessionId, visitorName }, provider, emit, common)
          : await runChat({ workspace: ws, workflow: wf, messages, lang, sessionId, visitorName }, provider, emit, common);
        persist(run);
        await emit({ type: 'run.done', run, creditsRemaining: ws.credits.total - ws.credits.used });
      } catch (err) {
        ws.credits.used = Math.max(0, ws.credits.used - 1);
        store.upsertWorkspace(ws);
        const code = err instanceof RunError ? err.code : err instanceof ProviderError ? err.code : 'unknown';
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (!(err instanceof RunError) && !(err instanceof ProviderError)) console.error('[run]', err);
        await emit({ type: 'error', message, code });
      }
    });
  }

  sandbox.post('/:token/runs', (c) => streamRun(c, 'form'));
  sandbox.post('/:token/chat', (c) => streamRun(c, 'chat'));

  sandbox.get('/:token/runs', (c) => {
    const ws = c.get('workspace');
    const sessionId = c.req.query('sessionId') ?? '';
    if (!sessionId) return c.json({ runs: [] });
    return c.json({ runs: store.listRuns({ workspaceId: ws.id, sessionId }).slice(0, 50) });
  });

  sandbox.post('/:token/runs/:runId/feedback', async (c) => {
    const ws = c.get('workspace');
    const run = store.getRun(c.req.param('runId'));
    if (!run || run.workspaceId !== ws.id) return c.json({ error: 'Run not found' }, 404);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const rating = Number(body.rating);
    if ([1, 2, 3, 4, 5].includes(rating)) run.rating = rating as Run['rating'];
    if (typeof body.feedback === 'string') run.feedback = body.feedback.slice(0, 2000);
    store.upsertRun(run);
    return c.json({ ok: true });
  });

  sandbox.post('/:token/uploads', async (c) => {
    const body = await c.req.parseBody().catch(() => ({})) as Record<string, unknown>;
    const file = body.file;
    if (!(file instanceof File)) return c.json({ error: 'file field is required (multipart/form-data)' }, 400);
    try {
      const meta = await uploads.save(file.name, Buffer.from(await file.arrayBuffer()));
      return c.json({ upload: { ...meta, text: undefined, hasText: !!meta.text } });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Upload failed' }, 400);
    }
  });

  sandbox.get('/:token/runs/:runId/artifacts/:artifactId', (c) => {
    const ws = c.get('workspace');
    const run = store.getRun(c.req.param('runId'));
    if (!run || run.workspaceId !== ws.id) return c.json({ error: 'Run not found' }, 404);
    const art = run.artifacts.find((a) => a.id === c.req.param('artifactId'));
    if (!art) return c.json({ error: 'Artifact not found' }, 404);
    const download = c.req.query('download') !== undefined;
    if (art.kind === 'file') {
      let bytes = fileBuffers.get(art.id);
      if (!bytes && filesDir) {
        const p = path.join(filesDir, run.id, `${art.id}_${art.filename ?? 'file'}`);
        if (fs.existsSync(p)) bytes = fs.readFileSync(p);
      }
      if (!bytes) return c.json({ error: 'File no longer available' }, 410);
      return new Response(new Uint8Array(bytes), { headers: { 'content-type': art.mime ?? 'application/octet-stream', 'content-disposition': `attachment; filename="${encodeURIComponent(art.filename ?? 'file')}"` } });
    }
    const mime = art.kind === 'html' ? 'text/html; charset=utf-8' : art.kind === 'csv' || art.kind === 'table' ? 'text/csv; charset=utf-8' : art.kind === 'json' ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8';
    const ext = art.kind === 'html' ? 'html' : art.kind === 'csv' || art.kind === 'table' ? 'csv' : art.kind === 'json' ? 'json' : 'md';
    const name = `${(art.title || 'artifact').replace(/[^\w.\-]+/g, '_')}.${ext}`;
    const headers: Record<string, string> = { 'content-type': mime, 'x-content-type-options': 'nosniff' };
    if (art.kind === 'html') headers['content-security-policy'] = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";
    if (download || art.kind !== 'html') headers['content-disposition'] = `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(name)}"`;
    return new Response(art.content ?? '', { headers });
  });

  sandbox.post('/:token/leads', async (c) => {
    const ws = c.get('workspace');
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const type = str(body.type, 30) as LeadType;
    if (!['book_call', 'request_workflow', 'feedback'].includes(type)) return c.json({ error: 'Invalid lead type' }, 400);
    const lead: Lead = {
      id: `lead_${shortId()}`,
      workspaceId: ws.id,
      type,
      name: str(body.name, 120),
      email: str(body.email, 200),
      message: str(body.message, 4000),
      sessionId: str(body.sessionId, 64),
      createdAt: nowIso(),
    };
    if (!lead.message && !lead.email) return c.json({ error: 'Please leave a message or an email' }, 400);
    store.addLead(lead);
    return c.json({ ok: true, lead });
  });

  app.route('/api/sandbox', sandbox);

  // =====================================================================
  // Admin console (founder only)
  // =====================================================================
  const admin = new Hono();

  admin.use('*', async (c, next) => {
    const auth = c.req.header('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token || token !== config.adminToken) return c.json({ error: 'Unauthorized', code: 'unauthorized' }, 401);
    await next();
  });

  admin.post('/login', (c) => c.json({ ok: true, adminTokenIsDefault: config.adminTokenIsDefault }));

  admin.get('/overview', (c) => {
    const workspaces = store.listWorkspaces();
    const runs = store.listRuns();
    const leads = store.listLeads();
    const rated = runs.filter((r) => r.rating);
    const overview: AdminOverview = {
      workspaces: workspaces.length,
      activeWorkspaces: workspaces.filter((w) => w.status === 'active').length,
      runs: runs.length,
      leads: leads.length,
      hoursSaved: Math.round((runs.filter((r) => r.status === 'done').reduce((n, r) => n + r.minutesSaved, 0) / 60) * 10) / 10,
      avgRating: rated.length ? Math.round((rated.reduce((n, r) => n + (r.rating ?? 0), 0) / rated.length) * 10) / 10 : null,
      creditsUsed: workspaces.reduce((n, w) => n + w.credits.used, 0),
      costUsd: Math.round(runs.reduce((n, r) => n + r.costUsd, 0) * 10000) / 10000,
      provider: providerInfo(provider),
      recentRuns: runs.slice(0, 8),
      recentLeads: leads.slice(0, 8),
    };
    return c.json(overview);
  });

  admin.get('/catalog', (c) => c.json({ workflows: CATALOG }));

  admin.get('/workspaces', (c) => {
    const list = store.listWorkspaces().map((w) => ({
      ...adminView(w),
      stats: {
        runs: store.listRuns({ workspaceId: w.id }).length,
        leads: store.listLeads(w.id).length,
      },
    }));
    return c.json({ workspaces: list });
  });

  admin.post('/workspaces', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const company = str(body.company, 120).trim();
    if (!company) return c.json({ error: 'company is required' }, 400);
    let token = slugify(str(body.token, 64) || company);
    while (store.getWorkspaceByToken(token)) token = `${slugify(company)}-${shortId(4)}`;
    const ts = nowIso();
    const ws: Workspace = {
      id: `ws_${shortId()}`,
      token,
      company,
      industry: str(body.industry, 200),
      contactName: str(body.contactName, 120),
      contactEmail: str(body.contactEmail, 200),
      language: asLang(body.language, 'vi'),
      brief: str(body.brief, 4000),
      workflowIds: Array.isArray(body.workflowIds) ? (body.workflowIds as unknown[]).filter((id): id is string => typeof id === 'string' && !!CATALOG.find((w) => w.id === id)) : ['company-assistant', 'customer-reply', 'weekly-report'],
      overrides: {},
      customWorkflows: [],
      knowledge: [],
      dataSources: [],
      mcpServers: [],
      credits: { total: Math.min(10000, Math.max(1, Number(body.credits) || 50)), used: 0 },
      status: (['draft', 'active'].includes(str(body.status)) ? str(body.status) : 'active') as WorkspaceStatus,
      notes: str(body.notes, 4000),
      createdAt: ts,
      updatedAt: ts,
    };
    store.upsertWorkspace(ws);
    return c.json({ workspace: ws }, 201);
  });

  const adminView = (ws: Workspace) => ({ ...ws, mcpServers: (ws.mcpServers ?? []).map((m) => ({ ...m, authToken: m.authToken ? MASK : '' })) });

  admin.get('/workspaces/:id', (c) => {
    const ws = store.getWorkspace(c.req.param('id'));
    if (!ws) return c.json({ error: 'Not found' }, 404);
    return c.json({ workspace: adminView(ws), resolved: resolveWorkflows(ws) });
  });

  admin.put('/workspaces/:id', async (c) => {
    const ws = store.getWorkspace(c.req.param('id'));
    if (!ws) return c.json({ error: 'Not found' }, 404);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.company === 'string' && body.company.trim()) ws.company = body.company.trim().slice(0, 120);
    if (typeof body.industry === 'string') ws.industry = body.industry.slice(0, 200);
    if (typeof body.contactName === 'string') ws.contactName = body.contactName.slice(0, 120);
    if (typeof body.contactEmail === 'string') ws.contactEmail = body.contactEmail.slice(0, 200);
    if (typeof body.brief === 'string') ws.brief = body.brief.slice(0, 4000);
    if (typeof body.notes === 'string') ws.notes = body.notes.slice(0, 4000);
    if (body.language !== undefined) ws.language = asLang(body.language, ws.language);
    if (typeof body.status === 'string' && ['draft', 'active', 'converted', 'archived'].includes(body.status)) ws.status = body.status as WorkspaceStatus;
    if (typeof body.token === 'string' && body.token.trim()) {
      const t = slugify(body.token);
      const clash = store.getWorkspaceByToken(t);
      if (clash && clash.id !== ws.id) return c.json({ error: 'Token already used by another sandbox' }, 409);
      ws.token = t;
    }
    if (Array.isArray(body.workflowIds)) ws.workflowIds = (body.workflowIds as unknown[]).filter((id): id is string => typeof id === 'string' && !!CATALOG.find((w) => w.id === id));
    if (body.overrides && typeof body.overrides === 'object') ws.overrides = body.overrides as Workspace['overrides'];
    if (Array.isArray(body.customWorkflows)) {
      const problems = (body.customWorkflows as unknown[]).flatMap(validateWorkflow);
      if (problems.length) return c.json({ error: 'Invalid custom workflow', problems }, 400);
      ws.customWorkflows = body.customWorkflows as Workspace['customWorkflows'];
    }
    if (Array.isArray(body.knowledge)) {
      ws.knowledge = (body.knowledge as unknown[])
        .filter((k): k is { id?: string; title: string; content: string } => !!k && typeof k === 'object' && typeof (k as { title?: unknown }).title === 'string' && typeof (k as { content?: unknown }).content === 'string')
        .map((k) => ({ id: k.id && typeof k.id === 'string' ? k.id : `kd_${shortId(6)}`, title: k.title.slice(0, 200), content: k.content.slice(0, 60000), updatedAt: nowIso() }));
    }
    if (Array.isArray(body.dataSources)) {
      const list: DataSource[] = [];
      const names = new Set<string>();
      for (const raw of body.dataSources as unknown[]) {
        if (!raw || typeof raw !== 'object') continue;
        const d = raw as Partial<DataSource>;
        const name = str(d.name, 60).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
        const csv = str(d.csv, 2_000_000);
        if (!name || !csv.trim() || names.has(name)) continue;
        const parsed = parseCsv(csv);
        if (!parsed.columns.length || !parsed.rows.length) return c.json({ error: `Data source "${name}" has no rows (needs a header row and at least one data row)` }, 400);
        names.add(name);
        list.push({ id: typeof d.id === 'string' && d.id ? d.id : `ds_${shortId(6)}`, name, description: str(d.description, 300), csv, updatedAt: nowIso() });
      }
      ws.dataSources = list;
    }
    if (Array.isArray(body.mcpServers)) {
      const list: McpServer[] = [];
      for (const raw of body.mcpServers as unknown[]) {
        if (!raw || typeof raw !== 'object') continue;
        const m = raw as Partial<McpServer>;
        const name = str(m.name, 40).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
        const url = str(m.url, 500).trim();
        if (!name || !/^https:\/\//.test(url)) continue;
        const existing = (ws.mcpServers ?? []).find((x) => x.id === m.id);
        const token = m.authToken === MASK ? existing?.authToken : str(m.authToken, 2000) || undefined;
        list.push({ id: typeof m.id === 'string' && m.id ? m.id : `mcp_${shortId(6)}`, name, url, ...(token ? { authToken: token } : {}) });
      }
      ws.mcpServers = list;
    }
    if (body.credits && typeof body.credits === 'object') {
      const cr = body.credits as { total?: unknown; used?: unknown };
      if (typeof cr.total === 'number') ws.credits.total = Math.min(10000, Math.max(0, Math.floor(cr.total)));
      if (typeof cr.used === 'number') ws.credits.used = Math.max(0, Math.floor(cr.used));
    }
    if (body.expiresAt === null) delete ws.expiresAt;
    else if (typeof body.expiresAt === 'string' && !Number.isNaN(Date.parse(body.expiresAt))) ws.expiresAt = new Date(body.expiresAt).toISOString();
    ws.updatedAt = nowIso();
    store.upsertWorkspace(ws);
    return c.json({ workspace: adminView(ws), resolved: resolveWorkflows(ws) });
  });

  admin.delete('/workspaces/:id', (c) => {
    const ok = store.deleteWorkspace(c.req.param('id'));
    return ok ? c.json({ ok: true }) : c.json({ error: 'Not found' }, 404);
  });

  admin.get('/workspaces/:id/runs', (c) => c.json({ runs: store.listRuns({ workspaceId: c.req.param('id') }).slice(0, 200) }));
  admin.get('/workspaces/:id/leads', (c) => c.json({ leads: store.listLeads(c.req.param('id')) }));

  /** "Build me a workflow": the founder's agent drafts a definition from a prospect brief. */
  admin.post('/ai/draft-workflow', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const brief = str(body.brief, 4000).trim();
    if (!brief) return c.json({ error: 'brief is required' }, 400);
    const lang = asLang(body.lang, 'vi');
    const system = `You design AI workflow definitions for a no-account trial platform. Return ONLY a JSON object (no prose, no code fences) matching this TypeScript type:
WorkflowDef { id: kebab-case string starting with "custom-"; version: 1; kind: "form"; category: "operations"|"sales"|"marketing"|"finance"|"hr"|"customer-service"|"general"; icon: one of ${WORKFLOW_ICONS.join('|')}; name/tagline/description: {vi, en}; tags: string[]; minutesSavedPerRun: number; useKnowledge: boolean; inputs: {key, label:{vi,en}, type:"text"|"textarea"|"select"|"number", required?, rows?, sample: string, options?: {value,label:{vi,en}}[]}[]; steps: {id, title:{vi,en}, system, prompt, agent?: {tools: ("query_records"|"aggregate_records"|"search_knowledge"|"create_ticket"|"draft_email"|"calculate"|"create_artifact"|"web_search")[], maxTurns?: number}}[] }
Rules: 1-3 inputs with realistic Vietnamese sample values; 1-2 steps; when the task needs company data, actions or deliverables, make the step an agent (tools: query_records/aggregate_records for connected tables, search_knowledge for documents, create_ticket/draft_email for actions, create_artifact for dashboards/tables, calculate for math) and include "{{sources}}" in its system prompt; prompts use {{input.key}}, later steps may use {{steps.id}}; include "{{company}}" and "Write in {{language}}" in system prompts; if useKnowledge is true include "{{knowledge}}" in a system prompt. The prospect's primary language is ${lang === 'vi' ? 'Vietnamese' : 'English'}.`;
    try {
      const raw = await provider.completeText(system, `Prospect brief:\n${brief}`);
      const jsonText = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        return c.json({ error: 'The model did not return valid JSON', raw }, 502);
      }
      const problems = validateWorkflow(parsed);
      return c.json({ workflow: parsed, problems });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Provider error';
      return c.json({ error: message }, 502);
    }
  });

  app.route('/api/admin', admin);

  app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));
  return app;
}
