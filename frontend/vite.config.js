import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Minify with esbuild (faster) for release
    minify: 'esbuild',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Increase chunk warning limit (face-api models are large)
    chunkSizeWarningLimit: 2000,
    // Inline small assets as base64 to reduce HTTP requests
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Manual chunking: split vendor libs for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion': ['framer-motion'],
          'icons': ['lucide-react'],
          'face-api': ['face-api.js'],
        }
      }
    }
  }
})
