import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { fs: { deny: ['**/.env', '**/.env.*', '**/server/**', '**/database/**', '**/.git/**', '**/*.{crt,pem}'] }, proxy: { '/insights/': { target: 'http://127.0.0.1:4000', changeOrigin: false }, '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false } } },
  preview: { proxy: { '/insights/': { target: 'http://127.0.0.1:4000', changeOrigin: false }, '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false } } },
})
