import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/v1/patients': { target: 'http://localhost:8081', changeOrigin: true },
      '/v1/tests':    { target: 'http://localhost:8082', changeOrigin: true },
      '/v1/orders':   { target: 'http://localhost:8083', changeOrigin: true },
    },
  },
})
