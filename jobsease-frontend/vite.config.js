import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Load env files from repo root so frontend dev
  // can use the shared .env (including VITE_GOOGLE_CLIENT_ID).
  envDir: '..',
  server: {
    // In local dev we often use VITE_API_BASE_URL=/api.
    // Proxy those calls to Spring Boot running on localhost:8080.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
})
