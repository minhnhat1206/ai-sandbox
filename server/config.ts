import fs from 'node:fs';
import path from 'node:path';

/** Load .env (KEY=VALUE lines) without extra dependencies. Existing env wins. */
export function loadDotEnv(file = '.env'): void {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export interface Config {
  provider: 'mock' | 'anthropic';
  anthropicApiKey: string;
  model: string;
  effort: 'low' | 'medium' | 'high';
  adminToken: string;
  adminTokenIsDefault: boolean;
  dataDir: string;
  port: number;
  /** Default USD cap for a new sandbox. */
  defaultBudgetUsd: number;
  /** New sandboxes expire after this many days (0 = never). */
  defaultSandboxDays: number;
  /** Behind a reverse proxy: read the client IP from X-Forwarded-For. */
  trustProxy: boolean;
  /** Per-IP and per-sandbox request limits (RATE_LIMIT=off disables them). */
  rateLimit: boolean;
  /** Daily db.json snapshots kept in DATA_DIR/backups (0 = no snapshots). */
  backupDays: number;
}

export const DEFAULT_ADMIN_TOKEN = 'change-me';

/** Why this admin token must not be used on a public server ('' when it is fine). */
export function weakAdminTokenReason(token: string): string {
  if (token === DEFAULT_ADMIN_TOKEN) return 'ADMIN_TOKEN is the default value';
  if (token.length < 16) return 'ADMIN_TOKEN is shorter than 16 characters';
  return '';
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const requested = (env.AI_PROVIDER ?? 'mock').toLowerCase();
  const apiKey = env.ANTHROPIC_API_KEY ?? '';
  // Only use the real provider when explicitly asked AND a key exists.
  const provider: Config['provider'] = requested === 'anthropic' && apiKey ? 'anthropic' : 'mock';
  const effortRaw = (env.ANTHROPIC_EFFORT ?? 'medium').toLowerCase();
  const effort = effortRaw === 'low' || effortRaw === 'high' ? effortRaw : 'medium';
  const adminToken = env.ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN;
  return {
    provider,
    anthropicApiKey: apiKey,
    model: env.ANTHROPIC_MODEL || 'claude-opus-5-5',
    effort,
    adminToken,
    adminTokenIsDefault: adminToken === DEFAULT_ADMIN_TOKEN,
    dataDir: env.DATA_DIR || './data',
    port: Number(env.PORT ?? 3000),
    defaultBudgetUsd: Math.max(0, Number(env.DEFAULT_BUDGET_USD) || 10),
    defaultSandboxDays: env.DEFAULT_SANDBOX_DAYS === undefined ? 30 : Math.max(0, Number(env.DEFAULT_SANDBOX_DAYS) || 0),
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
    rateLimit: (env.RATE_LIMIT ?? 'on').toLowerCase() !== 'off',
    backupDays: env.BACKUP_DAYS === undefined ? 14 : Math.max(0, Number(env.BACKUP_DAYS) || 0),
  };
}
