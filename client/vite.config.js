import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run dev`      → API з локального бекенду (localhost:4000)
// `npm run dev:live` → API з живого бекенду на Render, локальний сервер не потрібен
const LIVE_API = 'https://gamevault-api-kopk.onrender.com';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: mode === 'live' ? LIVE_API : 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
}));
