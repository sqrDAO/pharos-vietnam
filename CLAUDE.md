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

The shared chrome (`<head>`, navbar, footer) is **not** duplicated per page. It
lives in Handlebars partials under **`partials/`** (`head.hbs`, `navbar.hbs`,
`footer.hbs`), included from each page with `{{> head}}` / `{{> navbar}}` /
`{{> footer}}` and rendered at build/dev time by
[`vite-plugin-handlebars`](https://github.com/alexlafroscia/vite-plugin-handlebars).
Each page is just `<body data-page="…">` + its unique sections.

- **`partials/`** — shared head/navbar/footer. Per-page values (title,
  description, the homepage-only Open Graph tags, the technology-page footer
  variant) come from the `pageMeta` map in `vite.config.js`, keyed by filename.
- **`vite.config.js`** — wires the handlebars plugin (`partialDirectory` +
  `context`) and holds `pageMeta`. The active nav link is **not** hardcoded:
  `highlightActiveNav()` in `main.js` reads `<body data-page>` at runtime.

The shared scripts are plain (non-module) global scripts with a load-order
dependency (`data.js` → `main.js` → page script) and cross-file globals
(`window.PharosData`, the `initAOS` function). They live in **`public/js/`** so
Vite copies them verbatim to the build output instead of bundling them — keep
them as plain scripts, not ES modules, and load any page script **after**
`main.js`. (Vite prints `can't be bundled without type="module"` warnings for
these; that is expected and intended.)

- **`public/js/data.js`** — All site content under the global `window.PharosData`
  (ecosystem projects, news, plus a `meta` block with `version`, `lastUpdated`,
  `sources`). This is the single content store.
- **`public/js/main.js`** — Navbar scroll effects, mobile menu, counter/scroll
  animations, active-nav highlight, and rendering of content from `PharosData`.
- **`public/js/ecosystem.js`** — Filter/category logic and rendering for the ecosystem page.
- **`public/js/news.js`** — News grid render + category filter (news page).
- **`public/js/guide.js`** — FAQ accordion (guide page).
- **`css/style.css`** — A single design-token system (CSS variables in `:root`)
  plus all component styles, ending with a "Page responsive overrides" section.
  Processed and hashed by Vite at build time.

## Conventions

- **Content edits go in `public/js/data.js`**, not the HTML. Bump `meta.version`
  and `meta.lastUpdated` when changing content.
- **Shared header/nav/footer edits go in `partials/`**; per-page title,
  description, and footer variant go in `pageMeta` in `vite.config.js`. Don't
  re-add chrome markup to individual pages.
- **No inline `<script>`/`<style>` in pages.** Page behavior goes in a
  `public/js/` script; responsive overrides go in `css/style.css`.
- **Design tokens are CSS variables** in the `:root` block of `css/style.css`;
  prefer existing tokens over hard-coded values.
- **Content is in Vietnamese.** Match the existing language and tone.
