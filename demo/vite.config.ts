/** Serves the built demo site: `npm run build && npm run build:demo && npm run preview:demo`. */
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'demo',
  build: { outDir: '../dist/site' },
  preview: { port: 4174 },
});
