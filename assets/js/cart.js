const CART_KEY = 'tps_cart';
const MAX_QTY = 5;

function getItems() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function save(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function getCount() {
  return getItems().reduce((n, i) => n + i.quantity, 0);
}

function getTotal() {
  return getItems().reduce((n, i) => n + i.price * i.quantity, 0);
}

function addItem(item) {
  const items = getItems();
  const existing = items.find(i => i.priceId === item.priceId);
  if (existing) {
    existing.quantity = Math.min(MAX_QTY, existing.quantity + 1);
  } else {
    items.push({ priceId: item.priceId, name: item.name, size: item.size, price: item.price, img: item.img, quantity: 1 });
  }
  save(items);
}

function updateQty(priceId, qty) {
  let items = getItems();
  if (qty <= 0) {
    items = items.filter(i => i.priceId !== priceId);
  } else {
    const item = items.find(i => i.priceId === priceId);
    if (item) item.quantity = Math.min(MAX_QTY, qty);
  }
  save(items);
}

function removeItem(priceId) {
  save(getItems().filter(i => i.priceId !== priceId));
}

function clear() {
  localStorage.removeItem(CART_KEY);
}

window.Cart = { getItems, getCount, getTotal, addItem, updateQty, removeItem, clear };
