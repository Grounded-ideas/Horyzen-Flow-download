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
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-pdf': ['jspdf', 'html2canvas'],
            'vendor-ui': ['recharts', 'lucide-react'],
            'vendor-codemirror': ['@codemirror/lang-markdown', '@uiw/react-codemirror'],
            'vendor-react': ['react', 'react-dom'],
          },
        },
        external: ['puppeteer'],
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
