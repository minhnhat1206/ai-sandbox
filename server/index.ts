import fs from 'node:fs';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app.ts';
import { loadDotEnv, readConfig } from './config.ts';
import { createProvider } from './providers/index.ts';
import { Store } from './store.ts';
import { UploadStore } from './uploads.ts';

loadDotEnv();
const config = readConfig();
const store = new Store(config.dataDir);
const provider = createProvider(config);
const app = createApp({ store, provider, config, uploads: new UploadStore(`${config.dataDir}/uploads`), filesDir: `${config.dataDir}/artifacts` });

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
  if (config.adminTokenIsDefault) console.warn('WARNING: ADMIN_TOKEN is the default value. Set it in .env before sharing any sandbox link.');
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    store.flush();
    server.close();
    process.exit(0);
  });
}
