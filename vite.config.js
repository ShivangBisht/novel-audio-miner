import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const HOST = '127.0.0.1';
const PORT = 5173;

const PROXY_TARGETS = {
  nadeshiko: 'https://nadeshiko.co',
  voicevox: 'http://localhost:50021'
};

function stripProxyPrefix(prefix) {
  return (path) => path.replace(prefix, '');
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: HOST,
    port: PORT,
    proxy: {
      '/api/nadeshiko': {
        target: PROXY_TARGETS.nadeshiko,
        changeOrigin: true,
        rewrite: stripProxyPrefix(/^\/api\/nadeshiko/)
      },
      '/api/voicevox': {
        target: PROXY_TARGETS.voicevox,
        changeOrigin: true,
        rewrite: stripProxyPrefix(/^\/api\/voicevox/)
      }
    }
  }
});
