import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Use relative paths in built index.html so Electron can load assets via file:// protocol
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true
  },
  build: {
    outDir: 'build'
  }
});
