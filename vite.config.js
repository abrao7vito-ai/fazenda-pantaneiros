import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: isSsrBuild ? {} : {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          lucide: ['lucide-react'],
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  }
}))
