// Proxy สำหรับใช้เฉพาะตอนพัฒนา Frontend ในเครื่อง
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    port: 5173,

    allowedHosts: [
      'glimmer-grunt-obstruct.ngrok-free.dev',
      'tammara-semivolcanic-randee.ngrok-free.dev',
      'financial-app-xgc0.onrender.com',
      'rogue-washer-cola.ngrok-free.dev',
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

      '/savings': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/categories': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/line': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/friends': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },

      '/debts': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        bypass: (request) => {
          if (!request.headers.authorization) {
            return request.url;
          }
        },
      },
      
      '/check-backend': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
