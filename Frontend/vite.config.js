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
      'financial-app-frontend-o1d7w5dgu-projectzaaa.vercel.app',
    ],

    proxy: {
      '/users': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/transactions': {
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
    },
  },
})
