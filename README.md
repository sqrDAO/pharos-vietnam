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

No build step, bundler, or package manager — the site is served as static files.

## Local Development

Serve the repo root with any static file server, then open the site in a browser:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

There is no `npm install`, build, lint, or test step.

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
├── css/
│   └── style.css       # Design-token system + all components
└── js/
    ├── data.js         # All site content (window.PharosData)
    ├── ecosystem.js    # Ecosystem filter & rendering logic
    └── main.js         # Navbar, mobile menu, animations, content rendering
```

## Content / Editing

All site content lives in [`js/data.js`](./js/data.js) under the global
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
