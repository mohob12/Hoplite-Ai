import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// `/sb` proxies the local Supabase stack so previews opened from another
// machine (and the Realtime websocket) work through the dev server origin.
const supabaseTarget = process.env.SUPABASE_PROXY_TARGET ?? 'http://127.0.0.1:54321';

export default defineConfig(({ command, mode }) => {
  // On Netlify, fail the deploy with a clear message instead of publishing a blank site.
  if (command === 'build' && process.env.NETLIFY === 'true') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !env[k]);
    if (missing.length) throw new Error(`Missing ${missing.join(' and ')}: add them in Netlify → Site configuration → Environment variables.`);
    if (!/^https:\/\/.+/.test(env.VITE_SUPABASE_URL)) {
      throw new Error('VITE_SUPABASE_URL must be your Supabase project URL, e.g. https://abcd1234.supabase.co');
    }
  }

  return {
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
  };
});
