import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    proxy: {
      '/analyze': 'http://localhost:3001',
      '/results': 'http://localhost:3001',
      '/apply-suggestion': 'http://localhost:3001',
      '/mark-applied': 'http://localhost:3001',
      '/dismiss-suggestion': 'http://localhost:3001',
    },
  },
})
