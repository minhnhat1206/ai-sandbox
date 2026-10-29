import type { Plugin } from 'vite';
import { getRequestListener } from '@hono/node-server';

/**
 * Mounts the API inside the Vite dev server so `npm run dev` is the only
 * command needed. Production uses server/index.ts instead.
 */
export function apiPlugin(): Plugin {
  return {
    name: 'ai-sandbox-api',
    async configureServer(server) {
      if (process.env.VITEST) return; // unit tests build their own app instance
      const { loadDotEnv, readConfig } = await import('./config.ts');
      const { Store } = await import('./store.ts');
      const { createProvider } = await import('./providers/index.ts');
      const { createApp } = await import('./app.ts');
      const { UploadStore } = await import('./uploads.ts');
      loadDotEnv();
      const config = readConfig();
      const store = new Store(config.dataDir, { backupDays: config.backupDays });
      const provider = createProvider(config);
      const app = createApp({ store, provider, config, uploads: new UploadStore(`${config.dataDir}/uploads`), filesDir: `${config.dataDir}/artifacts` });
      const listener = getRequestListener(app.fetch);
      console.log(`  ➜  API: provider=${provider.name} model=${provider.model}${config.adminTokenIsDefault ? '  (ADMIN_TOKEN is the default: change it before sharing links)' : ''}`);
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) return listener(req, res);
        next();
      });
      server.httpServer?.on('close', () => store.flush());
    },
  };
}
