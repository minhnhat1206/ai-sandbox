/**
 * Create a prospect sandbox from a JSON payload (see .claude/skills/new-sandbox).
 *   npx tsx scripts/create-sandbox.ts payload.json
 * Uses the admin API when the dev server is running (avoids clobbering its in-memory
 * state), otherwise writes to the JSON store directly.
 */
import fs from 'node:fs';
import { loadDotEnv, readConfig } from '../server/config.ts';
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
  const patch: Record<string, unknown> = {};
  for (const k of ['knowledge', 'customWorkflows', 'overrides', 'token', 'expiresAt', 'dataSources', 'mcpServers'] as const) if (payload[k] !== undefined) patch[k] = payload[k];
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
  let token = slugify(typeof payload.token === 'string' ? payload.token : company);
  while (store.getWorkspaceByToken(token)) token = `${slugify(company)}-${shortId(4)}`;
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
    workflowIds: Array.isArray(payload.workflowIds) ? (payload.workflowIds as string[]) : ['company-assistant', 'customer-reply', 'weekly-report'],
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
  };
  store.upsertWorkspace(ws);
  store.flush();
  return ws;
}

const ws = (await viaApi()) ?? viaStore();
console.log(`Sandbox ready: ${base}/s/${ws.token}`);
console.log(`  id=${ws.id} workflows=${ws.workflowIds.length}+${ws.customWorkflows.length} custom, knowledge=${ws.knowledge.length}, credits=${ws.credits.total}, budget=$${ws.budgetUsd}`);
