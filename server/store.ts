import fs from 'node:fs';
import path from 'node:path';
import type { Lead, Run, Workspace } from '../shared/types.ts';
import { demoWorkspace } from './seed.ts';

export interface DB {
  version: 1;
  workspaces: Workspace[];
  runs: Run[];
  leads: Lead[];
}

function emptyDb(): DB {
  return { version: 1, workspaces: [demoWorkspace()], runs: [], leads: [] };
}

/**
 * Tiny JSON file store. Good enough for a sales sandbox with a handful of
 * prospects; swap for a database when volume justifies it.
 * Pass `null` as dataDir for an in-memory store (tests).
 */
export class Store {
  private db: DB;
  private file: string | null;
  private timer: NodeJS.Timeout | null = null;

  constructor(dataDir: string | null) {
    this.file = dataDir ? path.resolve(dataDir, 'db.json') : null;
    this.db = this.load();
  }

  private load(): DB {
    if (!this.file || !fs.existsSync(this.file)) return emptyDb();
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<DB>;
      return {
        version: 1,
        workspaces: parsed.workspaces ?? [],
        runs: parsed.runs ?? [],
        leads: parsed.leads ?? [],
      };
    } catch (err) {
      const backup = `${this.file}.${Date.now()}.bak`;
      fs.copyFileSync(this.file, backup);
      console.error(`[store] db.json unreadable, backed up to ${backup}:`, err);
      return emptyDb();
    }
  }

  /** Debounced write; call flush() before exit. */
  save(): void {
    if (!this.file) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 150);
  }

  flush(): void {
    if (!this.file) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.db, null, 2));
    fs.renameSync(tmp, this.file);
  }

  // ---- workspaces ----------------------------------------------------------
  listWorkspaces(): Workspace[] {
    return [...this.db.workspaces].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  getWorkspace(id: string): Workspace | undefined {
    return this.db.workspaces.find((w) => w.id === id);
  }
  getWorkspaceByToken(token: string): Workspace | undefined {
    return this.db.workspaces.find((w) => w.token === token);
  }
  upsertWorkspace(ws: Workspace): Workspace {
    const i = this.db.workspaces.findIndex((w) => w.id === ws.id);
    if (i >= 0) this.db.workspaces[i] = ws;
    else this.db.workspaces.push(ws);
    this.save();
    return ws;
  }
  deleteWorkspace(id: string): boolean {
    const before = this.db.workspaces.length;
    this.db.workspaces = this.db.workspaces.filter((w) => w.id !== id);
    this.db.runs = this.db.runs.filter((r) => r.workspaceId !== id);
    this.db.leads = this.db.leads.filter((l) => l.workspaceId !== id);
    this.save();
    return this.db.workspaces.length < before;
  }

  // ---- runs ------------------------------------------------------------------
  listRuns(filter: { workspaceId?: string; sessionId?: string } = {}): Run[] {
    return this.db.runs
      .filter((r) => (filter.workspaceId ? r.workspaceId === filter.workspaceId : true))
      .filter((r) => (filter.sessionId ? r.sessionId === filter.sessionId : true))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
  getRun(id: string): Run | undefined {
    return this.db.runs.find((r) => r.id === id);
  }
  upsertRun(run: Run): Run {
    const i = this.db.runs.findIndex((r) => r.id === run.id);
    if (i >= 0) this.db.runs[i] = run;
    else this.db.runs.push(run);
    this.save();
    return run;
  }

  // ---- leads -----------------------------------------------------------------
  listLeads(workspaceId?: string): Lead[] {
    return this.db.leads
      .filter((l) => (workspaceId ? l.workspaceId === workspaceId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  addLead(lead: Lead): Lead {
    this.db.leads.push(lead);
    this.save();
    return lead;
  }

  /** For tests and admin export. */
  snapshot(): DB {
    return JSON.parse(JSON.stringify(this.db)) as DB;
  }
}
