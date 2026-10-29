/**
 * Synthetic-data studio: propose a blueprint (blueprint.ts), generate tables, documents and
 * sample inputs from it (generate.ts, docs.ts, samples.ts), then apply them to a workspace.
 */
import type { DataBlueprint, GeneratedData, Workspace } from '../../shared/types.ts';
import { CATALOG } from '../../shared/catalog/index.ts';
import { nowIso, shortId } from '../ids.ts';
import { CANONICAL_TABLES, normalizeExtraTables, normalizeProfile } from './blueprint.ts';
import { generateDocs } from './docs.ts';
import { generateAll } from './generate.ts';
import { matchPreset } from './profiles.ts';
import { generateSamples } from './samples.ts';

export { heuristicBlueprint, proposeBlueprint, suggestWorkflows, CANONICAL_TABLES, type BlueprintInput } from './blueprint.ts';
export { PRESET_KEYS } from './profiles.ts';

/** Re-validate a blueprint that came back from the admin UI (the founder may have edited it). */
export function normalizeBlueprint(raw: unknown): DataBlueprint | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const company = typeof r.company === 'string' ? r.company.trim().slice(0, 120) : '';
  if (!company) return null;
  const p = (r.profile && typeof r.profile === 'object' ? r.profile : {}) as Record<string, unknown>;
  const base = matchPreset(`${typeof p.label === 'string' ? p.label : ''} ${typeof r.industry === 'string' ? r.industry : ''}`);
  const profile = { ...normalizeProfile(p, base), key: typeof p.key === 'string' ? p.key.slice(0, 40) : 'custom' };
  const asOf = typeof r.asOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.asOf) && !Number.isNaN(Date.parse(r.asOf)) ? r.asOf : new Date().toISOString().slice(0, 10);
  return {
    company,
    industry: typeof r.industry === 'string' ? r.industry.slice(0, 200) : profile.label,
    asOf,
    profile,
    extraTables: normalizeExtraTables(r.extraTables),
    workflowIds: Array.isArray(r.workflowIds) ? r.workflowIds.filter((id): id is string => typeof id === 'string' && CATALOG.some((w) => w.id === id)).slice(0, 21) : [],
    notes: Array.isArray(r.notes) ? r.notes.filter((n): n is string => typeof n === 'string').map((n) => n.slice(0, 300)).slice(0, 8) : [],
    source: r.source === 'ai' ? 'ai' : 'heuristic',
  };
}

export function generateData(bp: DataBlueprint): GeneratedData {
  const tables = generateAll(bp);
  return {
    dataSources: tables,
    knowledge: generateDocs(bp.company, bp.profile),
    samples: generateSamples(bp.profile, tables, bp.asOf),
    asOf: bp.asOf,
  };
}

export interface ApplyOptions {
  /** replace: generated tables and documents replace the old ones; merge: keep tables/docs with other names. */
  mode: 'replace' | 'merge';
  /** Also enable the blueprint's suggested workflows. */
  setWorkflows?: boolean;
  /** Use a preview the founder already reviewed instead of regenerating. */
  data?: GeneratedData;
}

/** Write generated data into a workspace (mutates and returns it). */
export function applyGeneratedData(ws: Workspace, bp: DataBlueprint, opts: ApplyOptions): Workspace {
  const data = opts.data ?? generateData(bp);
  const ts = nowIso();
  const names = new Set(data.dataSources.map((d) => d.name));
  const keptSources = opts.mode === 'merge' ? (ws.dataSources ?? []).filter((d) => !names.has(d.name)) : [];
  ws.dataSources = [...keptSources, ...data.dataSources.map((d) => ({ id: `ds_${shortId(6)}`, name: d.name, description: d.description, csv: d.csv, updatedAt: ts }))];
  const titles = new Set(data.knowledge.map((k) => k.title));
  const keptDocs = opts.mode === 'merge' ? ws.knowledge.filter((k) => !titles.has(k.title)) : [];
  ws.knowledge = [...keptDocs, ...data.knowledge.map((k) => ({ id: `kd_${shortId(6)}`, title: k.title, content: k.content, updatedAt: ts }))];
  for (const [wfId, samples] of Object.entries(data.samples)) {
    const prev = ws.overrides[wfId] ?? {};
    ws.overrides[wfId] = { ...prev, samples: { ...(prev.samples ?? {}), ...samples } };
  }
  if (opts.setWorkflows && bp.workflowIds.length) ws.workflowIds = bp.workflowIds;
  if (!ws.industry) ws.industry = bp.industry;
  ws.dataAsOf = data.asOf;
  ws.updatedAt = ts;
  return ws;
}

/** Tables the catalog agents rely on; the admin UI marks them so the founder does not delete them. */
export const isCanonicalTable = (name: string) => CANONICAL_TABLES.includes(name);
