# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

[`README.md`](./README.md) is the source of truth for the stack, structure, and
local development. [`DESIGN.md`](./DESIGN.md) documents the design system.

## Commands

```bash
npm install        # Install dev dependencies (Vite) — once
npm run dev        # Start the Vite dev server (http://localhost:5173)
npm run build      # Build the production site into dist/
npm run preview    # Serve the built dist/ locally
```

Tooling is [Vite](https://vite.dev) (multi-page static build). There is no lint
or test step. Deployment is to Vercel (`vercel.json`; framework `vite`,
output `dist/`).

## Architecture

A static, multi-page website with client-side rendering. Each page is a standalone
HTML file (`index.html`, `about.html`, `ecosystem.html`, `technology.html`,
`guide.html`, `news.html`, `community.html`) and is declared as a Vite entry in
`vite.config.js`. Each page loads the shared stylesheet and scripts.

The shared scripts are plain (non-module) global scripts with a load-order
dependency (`data.js` → `main.js` → `ecosystem.js`) and cross-file globals
(`window.PharosData`, the `initAOS` function, the inline `toggleFaq` in
`guide.html`). They live in **`public/js/`** so Vite copies them verbatim to the
build output instead of bundling them — keep them as plain scripts, not ES modules.

- **`public/js/data.js`** — All site content under the global `window.PharosData`
  (ecosystem projects, news, plus a `meta` block with `version`, `lastUpdated`,
  `sources`). This is the single content store.
- **`public/js/main.js`** — Navbar scroll effects, mobile menu, counter/scroll
  animations, and rendering of content from `PharosData`.
- **`public/js/ecosystem.js`** — Filter/category logic and rendering for the ecosystem page.
- **`css/style.css`** — A single design-token system (CSS variables in `:root`)
  plus all component styles. Processed and hashed by Vite at build time.

## Conventions

- **Content edits go in `public/js/data.js`**, not the HTML. Bump `meta.version`
  and `meta.lastUpdated` when changing content.
- **Design tokens are CSS variables** in the `:root` block of `css/style.css`;
  prefer existing tokens over hard-coded values.
- **Content is in Vietnamese.** Match the existing language and tone.
