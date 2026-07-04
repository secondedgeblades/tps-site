# Shopping Cart — Design Spec
_2026-07-03_

## Overview

Add a localStorage-based shopping cart to thepigletssatchel.ca. Replaces per-item single-session checkout with a multi-item cart that feeds a single Stripe multi-line checkout session. Enables the free shipping threshold to work correctly and reduces customer shipping friction.

---

## Architecture

**New files:**
- `assets/js/cart.js` — cart state module (pure, no DOM)
- `assets/js/shop.js` — UI wiring (buttons, drawer, badge, progress bar)

**Modified files:**
- `index.html` — cart icon in topbar, drawer HTML, updated print cards
- `functions/api/checkout.js` — accept single priceId OR array of line items
- `thanks-order.html` — clear cart on load

**Storage:** `tps_cart` key in localStorage. Schema:
```json
[
  { "priceId": "price_...", "name": "Warrior Fairy", "size": "8.5 × 11 in", "price": 40, "img": "assets/images/battle-fairies/bf-warrior-fairy.jpg", "quantity": 1 }
]
```

---

## cart.js

Pure module — no DOM access. Exports:

| Function | Behaviour |
|---|---|
| `getItems()` | Returns cart array from localStorage |
| `getCount()` | Total quantity across all items |
| `getTotal()` | Sum of price × quantity |
| `addItem(item)` | Add 1 to existing item or push new. Max qty 5. |
| `updateQty(priceId, qty)` | Set quantity. qty ≤ 0 removes item. Max 5. |
| `removeItem(priceId)` | Remove item by priceId |
| `clear()` | Empty the cart |

---

## Print cards

Each print card gets three additions:

1. **Shipping line** below the price:
   `$12 CA/US · $32 International · Free on orders over $150`

2. **Add to Cart button** — adds 1 of this print, opens drawer, shows brief "Added" state on the button (1s), then resets.

3. **Buy Now button** — bypasses cart, opens embedded checkout for this single item at qty 1.

Existing print card layout: image → title → size → price → [new shipping line] → [Add to Cart] [Buy Now]

---

## Cart icon (topbar)

- Cart bag SVG icon added to the right of the desktop nav
- Badge (small circle) shows `getCount()` — hidden when 0
- Mobile nav also gets the cart icon
- Clicking icon opens the drawer

---

## Cart drawer

Slides in from the right. Dark backdrop closes it on click. Escape key closes it.

**Structure (top to bottom):**
1. Header: "Your Cart" + close button (×)
2. Item list — each item:
   - Thumbnail (48×48, object-fit: cover)
   - Name + size
   - Price per unit
   - Quantity stepper: `−` / count / `+` (min 1, max 5)
   - Remove button (×)
3. Divider
4. Free shipping progress bar:
   - Below $150: `"Add $X more for free shipping"` + progress fill
   - At/above $150: `"Free shipping unlocked ✓"` (green)
5. Subtotal line: `Subtotal: $X CAD` (excludes shipping)
6. Shipping note: `"Shipping calculated at checkout based on your address"`
7. **Checkout** button (full width, dark) — triggers multi-item Stripe checkout
8. **Continue Shopping** link — closes drawer

**Empty state:** Centred message — "Your cart is empty." + link to browse prints.

---

## /api/checkout update

Accepts two payload shapes:

```js
// Buy Now (single item)
{ priceId: "price_..." }

// Cart checkout (multi-item)
{ items: [{ priceId: "price_...", quantity: 2 }, ...] }
```

**Free shipping logic (server-side):**
- Calculate cart total from known price map
- Total ≥ 1500 CAD cents → single "Free Shipping" rate (0 CAD), no zone split
- Total < 1500 → zone-split CA/US ($12) and International ($32) with country restrictions

**Validation:** All priceIds must be in ALLOWED_PRICES. Total quantity per item ≤ 5.

---

## thanks-order.html

On page load, call `cart.clear()` to empty localStorage after successful purchase.

---

## Free shipping threshold

- $150 CAD = 15000 cents
- Threshold check uses the same price map as the server (hardcoded in checkout.js)
- Client-side progress bar is cosmetic — server enforces the actual logic

---

## Out of scope

- Stock decrement (managed manually via Stripe inventory)
- Cross-device cart sync
- Saved carts / wishlists
- Coupon codes
