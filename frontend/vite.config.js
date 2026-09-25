import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo el backend corre en :3001 (npm run dev desde la raíz).
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
