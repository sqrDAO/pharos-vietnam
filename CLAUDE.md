# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

[`README.md`](./README.md) is the source of truth for the stack, structure, and
local development. [`DESIGN.md`](./DESIGN.md) documents the design system.

## Commands

```bash
python3 -m http.server 8000   # Serve the site locally, then open http://localhost:8000
```

This is a no-build static site — there is no install, build, lint, or test step.

## Architecture

A static, multi-page website with client-side rendering. Each page is a standalone
HTML file (`index.html`, `about.html`, `ecosystem.html`, `technology.html`,
`guide.html`, `news.html`, `community.html`) that loads the shared stylesheet and
scripts.

- **`js/data.js`** — All site content under the global `window.PharosData`
  (ecosystem projects, news, plus a `meta` block with `version`, `lastUpdated`,
  `sources`). This is the single content store.
- **`js/main.js`** — Navbar scroll effects, mobile menu, counter/scroll
  animations, and rendering of content from `PharosData`.
- **`js/ecosystem.js`** — Filter/category logic and rendering for the ecosystem page.
- **`css/style.css`** — A single design-token system (CSS variables in `:root`)
  plus all component styles.

## Conventions

- **Content edits go in `js/data.js`**, not the HTML. Bump `meta.version` and
  `meta.lastUpdated` when changing content.
- **Design tokens are CSS variables** in the `:root` block of `css/style.css`;
  prefer existing tokens over hard-coded values.
- **Content is in Vietnamese.** Match the existing language and tone.
