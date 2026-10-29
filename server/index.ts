import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app.ts';
import { loadDotEnv, readConfig, weakAdminTokenReason } from './config.ts';
import { createProvider } from './providers/index.ts';
import { Store } from './store.ts';
import { UploadStore } from './uploads.ts';

loadDotEnv();
const config = readConfig();
const weak = weakAdminTokenReason(config.adminToken);
if (weak && process.env.NODE_ENV === 'production') {
  console.error(`Refusing to start in production: ${weak}. Generate one with: openssl rand -hex 24`);
  process.exit(1);
}
const store = new Store(config.dataDir, { backupDays: config.backupDays });
const provider = createProvider(config);
const app = createApp({ store, provider, config, uploads: new UploadStore(`${config.dataDir}/uploads`), filesDir: `${config.dataDir}/artifacts` });

// Baseline security headers for the SPA (the API sets its own in app.ts).
app.use('*', async (c, next) => {
  await next();
  c.header('referrer-policy', 'no-referrer');
  c.header('x-content-type-options', 'nosniff');
  c.header('x-frame-options', 'SAMEORIGIN');
  c.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
});

// Serve the built SPA from dist/ with history fallback.
const dist = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(dist)) {
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', (c) => c.html(fs.readFileSync(path.join(dist, 'index.html'), 'utf8')));
} else {
  app.get('*', (c) => c.text('Frontend not built. Run `npm run build` first, or use `npm run dev`.', 503));
}

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`AI Sandbox listening on http://localhost:${info.port}  provider=${provider.name} model=${provider.model}`);
  if (weak) console.warn(`WARNING: ${weak}. Set a strong one in .env before sharing any sandbox link.`);
  if (!config.trustProxy) console.warn('Note: TRUST_PROXY is off. Behind Caddy/Nginx set TRUST_PROXY=1 so rate limits see real client IPs.');
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    store.flush();
    server.close();
    process.exit(0);
  });
}
