/**
 * Конфигурация Vite для сборки frontend
 * 
 * Функциональность:
 * - Настройка React плагина
 * - Алиасы путей (@ для src/)
 * - Настройка dev server с proxy для API
 * - Оптимизация зависимостей
 * 
 * Proxy:
 * - /api -> http://127.0.0.1:3000 (backend)
 * - /uploads -> http://127.0.0.1:3000 (загруженные файлы)
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['three', '@react-three/fiber', '@react-three/drei'],
    preserveSymlinks: false,
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
    esbuildOptions: {
      target: 'esnext',
    },
    force: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            if (err.code === 'ECONNREFUSED') {
              console.warn('[Vite Proxy] ⚠️  Backend server не доступен на http://127.0.0.1:3000');
              console.warn('[Vite Proxy]    Убедитесь, что backend запущен: cd backend && npm run dev');
            } else {
              console.error('[Vite Proxy] Ошибка:', err.message);
            }
          });
        },
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

