import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Usar rutas relativas para Electron
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Copiar archivos públicos al dist
    copyPublicDir: true,
    // Asegurar que los assets usen rutas relativas
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  }
})
