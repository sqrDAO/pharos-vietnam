import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Multi-page static site. Each page is a standalone HTML entry; the shared
// vanilla JS files (js/data.js, js/main.js, js/ecosystem.js) rely on global
// `window.PharosData` and cross-file globals, so they are kept as plain
// (non-module) scripts and copied through as static assets.
export default defineConfig({
  root: resolve(__dirname),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Explicit inputs so macOS resource-fork files (._*.html) are ignored.
      input: {
        index: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        ecosystem: resolve(__dirname, 'ecosystem.html'),
        technology: resolve(__dirname, 'technology.html'),
        guide: resolve(__dirname, 'guide.html'),
        news: resolve(__dirname, 'news.html'),
        community: resolve(__dirname, 'community.html'),
      },
    },
  },
});
