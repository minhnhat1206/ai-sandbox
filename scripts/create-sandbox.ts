/**
 * Create a prospect sandbox from a JSON payload (see .claude/skills/new-sandbox).
 *   npx tsx scripts/create-sandbox.ts payload.json
 * Uses the admin API when the dev server is running (avoids clobbering its in-memory
 * state), otherwise writes to the JSON store directly.
 */
import fs from 'node:fs';
import { loadDotEnv, readConfig } from '../server/config.ts';
import { newInviteToken } from '../server/app.ts';
import { applyGeneratedData, heuristicBlueprint } from '../server/datagen/index.ts';
import { nowIso, shortId, slugify } from '../server/ids.ts';
import { Store } from '../server/store.ts';
import { CATALOG } from '../shared/catalog/index.ts';
import { validateWorkflow } from '../shared/engine/validate.ts';
import type { Workspace } from '../shared/types.ts';

const file = process.argv[2];
if (!file) {
  console.error('usage: npx tsx scripts/create-sandbox.ts payload.json');
  process.exit(1);
}
loadDotEnv();
const cfg = readConfig();
const payload = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
if (typeof payload.company !== 'string' || !payload.company.trim()) {
  console.error('payload.company is required');
  process.exit(1);
}
const problems = Array.isArray(payload.customWorkflows) ? payload.customWorkflows.flatMap(validateWorkflow) : [];
if (problems.length) {
  console.error('customWorkflows invalid:\n - ' + problems.join('\n - '));
  process.exit(1);
}
const unknown = Array.isArray(payload.workflowIds) ? (payload.workflowIds as string[]).filter((id) => !CATALOG.some((w) => w.id === id)) : [];
if (unknown.length) {
  console.error(`unknown workflowIds: ${unknown.join(', ')}. Known: ${CATALOG.map((w) => w.id).join(', ')}`);
  process.exit(1);
}

/**
 * "generateData": { "industry"?, "notes"?, "headers"?, "presetKey"? } fills the sandbox with
 * synthetic tables, documents and samples (same generator as the admin data studio). Tables and
 * documents given explicitly in the payload win over generated ones with the same name.
 */
const gen = payload.generateData && typeof payload.generateData === 'object' ? (payload.generateData as Record<string, string>) : null;
const blueprint = gen ? heuristicBlueprint({ company: payload.company as string, industry: gen.industry ?? String(payload.industry ?? ''), notes: gen.notes ?? String(payload.brief ?? ''), headers: gen.headers ?? '', presetKey: gen.presetKey }) : null;

const base = `http://localhost:${cfg.port}`;
const headers = { 'content-type': 'application/json', authorization: `Bearer ${cfg.adminToken}` };

async function viaApi(): Promise<Workspace | null> {
  try {
    const health = await fetch(`${base}/api/health`);
    if (!health.ok) return null;
  } catch {
    return null;
  }
  const created = await fetch(`${base}/api/admin/workspaces`, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!created.ok) throw new Error(`create failed: ${created.status} ${await created.text()}`);
  const { workspace } = (await created.json()) as { workspace: Workspace };
  if (blueprint) {
    const applied = await fetch(`${base}/api/admin/workspaces/${workspace.id}/datagen/apply`, { method: 'POST', headers, body: JSON.stringify({ blueprint, mode: 'merge', setWorkflows: !Array.isArray(payload.workflowIds) }) });
    if (!applied.ok) throw new Error(`data generation failed: ${applied.status} ${await applied.text()}`);
  }
  const patch: Record<string, unknown> = {};
  for (const k of ['customWorkflows', 'overrides', 'expiresAt', 'mcpServers'] as const) if (payload[k] !== undefined) patch[k] = payload[k];
  if (payload.knowledge !== undefined || payload.dataSources !== undefined) {
    // Merge explicit tables/documents with generated ones (explicit wins on a name clash).
    const current = ((await (await fetch(`${base}/api/admin/workspaces/${workspace.id}`, { headers })).json()) as { workspace: Workspace }).workspace;
    if (Array.isArray(payload.dataSources)) { const names = new Set((payload.dataSources as { name: string }[]).map((d) => d.name)); patch.dataSources = [...current.dataSources.filter((d) => !names.has(d.name)), ...(payload.dataSources as object[])]; }
    if (Array.isArray(payload.knowledge)) { const titles = new Set((payload.knowledge as { title: string }[]).map((k) => k.title)); patch.knowledge = [...current.knowledge.filter((k) => !titles.has(k.title)), ...(payload.knowledge as object[])]; }
  }
  if (Object.keys(patch).length) {
    const updated = await fetch(`${base}/api/admin/workspaces/${workspace.id}`, { method: 'PUT', headers, body: JSON.stringify(patch) });
    if (!updated.ok) throw new Error(`update failed: ${updated.status} ${await updated.text()}`);
    return ((await updated.json()) as { workspace: Workspace }).workspace;
  }
  return workspace;
}

