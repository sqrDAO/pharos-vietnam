# Pharos Vietnam — Design Reference

Design language for the Pharos Vietnam community site. This site is **Pharos-branded**
and follows the **official Pharos brand kit**
([pharos.xyz/brandkit](https://www.pharos.xyz/brandkit)). It deliberately departs
from the sqrDAO gold-on-black system ([`sqrDES`](https://github.com/sqrDAO/sqrDES))
in favour of Pharos Network's own **blue-on-dark** identity.

**Brand source of truth:** the official Pharos brand kit — colours, typography, and
logos below mirror it. The logo assets live in
[`public/images/brand-kit/`](./public/images/brand-kit/) (5 SVG lockups).
**Implementation source of truth:** the `:root` block in
[`css/style.css`](./css/style.css), which now matches this reference.

> ✅ **Implementation status:** applied. `css/style.css` uses the **light
> theme** below (matching [pharos.xyz](https://www.pharos.xyz/)) with blue as the
> single accent. Headings and body both use the self-hosted PP Neue Montreal
> stack. See [Migration mapping](#migration-mapping) for what changed.

---

## Overview

**Design philosophy**: A clean, **light** institutional aesthetic matching
[pharos.xyz](https://www.pharos.xyz/) — a light-gray page with a faint grid,
**white** floating surfaces (navbar, cards, pill buttons), near-black text, and
Pharos' deep ultramarine **blue** as the single accent (logo, primary buttons,
icons). The brand draws on a **lighthouse / "set sail"** maritime metaphor (the
logomark is a stylised lighthouse beam / sail), reflecting Pharos' positioning as
the inclusive financial Layer 1 for RealFi.

Keep the palette restrained: **blue is the only chromatic accent.** Everything
else is white, greys, and near-black. Dark elements are used sparingly for
contrast (e.g. the hero badge chip). Avoid the multi-hue gold/purple/cyan/green
mix of the earlier design.

---

## Colors

The five official brand colours. HSL equivalents are provided for parity with the
HSL-based CSS variable system.

| Name | RGB | HEX | HSL (for CSS) |
|------|-----|-----|---------------|
| **Blue** (primary) | `1, 19, 183` | `#0113B7` | `hsl(234, 99%, 36%)` |
| **Black** | `11, 11, 11` | `#0B0B0B` | `hsl(0, 0%, 4%)` |
| **Dark gray** | `52, 52, 52` | `#343434` | `hsl(0, 0%, 20%)` |
| **Light gray** | `223, 227, 229` | `#DFE3E5` | `hsl(200, 10%, 89%)` |
| **White** | `255, 255, 255` | `#FFFFFF` | `hsl(0, 0%, 100%)` |

The logo SVGs use a near-identical blue (`#0007B9`) and a blue-tinted near-black
(`#08101C`) for the dark lockup background; treat `#0113B7` / `#0B0B0B` as
canonical and these as acceptable logo-file variants.

### Implemented tokens

The `:root` block in `css/style.css` maps the brand colours onto these light-theme
tokens. **Blue is the only chromatic accent**; surfaces are white over a light-gray
page, text is near-black.

| Role | Token | Value |
|------|-------|-------|
| Brand accent | `--pharos-blue` | `hsl(234, 99%, 36%)` (`#0113B7`) |
| Brand accent (hover/bright) | `--pharos-blue-bright` | `hsl(234, 95%, 52%)` |
| Brand accent (dim) | `--pharos-blue-dim` | `hsl(234, 80%, 28%)` |
| Page background | `--bg-base` | `hsl(200, 16%, 92%)` (light gray) |
| Raised surface | `--bg-surface` | `hsl(0, 0%, 100%)` (white) |
| Card | `--bg-card` | `hsl(0, 0%, 100%)` (white) |
| Card hover | `--bg-card-hover` | `hsl(200, 24%, 97%)` |
| Glass | `--bg-glass` | `hsla(0, 0%, 100%, 0.72)` |
| Border / divider | `--border-subtle` | `hsla(220, 14%, 40%, 0.16)` |
| Border glow | `--border-glow` | `hsla(234, 90%, 55%, 0.35)` |
| Primary text | `--text-primary` | `hsl(0, 0%, 7%)` (`#0B0B0B`) |
| Secondary text | `--text-secondary` | `hsl(0, 0%, 25%)` |
| Muted text | `--text-muted` | `hsl(0, 0%, 48%)` |

> Tints, borders, and glows for the accent use `hsla(234, 90%, 55%, α)` — a
> brighter blue than the `36%`-lightness base. Decorative orbs are kept at low
> opacity (~0.12) so they read as a faint tint on the light page, not blobs.

### Gradients

| Token | Value |
|-------|-------|
| `--gradient-blue` | `linear-gradient(135deg, hsl(234,99%,36%), hsl(234,95%,52%))` |
| `--gradient-hero` | `linear-gradient(180deg, hsl(200,18%,95%) 0%, hsl(200,15%,90%) 100%)` |

Both `.gradient-text` and `.gradient-text-purple` (legacy name) clip
`--gradient-blue` to text for headline accents.

---

## Typography

The official brand kit specifies two typefaces:

- **Primary — PP Neue Montreal**. Used for **everything** — headings, display, and
  body — matching pharos.xyz.
- **Secondary — Helvetica Neue** (system). Load-time / fallback only.

**Type scale** (px): `48, 40, 36, 28, 24, 20, 16, 14, 12`.

**Weights** — keep type light like pharos.xyz: body `400` (Book), headings `500`
(Medium), large display (hero / page-hero titles) `500`, section titles `600`,
and bold (`600`–`700`) reserved for small UI emphasis (nav logo, stat numbers,
buttons, numbered badges). Avoid the `800`/`900` weights of the earlier design.

### Implementation

PP Neue Montreal is **self-hosted** from
[`public/fonts/pp-neue-montreal/`](./public/fonts/pp-neue-montreal/) (`.woff`,
served at `/fonts/...`). The `@font-face` rules at the top of `css/style.css`
declare a single `'PP Neue Montreal'` family mapped by weight, with
`font-display: swap`:

| Weight | File |
|--------|------|
| 100–300 | `ppneuemontreal-thin.woff` |
| 400 | `ppneuemontreal-book.woff` |
| 400 italic | `ppneuemontreal-italic.woff` |
| 500 | `ppneuemontreal-medium.woff` |
| 600 italic | `ppneuemontreal-semibolditalic.woff` |
| 600–900 | `ppneuemontreal-bold.woff` |

Stacks (Helvetica Neue is the system fallback while the woff loads):

- **Headings & body**: `'PP Neue Montreal', 'Helvetica Neue', Helvetica, Arial, sans-serif`

> The site no longer loads any Google Fonts — both Inter and Space Grotesk were
> dropped. `partials/head.hbs` preloads the Book and Bold woffs.

---

## Logo

Official logo lockups (in [`public/images/brand-kit/`](./public/images/brand-kit/)):

| File | Variant |
|------|---------|
| `Group 1000004279.svg` | Horizontal lockup — **blue mark + dark wordmark** on light bg |
| `Group 1000004280.svg` | Horizontal lockup — **white** (knockout) on dark bg |
| `Group 1000004281.svg` | Horizontal lockup — blue mark + dark wordmark, light grey bg |
| `Group 1000004282.svg` | Horizontal lockup — **white** on **blue** bg |
| `Group 1000004283.svg` | **Logomark only** (the lighthouse/sail symbol) |

Usage rules:

- Use the **white (knockout) lockup on dark backgrounds**, the **blue + dark
  lockup on light backgrounds**.
- Preserve clear space and aspect ratio; never recolour the mark outside the
  brand blue / white / black set.
- The standalone logomark (`…283`) is for favicons, avatars, and tight spaces.

---

## Radii

| Token | Value |
|-------|-------|
| `--radius-sm` | `8px` |
| `--radius-md` | `14px` |
| `--radius-lg` | `20px` |
| `--radius-xl` | `32px` |

## Shadows

| Token | Value |
|-------|-------|
| `--shadow-card` | `0 8px 28px hsla(220, 35%, 25%, 0.10)` |
| `--shadow-glow` | `0 0 40px hsla(234, 99%, 36%, 0.18)` (blue glow) |

## Motion & Layout

| Token | Value |
|-------|-------|
| `--transition` | `0.3s cubic-bezier(0.4, 0, 0.2, 1)` |
| `--transition-slow` | `0.6s cubic-bezier(0.4, 0, 0.2, 1)` |
| `--nav-height` | `72px` |

---

## Migration mapping

How the old gold / multi-hue system was mapped to the Pharos brand (applied across
`css/style.css` and the inline styles in the `*.html` pages):

| Old (gold system) | New (Pharos brand) |
|-------------------|--------------------|
| `--pharos-gold` (primary) | `--pharos-blue: hsl(234,99%,36%)` — the single accent |
| `--pharos-gold-dim` | `--pharos-blue-dim` |
| `--gradient-gold`, `--gradient-purple` | `--gradient-blue` |
| `--pharos-purple` / `--pharos-cyan` / `--pharos-green` | `--pharos-blue-bright` (multi-hue dropped) |
| Gold glows / borders `hsla(42,100%,60%,α)` | `hsla(234,90%,55%,α)` |
| Dark-on-gold button text `hsl(30,60%,10%)` | `#fff` on blue |
| `'Space Grotesk'` headings, `'Inter'` body | `'PP Neue Montreal', 'Helvetica Neue', Helvetica, Arial, sans-serif` (self-hosted) for both |

> **PP Neue Montreal** is now self-hosted from `public/fonts/` — see
> [Typography → Implementation](#implementation). All Google Fonts loads (Inter
> and Space Grotesk) were removed from `partials/head.hbs`, which now preloads the
> Book and Bold woffs instead.

### Dark → light theme

The site originally shipped a dark theme; it was then flipped to the **light**
theme above to match pharos.xyz. What changed:

- Surfaces inverted: near-black backgrounds → light-gray page + white surfaces;
  white text → near-black text; white-alpha borders → soft gray borders.
- `--gradient-hero` and `--shadow-card` recoloured for light; decorative orbs
  dropped to ~0.12 opacity; grid-overlay lines switched to dark-alpha; the
  scrolled navbar background and hero badge chip adjusted for the light page.
- Type lightened (no more `800`/`900`) and body switched to PP Neue Montreal.
