import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const API_BASE = 'https://api.printify.com/v1';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.split('=');
    return [key.replace(/^--/, ''), value.join('=') || true];
  })
);

const token = process.env.PRINTIFY_API_TOKEN || args.get('token');
const requestedShopId = process.env.PRINTIFY_SHOP_ID || args.get('shop-id') || '27093175';
const includeHidden = args.has('include-hidden');
const dryRun = args.has('dry-run');

const routingPath = path.join(siteRoot, 'shop-routing.config.json');
const productsJsonPath = path.join(siteRoot, 'data', 'shop-products.json');
const productsJsPath = path.join(siteRoot, 'assets', 'js', 'shop-products.js');

const routing = JSON.parse(await readFile(routingPath, 'utf8'));

async function printifyFetch(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=utf-8'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Printify ${response.status} for ${endpoint}: ${body}`);
  }

  return response.json();
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPrice(cents) {
  if (!Number.isFinite(cents)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2
  }).format(cents / 100);
}

function priceRange(variants = []) {
  const prices = variants
    .filter((variant) => variant.is_enabled !== false && variant.is_available !== false)
    .map((variant) => Number(variant.price))
    .filter(Number.isFinite);

  if (!prices.length) return '';

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${formatPrice(min)}+`;
}

function routeProduct(product) {
  if (routing.overrides?.[product.id]) return routing.overrides[product.id];

  const haystack = [
    product.title,
    product.description,
    ...(product.tags || [])
  ].join(' ').toLowerCase();

  for (const [projectKey, project] of Object.entries(routing.projects || {})) {
    if ((project.keywords || []).some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return projectKey;
    }
  }

  return routing.defaultProject || 'general';
}

function findProductUrl(product) {
  const external = product.external || {};
  const candidates = [
    product.url,
    product.product_url,
    product.preview_url,
    external.url,
    external.handle
  ].filter(Boolean);

  const directUrl = candidates.find((value) => /^https?:\/\//i.test(value));
  if (directUrl) return directUrl;

  if (external.id && routing.etsyShopUrl) {
    return `https://www.etsy.com/listing/${external.id}`;
  }

  return routing.defaultProductUrl || routing.etsyShopUrl || '';
}

function normalizeProduct(product) {
  const project = routeProduct(product);
  const projectConfig = routing.projects?.[project] || {};
  const projectName = projectConfig.name || routing.projects?.general?.name || 'The Piglet\'s Satchel';
  const image = product.images?.find((item) => item.src)?.src || product.images?.[0]?.src || '';
  const description = stripHtml(product.description);

  const normalized = {
    id: product.id,
    title: product.title,
    project,
    projectName,
    description,
    url: findProductUrl(product),
    image,
    price: priceRange(product.variants),
    tags: product.tags || [],
    visible: product.visible !== false,
    source: 'printify',
    updatedAt: product.updated_at || product.created_at || ''
  };

  if (projectConfig.editionSize) {
    normalized.editionSize = projectConfig.editionSize;
  }

  if (projectConfig.editionUnit) {
    normalized.editionUnit = projectConfig.editionUnit;
  }

  return normalized;
}

async function getShopId() {
  if (requestedShopId) return requestedShopId;

  const shops = await printifyFetch('/shops.json');
  if (!Array.isArray(shops) || shops.length === 0) {
    throw new Error('No Printify shops were returned for this token.');
  }

  if (shops.length > 1) {
    const shopList = shops.map((shop) => `${shop.id}: ${shop.title} (${shop.sales_channel})`).join('\n');
    throw new Error(`Multiple Printify shops found. Set PRINTIFY_SHOP_ID to one of these:\n${shopList}`);
  }

  return shops[0].id;
}

async function getAllProducts(shopId) {
  const products = [];
  let page = 1;
  let keepGoing = true;

  while (keepGoing) {
    const payload = await printifyFetch(`/shops/${shopId}/products.json?page=${page}&limit=50`);
    const batch = Array.isArray(payload) ? payload : payload.data || [];
    products.push(...batch);

    if (Array.isArray(payload)) {
      keepGoing = false;
    } else if (payload.last_page && page < payload.last_page) {
      page += 1;
    } else if (payload.next_page_url) {
      page += 1;
    } else {
      keepGoing = false;
    }
  }

  return products;
}

async function main() {
  if (!token) {
    throw new Error('Missing Printify token. Set PRINTIFY_API_TOKEN before running this script.');
  }

  const shopId = await getShopId();
  const rawProducts = await getAllProducts(shopId);
  const products = rawProducts
    .filter((product) => includeHidden || product.visible !== false)
    .map(normalizeProduct)
    .sort((a, b) => a.project.localeCompare(b.project) || a.title.localeCompare(b.title));

  if (dryRun) {
    console.log(JSON.stringify({ shopId, count: products.length, products }, null, 2));
    return;
  }

  await mkdir(path.dirname(productsJsonPath), { recursive: true });
  await mkdir(path.dirname(productsJsPath), { recursive: true });
  await writeFile(productsJsonPath, JSON.stringify(products, null, 2) + '\n', 'utf8');
  await writeFile(productsJsPath, `window.TPS_SHOP_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`, 'utf8');
  console.log(`Synced ${products.length} Printify products from shop ${shopId}.`);
  console.log(`Wrote ${path.relative(siteRoot, productsJsonPath)} and ${path.relative(siteRoot, productsJsPath)}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