function viaStore(): Workspace {
  const store = new Store(cfg.dataDir);
  const company = (payload.company as string).trim();
  const custom = typeof payload.token === 'string' ? slugify(payload.token) : '';
  let token = custom.length >= 12 ? custom : newInviteToken(custom || company);
  while (store.getWorkspaceByToken(token)) token = newInviteToken(company);
  const ts = nowIso();
  const ws: Workspace = {
    id: `ws_${shortId()}`,
    token,
    company,
    industry: String(payload.industry ?? ''),
    contactName: String(payload.contactName ?? ''),
    contactEmail: String(payload.contactEmail ?? ''),
    language: payload.language === 'en' ? 'en' : 'vi',
    brief: String(payload.brief ?? ''),
    workflowIds: Array.isArray(payload.workflowIds) ? (payload.workflowIds as string[]) : ['order-care-agent', 'quote-builder-agent', 'receivables-agent', 'data-chat', 'policy-helpdesk'],
    overrides: (payload.overrides as Workspace['overrides']) ?? {},
    customWorkflows: (payload.customWorkflows as Workspace['customWorkflows']) ?? [],
    dataSources: Array.isArray(payload.dataSources) ? (payload.dataSources as { name: string; description?: string; csv: string }[]).map((d) => ({ id: `ds_${shortId(6)}`, name: d.name, description: d.description ?? '', csv: d.csv, updatedAt: ts })) : [],
    mcpServers: [],
    knowledge: Array.isArray(payload.knowledge) ? (payload.knowledge as { title: string; content: string }[]).map((k) => ({ id: `kd_${shortId(6)}`, title: k.title, content: k.content, updatedAt: ts })) : [],
    credits: { total: Number(payload.credits ?? 50), used: 0 },
    budgetUsd: Number(payload.budgetUsd ?? cfg.defaultBudgetUsd),
    spentUsd: 0,
    status: 'active',
    notes: String(payload.notes ?? ''),
    createdAt: ts,
    updatedAt: ts,
    expiresAt: cfg.defaultSandboxDays > 0 ? new Date(Date.now() + cfg.defaultSandboxDays * 86_400_000).toISOString() : undefined,
  };
  if (blueprint) {
    // Generate first, then let explicit payload tables/documents replace same-named generated ones.
    const explicit = { dataSources: ws.dataSources, knowledge: ws.knowledge, overrides: ws.overrides };
    applyGeneratedData(ws, blueprint, { mode: 'replace', setWorkflows: !Array.isArray(payload.workflowIds) });
    const names = new Set(explicit.dataSources.map((d) => d.name));
    ws.dataSources = [...ws.dataSources.filter((d) => !names.has(d.name)), ...explicit.dataSources];
    const titles = new Set(explicit.knowledge.map((k) => k.title));
    ws.knowledge = [...ws.knowledge.filter((k) => !titles.has(k.title)), ...explicit.knowledge];
    for (const [id, o] of Object.entries(explicit.overrides)) ws.overrides[id] = { ...ws.overrides[id], ...o, samples: { ...ws.overrides[id]?.samples, ...o.samples } };
  }
  store.upsertWorkspace(ws);
  store.flush();
  return ws;
}

const ws = (await viaApi()) ?? viaStore();
console.log(`Sandbox ready: ${base}/s/${ws.token}`);
console.log(`  id=${ws.id} workflows=${ws.workflowIds.length}+${ws.customWorkflows.length} custom, knowledge=${ws.knowledge.length}, credits=${ws.credits.total}, budget=$${ws.budgetUsd}`);
