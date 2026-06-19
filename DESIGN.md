# Pharos Vietnam — Design Reference

Design language for the Pharos Vietnam community site. This is a **Pharos-branded**
site and **intentionally diverges** from the sqrDAO gold-on-black design system
([`sqrDES`](https://github.com/sqrDAO/sqrDES)) — it adopts Pharos Network's own
multi-hue brand palette rather than the single-accent sqrDES identity.

**Implementation source of truth:** the `:root` block in
[`css/style.css`](./css/style.css). The tokens below mirror those values.

---

## Overview

**Design philosophy**: Premium dark Web3 aesthetic. Deep near-black blue-tinted
surfaces with a gold primary accent, complemented by blue / purple / cyan / green
hues for gradients and category accents.

---

## Colors

All colors are defined as HSL CSS variables.

### Brand

| Token | Value |
|-------|-------|
| `--pharos-gold` | `hsl(42, 100%, 60%)` |
| `--pharos-gold-dim` | `hsl(42, 80%, 45%)` |
| `--pharos-blue` | `hsl(220, 100%, 60%)` |
| `--pharos-purple` | `hsl(265, 80%, 60%)` |
| `--pharos-cyan` | `hsl(190, 100%, 55%)` |
| `--pharos-green` | `hsl(145, 70%, 50%)` |

### Surfaces

| Token | Value |
|-------|-------|
| `--bg-base` | `hsl(220, 25%, 5%)` |
| `--bg-surface` | `hsl(220, 20%, 8%)` |
| `--bg-card` | `hsl(220, 18%, 10%)` |
| `--bg-card-hover` | `hsl(220, 18%, 13%)` |
| `--bg-glass` | `hsla(220, 20%, 12%, 0.6)` |

### Borders

| Token | Value |
|-------|-------|
| `--border-subtle` | `hsla(220, 30%, 30%, 0.3)` |
| `--border-glow` | `hsla(42, 100%, 60%, 0.3)` |

### Text

| Token | Value |
|-------|-------|
| `--text-primary` | `hsl(220, 20%, 96%)` |
| `--text-secondary` | `hsl(220, 15%, 65%)` |
| `--text-muted` | `hsl(220, 10%, 45%)` |

### Gradients

| Token | Value |
|-------|-------|
| `--gradient-gold` | `linear-gradient(135deg, hsl(42,100%,60%), hsl(30,100%,55%))` |
| `--gradient-purple` | `linear-gradient(135deg, hsl(265,80%,60%), hsl(220,100%,60%))` |
| `--gradient-hero` | `linear-gradient(135deg, hsl(220,25%,5%) 0%, hsl(240,20%,8%) 50%, hsl(220,25%,5%) 100%)` |

Utility classes `.gradient-text` and `.gradient-text-purple` clip these gradients
to text.

---

## Typography

- **Headings** (`h1`–`h6`): `'Space Grotesk', sans-serif`, weight 700, line-height 1.2
- **Body**: `'Inter', sans-serif`, line-height 1.7

Both fonts are loaded from Google Fonts via CDN.

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
| `--shadow-card` | `0 4px 24px hsla(220, 40%, 5%, 0.6)` |
| `--shadow-glow` | `0 0 40px hsla(42, 100%, 60%, 0.15)` |

## Motion & Layout

| Token | Value |
|-------|-------|
| `--transition` | `0.3s cubic-bezier(0.4, 0, 0.2, 1)` |
| `--transition-slow` | `0.6s cubic-bezier(0.4, 0, 0.2, 1)` |
| `--nav-height` | `72px` |
