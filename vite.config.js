import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const HOST = '127.0.0.1';
const PORT = 5173;

const PROXY_TARGETS = {
  nadeshiko: 'https://nadeshiko.co',
  voicevox: 'http://localhost:50021',
  jpAnalyzer: 'http://127.0.0.1:8766'
};

function stripProxyPrefix(prefix) {
  return (path) => path.replace(prefix, '');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [react()],
  server: {
    host: HOST,
    port: PORT,
    proxy: {
      '/api/nadeshiko': {
        target: PROXY_TARGETS.nadeshiko,
        changeOrigin: true,
        rewrite: stripProxyPrefix(/^\/api\/nadeshiko/),
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            if (env.NADESHIKO_API_KEY) {
              proxyReq.setHeader(
                'Authorization',
                `Bearer ${env.NADESHIKO_API_KEY}`
              );
            }
          });
        }
      },
      '/api/voicevox': {
        target: PROXY_TARGETS.voicevox,
        changeOrigin: true,
        rewrite: stripProxyPrefix(/^\/api\/voicevox/)
      },
      '/api/jp-analyzer': {
        target: PROXY_TARGETS.jpAnalyzer,
        changeOrigin: true,
        rewrite: stripProxyPrefix(/^\/api\/jp-analyzer/)
      }
    }
  }
  };
});
