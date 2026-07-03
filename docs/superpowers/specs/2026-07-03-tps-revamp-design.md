# TPS Website Revamp — Design Spec
_2026-07-03_

## Overview

Pivot thepigletssatchel.ca from an elaborate multi-page studio site to a simple artist showcase and storefront. Single-page architecture, visual refresh (not just content surgery), same static stack.

**Driver:** New IP (Battle Fairies) launching as a self-produced print series. Retiring/archiving several IPs. Moving away from Printify toward direct sales via embedded Stripe checkout.

---

## Stack

- Static HTML + Tailwind CDN + custom CSS (`assets/css/style.css`)
- No build step added
- Cloudflare Pages auto-deploy on push to GitHub — unchanged
- Fonts: Young Serif (display) + Newsreader (body) — unchanged
- Payment: embedded Stripe checkout (separate conversation/implementation)

---

## Pages

### Surviving
- `index.html` — full rebuild as single-page experience
- `stories.html` — kept as standalone browseable story archive
- `about.html` — kept, copy review needed (currently marked DRAFT)
- `privacy.html`, `terms.html` — kept
- `thanks-newsletter.html`, `thanks-inquiry.html` — kept

### Retired
- `projects/softdark.html`
- `projects/ruby.html`
- `projects/seb.html`
- `projects/hoptwice.html`
- `projects/tales.html`
- `mission.html`
- `roadmap.html`
- `shop.html`

Project detail pages are replaced by world cards and sections on `index.html`. No redirects needed (these pages are not being promoted anywhere).

---

## index.html — Section Structure

### 1. Hero

**Layout:** Studio-window frame (existing `.studio-window` container stays). Two-column: left copy, right art.

**Left:**
- Headline: *"Strange work, carefully made."*
- Sub: One sentence describing TPS as a studio — sketch-based characters, limited prints, worlds worth wandering through.
- CTAs: "Browse the Work" (anchor: `#worlds`) · "Shop Prints" (anchor: `#shop`)

**Right:**
- A single Battle Fairies piece displayed at full colour, no desaturation, no filters. Art-card frame (thin border, slight shadow).
- Designed as a swap slot — easy to update as new pieces drop.
- Launch piece: TBD (CK selects from the six available).

---

### 2. Worlds (`#worlds`)

**Active worlds — 3 cards:**

| World | Medium tags | Image source |
|---|---|---|
| The Soft Dark | Read · Look | existing `softdark_hero.jpg` or cast image |
| Tales from the Middle | Read · Look | existing Tales imagery |
| Battle Fairies | Look · Buy | best piece from the six |

Card anatomy: full-bleed artwork → title → one-line descriptor → medium tags → arrow link.

**Archive row** — visually separated, lower contrast, no hover lift:

| World | Status badge |
|---|---|
| Ruby & the Guardian | Sold Out |
| Second Edge Blades | On Hold |

Archive cards are not links to anything. They acknowledge the work exists without inviting further exploration.

---

### 3. Shop (`#shop`)

**Product grid — 6 prints:**

Each card shows:
- Artwork image
- Character/print title
- Size: `8.5 × 8.5 in` (5 prints) or `8.5 × 11 in` (Warrior Fairy)
- Badge: *Limited Run · 5 Available · Shimmer Paper*
- Price (CAD — to be set, target $30–40)
- Buy button (Stripe — wired in separate conversation)

**Bundle card:**
- "Full Set — All 6 Prints"
- Discounted price vs. buying individually
- Buy button (Stripe)

**Shipping note** (below grid):
> Flat rate shipping: $10–15 CAD within Canada & USA · $30–35 CAD international · Free on orders over $150 CAD

**Inventory note:** Stock (5 per print) managed through Stripe, not tracked on the static site.

**Prints inventory:**
- Warrior Fairy — 8.5×11 (portrait)
- Hammer Time — 8.5×8.5
- Cat Lady — 8.5×8.5
- Samurai — 8.5×8.5
- Storm Rider — 8.5×8.5
- Battle Dragon — 8.5×8.5

---

### 4. Commissions (`#commissions`)

**State: Closed.**

- Section headline: *Commissions*
- Short copy: What CK offers (illustration, concept work, cover art, custom pieces). List is currently closed.
- Email signup: "Notify me when commissions open" — formsubmit.co, routes to studio inbox.
- No service icon grid. No inquiry form. These return when the list reopens.

---

### 5. Footer

- Brand mark: logo + "The Piglet's Satchel" + "An art studio"
- Anchor nav: Projects · Shop · Commissions · About · Contact
- Social icons: Tumblr · YouTube · Facebook · Instagram · Etsy · Email
- Bottom strip: © 2026 · [Terms](terms.html) · [Privacy](privacy.html)

Contact is a mailto link in the footer, not a dedicated section.

---

## Visual Refresh Notes

- **Keep:** warm parchment palette, studio-window frame, serif typography, paper texture backgrounds
- **Change:** hero uses real artwork (not just the logo), world card grid is less cramped than the current 6-column strip, section rhythm is more editorial
- **Battle Fairies art:** displayed at full colour — the bright illustration palette against the warm parchment shell is intentional contrast, not a problem to fix
- **Archive cards:** desaturated, reduced opacity, status badge treatment to visually signal dormancy

---

## Out of Scope (Separate Conversations)

- Stripe checkout implementation and inventory management
- Shipping fulfilment workflow
- Commissions form (returns when list opens)
- `about.html` copy refresh
