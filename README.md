# Pharos Vietnam

Vietnamese-language community portal for [Pharos Network](https://pharosnetwork.xyz),
a Layer-1 EVM blockchain. The site introduces Pharos to the Vietnamese Web3
community: its technology, ecosystem, roadmap, guides, and news.

> Cổng thông tin cộng đồng Pharos Network tại Việt Nam. **Không phải trang chính
> thức của Pharos Network.** (A community portal — not an official Pharos site.)
> Maintained by [sqrDAO](https://www.sqrdao.com/).

## Stack

- HTML5 (multi-page, static)
- Vanilla JavaScript (ES6+) — no framework
- CSS3 with a custom design-token system
- Google Fonts: Inter (body) and Space Grotesk (headings) via CDN
- [Vite](https://vite.dev) for the dev server and production build
- Deployed on [Vercel](https://vercel.com)

The JavaScript is plain global scripts (not ES modules); Vite serves and ships
them as-is from `public/js/`, and processes the CSS and HTML at build time.

## Local Development

```bash
npm install      # once
npm run dev      # dev server with HMR → http://localhost:5173
```

Other scripts:

```bash
npm run build    # production build → dist/
npm run preview  # serve the built dist/ locally
```

There is no lint or test step.

## Deployment

Hosted on Vercel (framework preset `vite`, output `dist/`, configured in
[`vercel.json`](./vercel.json)). Deploy from the repo root with the Vercel CLI:

```bash
vercel          # preview deployment
vercel --prod   # production deployment
```

## Project Structure

```
pharos-vietnam/
├── index.html          # Landing page (hero, features, ecosystem preview, roadmap, news)
├── about.html          # About Pharos Network
├── ecosystem.html      # Full ecosystem / partner projects list
├── technology.html     # Technical architecture & features
├── guide.html          # Getting-started & testnet guides
├── news.html           # News and updates
├── community.html      # Community resources
├── vite.config.js      # Vite multi-page config (declares each HTML entry)
├── vercel.json         # Vercel deployment config
├── css/
│   └── style.css       # Design-token system + all components
└── public/
    └── js/             # Copied verbatim into the build (plain global scripts)
        ├── data.js     # All site content (window.PharosData)
        ├── ecosystem.js # Ecosystem filter & rendering logic
        └── main.js     # Navbar, mobile menu, animations, content rendering
```

## Content / Editing

All site content lives in [`public/js/data.js`](./public/js/data.js) under the global
`window.PharosData` object (ecosystem projects, news items, etc.). Edit content
there rather than in the HTML. When updating content, bump `meta.version` and
`meta.lastUpdated`, and keep `meta.sources` accurate.

Content is written in Vietnamese.

## Design

Design tokens and visual language are documented in [`DESIGN.md`](./DESIGN.md).
The implementation source of truth for tokens is the `:root` block in
[`css/style.css`](./css/style.css).

## Related Repos

- `sqrDES` (sqrDAO design system): https://github.com/sqrDAO/sqrDES
- `sqrDAO`: https://www.sqrdao.com/
- Pharos Network: https://pharosnetwork.xyz
