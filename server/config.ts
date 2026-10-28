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
}

export const DEFAULT_ADMIN_TOKEN = 'change-me';

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
  };
}
