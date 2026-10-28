import { CATALOG_BY_ID } from '../shared/catalog/index.ts';
import { applyOverride } from '../shared/engine/template.ts';
import type { WorkflowDef, Workspace } from '../shared/types.ts';

/** Resolve every workflow visible in a workspace (catalog + custom), with overrides applied. */
export function resolveWorkflows(ws: Workspace): WorkflowDef[] {
  const fromCatalog = ws.workflowIds
    .map((id) => CATALOG_BY_ID[id])
    .filter((w): w is WorkflowDef => !!w)
    .map((w) => applyOverride(w, ws.overrides[w.id]));
  const custom = ws.customWorkflows.map((w) => applyOverride(w, ws.overrides[w.id]));
  return [...fromCatalog, ...custom].filter((w) => !ws.overrides[w.id]?.hidden);
}

export function resolveWorkflow(ws: Workspace, id: string): WorkflowDef | undefined {
  return resolveWorkflows(ws).find((w) => w.id === id);
}
