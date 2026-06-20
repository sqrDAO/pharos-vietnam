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

> ✅ **Implementation status:** the gold → Pharos-blue migration is **applied**.
> `css/style.css` uses the blue palette below, headings use the PP Neue Montreal
> stack (Space Grotesk fallback), and body uses the Helvetica Neue system stack.
> See [Migration mapping](#migration-mapping) for what changed.

---

## Overview

**Design philosophy**: Premium dark Web3 aesthetic anchored on Pharos' deep
ultramarine **blue** as the single brand accent over near-black surfaces. The
brand draws on a **lighthouse / "set sail"** maritime metaphor (the logomark is a
stylised lighthouse beam / sail) — clean, institutional, and infrastructure-grade,
reflecting Pharos' positioning as the inclusive financial Layer 1 for RealFi.

Keep the palette restrained: **blue is the only chromatic accent.** Everything
else is black, greys, and white. Avoid the multi-hue gold/purple/cyan/green mix
of the previous design.

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

The `:root` block in `css/style.css` maps the five brand colours onto these
tokens. **Blue is the only chromatic accent**; everything else is neutral
black / grey / white.

| Role | Token | Value |
|------|-------|-------|
| Brand accent | `--pharos-blue` | `hsl(234, 99%, 36%)` (`#0113B7`) |
| Brand accent (hover/bright) | `--pharos-blue-bright` | `hsl(234, 95%, 52%)` |
| Brand accent (dim) | `--pharos-blue-dim` | `hsl(234, 80%, 28%)` |
| Page background | `--bg-base` | `hsl(0, 0%, 4%)` (`#0B0B0B`) |
| Raised surface | `--bg-surface` | `hsl(0, 0%, 7%)` |
| Card | `--bg-card` | `hsl(0, 0%, 9%)` |
| Card hover | `--bg-card-hover` | `hsl(0, 0%, 12%)` |
| Glass | `--bg-glass` | `hsla(0, 0%, 13%, 0.6)` |
| Border / divider | `--border-subtle` | `hsla(0, 0%, 100%, 0.1)` |
| Border glow | `--border-glow` | `hsla(234, 90%, 55%, 0.35)` |
| Primary text | `--text-primary` | `hsl(0, 0%, 100%)` (`#FFFFFF`) |
| Secondary text | `--text-secondary` | `hsl(200, 10%, 89%)` (`#DFE3E5`) |
| Muted text | `--text-muted` | `hsl(0, 0%, 45%)` |

> Tints, borders, and glows for the accent use `hsla(234, 90%, 55%, α)` — a
> brighter blue than the `36%`-lightness base, which reads better as a glow on
> the near-black surfaces.

### Gradients

Gradients stay within the blue → black family (no gold/purple):

| Token | Value |
|-------|-------|
| `--gradient-blue` | `linear-gradient(135deg, hsl(234,99%,36%), hsl(234,95%,52%))` |
| `--gradient-hero` | `linear-gradient(135deg, hsl(0,0%,4%) 0%, hsl(234,40%,8%) 50%, hsl(0,0%,4%) 100%)` |

Both `.gradient-text` and `.gradient-text-purple` (legacy name) clip
`--gradient-blue` to text for headline accents.

---

## Typography

The official brand kit specifies two typefaces:

- **Primary — PP Neue Montreal** (e.g. the *Book* / regular weight). Used for
  headings and display.
- **Secondary — Helvetica Neue** (Regular). Used for body / supporting text.

**Type scale** (px), shared by both faces: `48, 40, 36, 28, 24, 20, 16, 14, 12`.

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

Stacks (Helvetica Neue is a system font, used as the load-time fallback):

- **Headings**: `'PP Neue Montreal', 'Helvetica Neue', Helvetica, Arial, sans-serif`
- **Body**: `'Helvetica Neue', Helvetica, Arial, sans-serif`

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
| `--shadow-card` | `0 4px 24px hsla(0, 0%, 0%, 0.6)` |
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
| Blue-tinted surfaces `hsl(220, …)` | Neutral black / greys (`#0B0B0B`, white-alpha borders, `#DFE3E5` text) |
| Dark-on-gold button text `hsl(30,60%,10%)` | `#fff` on blue |
| `'Space Grotesk'` headings | `'PP Neue Montreal', 'Helvetica Neue', Helvetica, Arial, sans-serif` (self-hosted) |
| `'Inter'` body | `'Helvetica Neue', Helvetica, Arial, sans-serif` |

> **PP Neue Montreal** is now self-hosted from `public/fonts/` — see
> [Typography → Implementation](#implementation). All Google Fonts loads (Inter
> and Space Grotesk) were removed from `partials/head.hbs`, which now preloads the
> Book and Bold woffs instead.
