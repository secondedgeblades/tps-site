# Printify Shop Automation

Goal: use Printify as the product source of truth, then generate static product data for The Piglet's Satchel website.

## What It Writes

- `data/shop-products.json`
- `assets/js/shop-products.js`

The website reads `assets/js/shop-products.js` in the browser. The JSON file is for review, debugging, and future tooling.

## Required Secret

Do not paste the token into site files.

Set this locally before running the sync:

```powershell
$env:PRINTIFY_API_TOKEN="your-token-here"
```

If the token has access to more than one Printify shop, also set:

```powershell
$env:PRINTIFY_SHOP_ID="123456"
```

## Run

From `tps-site`:

```powershell
node scripts/sync-printify-products.mjs
```

Dry run:

```powershell
node scripts/sync-printify-products.mjs --dry-run
```

Include hidden Printify products:

```powershell
node scripts/sync-printify-products.mjs --include-hidden
```

## Project Routing

Product-to-project matching lives in:

```text
shop-routing.config.json
```

The script checks product title, description, and tags against each project's keywords.

For exact control, add overrides:

```json
{
  "overrides": {
    "printify-product-id": "softdark"
  }
}
```

Valid project keys:

- `seb`
- `softdark`
- `tales`
- `ruby`
- `hoptwice`
- `stories`
- `general`

## Website Usage

Any page can render products with:

```html
<div class="product-row" data-shop-preview data-project="softdark" data-limit="4"></div>
<script src="../assets/js/shop-products.js"></script>
<script src="../assets/js/shop-render.js"></script>
```

Use `data-project="all"` for the homepage.

The dedicated catalog page is:

```text
shop.html
```

Project pages now include a small shelf using their project key. If a project has no routed products yet, the shelf will show an empty-state message instead of borrowing unrelated products.
