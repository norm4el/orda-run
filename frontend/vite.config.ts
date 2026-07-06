import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/strava': 'http://localhost:3000',
      '/telegram': 'http://localhost:3000',
    },
  },
})
