import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

esbuild.buildSync({
  entryPoints: ['./server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  outfile: './dist-server/server.js',
  external: ['puppeteer'],
  minify: false,
});

console.log('Server bundle created at dist-server/server.js');
