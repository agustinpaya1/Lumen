import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Esto permite acceder desde el móvil en tu red local más tarde
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Apunta a tu Django
        changeOrigin: true,
        secure: false,
      }
    }
  }
})