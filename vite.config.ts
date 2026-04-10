import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@tauri-apps/plugin-fs': path.resolve(__dirname, 'node_modules/@tauri-apps/plugin-fs'),
        '@tauri-apps/plugin-store': path.resolve(__dirname, 'node_modules/@tauri-apps/plugin-store'),
        '@tauri-apps/plugin-dialog': path.resolve(__dirname, 'node_modules/@tauri-apps/plugin-dialog'),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
      },
      include: ['@tauri-apps/plugin-fs', '@tauri-apps/plugin-store', '@tauri-apps/plugin-dialog'],
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-pdf': ['jspdf', 'html2canvas'],
            'vendor-ui': ['recharts', 'lucide-react'],
            'vendor-codemirror': ['@codemirror/lang-markdown', '@uiw/react-codemirror'],
            'vendor-react': ['react', 'react-dom'],
          },
        },
        external: ['express', 'node:fs', 'node:path', 'puppeteer'],
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/flow-data/**', '**/.flow/**', '**/node_modules/**'],
      },
    },
  };
});