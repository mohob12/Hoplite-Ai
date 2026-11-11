import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `/sb` proxies the local Supabase stack so previews opened from another
// machine (and the Realtime websocket) work through the dev server origin.
const supabaseTarget = process.env.SUPABASE_PROXY_TARGET ?? 'http://127.0.0.1:54321';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/sb': {
        target: supabaseTarget,
        changeOrigin: true,
        ws: true,
        rewrite: (p) => p.replace(/^\/sb/, ''),
      },
    },
  },
  preview: { host: true, port: 4173 },
});
