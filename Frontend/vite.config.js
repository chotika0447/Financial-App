import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,

    allowedHosts: [
      'glimmer-grunt-obstruct.ngrok-free.dev',
      'rogue-washer-cola.ngrok-free.dev',
      'tammara-semivolcanic-randee.ngrok-free.dev'
    ],

    proxy: {
      '/users': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/transactions': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        bypass(req) {
        const pathname = new URL(req.url, 'http://localhost').pathname;

          if (
            req.method === 'GET' &&
            req.headers.accept?.includes('text/html') &&
            (pathname === '/transactions' || pathname === '/transactions/')
          ) {
            return '/index.html';
          }
        },
      },

      '/categories': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/line': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/accounts': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/debts': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/check-backend': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
