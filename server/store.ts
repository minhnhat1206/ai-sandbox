import fs from 'node:fs';
import path from 'node:path';
import type { Lead, Report, Run, Workspace } from '../shared/types.ts';
import { demoWorkspace } from './seed.ts';

export interface DB {
  version: 1;
  workspaces: Workspace[];
  runs: Run[];
  leads: Lead[];
  reports: Report[];
}

/** Fill fields added after the first release so older db.json files keep working. */
function migrateWorkspace(ws: Workspace): Workspace {
  return { ...ws, budgetUsd: typeof ws.budgetUsd === 'number' ? ws.budgetUsd : 10, spentUsd: typeof ws.spentUsd === 'number' ? ws.spentUsd : 0, dataSources: ws.dataSources ?? [], mcpServers: ws.mcpServers ?? [], customWorkflows: ws.customWorkflows ?? [], knowledge: ws.knowledge ?? [], overrides: ws.overrides ?? {} };
}
function migrateRun(run: Run): Run {
  return { ...run, cacheReadTokens: run.cacheReadTokens ?? 0, trace: run.trace ?? [], artifacts: run.artifacts ?? [], actions: run.actions ?? [] };
}

function emptyDb(): DB {
  return { version: 1, workspaces: [demoWorkspace()], runs: [], leads: [], reports: [] };
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
  private readonly backupDays: number;
  private lastBackupDay = '';

  constructor(dataDir: string | null, opts: { backupDays?: number } = {}) {
    this.file = dataDir ? path.resolve(dataDir, 'db.json') : null;
    this.backupDays = opts.backupDays ?? 14;
    this.db = this.load();
  }

  private load(): DB {
    if (!this.file || !fs.existsSync(this.file)) return emptyDb();
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<DB>;
      return {
        version: 1,
        workspaces: (parsed.workspaces ?? []).map(migrateWorkspace),
        runs: (parsed.runs ?? []).map(migrateRun),
        leads: parsed.leads ?? [],
        reports: parsed.reports ?? [],
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
    this.snapshotDaily();
  }

  /** Keep one copy of db.json per day in DATA_DIR/backups, pruned to the last `backupDays`. */
  private snapshotDaily(): void {
    if (!this.file || this.backupDays <= 0) return;
    const day = new Date().toISOString().slice(0, 10);
    if (day === this.lastBackupDay) return;
    try {
      const dir = path.join(path.dirname(this.file), 'backups');
      fs.mkdirSync(dir, { recursive: true });
      const target = path.join(dir, `db-${day}.json`);
      if (!fs.existsSync(target)) fs.copyFileSync(this.file, target);
      const old = fs.readdirSync(dir).filter((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse().slice(this.backupDays);
      for (const f of old) fs.rmSync(path.join(dir, f));
      this.lastBackupDay = day;
    } catch (err) {
      console.error('[store] daily backup failed:', err);
    }
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
    this.db.reports = this.db.reports.filter((r) => r.workspaceId !== id);
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

  // ---- reports ---------------------------------------------------------------
  listReports(workspaceId?: string): Report[] {
    return this.db.reports
      .filter((r) => (workspaceId ? r.workspaceId === workspaceId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  getReport(id: string): Report | undefined {
    return this.db.reports.find((r) => r.id === id);
  }
  getReportByToken(token: string): Report | undefined {
    return this.db.reports.find((r) => r.token === token);
  }
  upsertReport(report: Report): Report {
    const i = this.db.reports.findIndex((r) => r.id === report.id);
    if (i >= 0) this.db.reports[i] = report;
    else this.db.reports.push(report);
    this.save();
    return report;
  }
  deleteReport(id: string): boolean {
    const before = this.db.reports.length;
    this.db.reports = this.db.reports.filter((r) => r.id !== id);
    this.save();
    return this.db.reports.length < before;
  }

  /** For tests and admin export. */
  snapshot(): DB {
    return JSON.parse(JSON.stringify(this.db)) as DB;
  }
}
