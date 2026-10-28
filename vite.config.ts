import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { apiPlugin } from './server/vite-plugin.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
  server: { port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' },
  resolve: {
    alias: {
      '@shared': path.resolve(here, 'shared'),
      '@': path.resolve(here, 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
