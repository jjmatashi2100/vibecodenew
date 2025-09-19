import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Use relative paths in built index.html so Electron can load assets via file:// protocol
  base: './',
  plugins: [
    react(),
    // Inject strict CSP meta tag only in the production build output.
    (function cspMetaPlugin() {
      const cspContent =
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https: http://localhost:* http://127.0.0.1:*; " +
        "worker-src 'self' blob:; " +
        "object-src 'none'; " +
        "base-uri 'self';";

      return {
        name: 'html-csp-meta',
        apply: 'build', // production build only
        transformIndexHtml() {
          return {
            tags: [
              {
                tag: 'meta',
                attrs: {
                  'http-equiv': 'Content-Security-Policy',
                  content: cspContent,
                },
                injectTo: 'head',
              },
            ],
          };
        },
      };
    })(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    // keep symlink (junction) paths intact so Rollup/Vite don't emit
    // assets with invalid relative paths during Windows junction builds
    preserveSymlinks: true
    }
  },
  server: {
    port: 3000,
    strictPort: true
  },
  build: {
    outDir: 'build'
  }
});
