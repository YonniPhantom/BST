import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensure relative paths for assets
  build: {
    target: 'chrome109', // Windows 7 support
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
