/**
 * Bundles the entire API into a single file for SEA (Single Executable Application).
 * This allows deployment with only the executable + .env - no source code needed.
 */
import * as esbuild from 'esbuild';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../dist');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

await esbuild.build({
  entryPoints: [join(__dirname, '../server.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs', // CommonJS for SEA compatibility
  outfile: join(outDir, 'bundle.cjs'),
  minify: false, // Keep readable for debugging; set true for production
  sourcemap: false,
  target: 'node18',
}).catch(() => process.exit(1));

console.log('Bundle created: dist/bundle.cjs');
