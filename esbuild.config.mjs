import { context } from 'esbuild';
import process from 'node:process';
const production = process.argv.includes('production');
const build = await context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'cjs',
  target: 'es2022',
  external: ['obsidian', '@codemirror/*', '@lezer/*'],
  outfile: 'main.js',
  sourcemap: production ? false : 'inline',
  banner: { js: '/* Generated from src/. MIT licensed. */' },
  logLevel: 'info',
});
if (production) {
  await build.rebuild();
  await build.dispose();
} else {
  await build.watch();
}
