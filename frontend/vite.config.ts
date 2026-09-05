import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/v1/patients':      { target: 'http://localhost:8081', changeOrigin: true },
      '/v1/tests':         { target: 'http://localhost:8082', changeOrigin: true },
      '/v1/orders':        { target: 'http://localhost:8083', changeOrigin: true },
      '/v1/results':       { target: 'http://localhost:8085', changeOrigin: true },
      '/v1/reports':       { target: 'http://localhost:8086', changeOrigin: true },
      '/v1/analytics':     { target: 'http://localhost:8087', changeOrigin: true },
      '/v1/notifications': { target: 'http://localhost:8088', changeOrigin: true },
      '/v1/b2b':           { target: 'http://localhost:8090', changeOrigin: true },
    },
  },
})
