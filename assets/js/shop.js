const FREE_SHIPPING_THRESHOLD = 90;

function updateBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = Cart.getCount();
  badge.textContent = count;
  badge.hidden = count === 0;
}

function renderCartItems() {
  const list = document.getElementById('cart-item-list');
  const empty = document.getElementById('cart-empty');
  const footer = document.getElementById('cart-footer');
  if (!list) return;

  const items = Cart.getItems();

  while (list.firstChild) list.removeChild(list.firstChild);

  if (items.length === 0) {
    empty.hidden = false;
    footer.hidden = true;
    return;
  }

  empty.hidden = true;
  footer.hidden = false;

  items.forEach(function(item) {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.dataset.priceId = item.priceId;

    const thumb = document.createElement('img');
    thumb.src = item.img;
    thumb.alt = item.name;
    thumb.className = 'cart-item-thumb';

    const info = document.createElement('div');
    info.className = 'cart-item-info';

    const name = document.createElement('p');
    name.className = 'cart-item-name';
    name.textContent = item.name;

    const size = document.createElement('p');
    size.className = 'cart-item-size';
    size.textContent = item.size;

    const price = document.createElement('p');
    price.className = 'cart-item-price';
    price.textContent = '$' + (item.price * item.quantity).toFixed(0) + ' CAD';

    const stepper = document.createElement('div');
    stepper.className = 'qty-stepper';

    const minus = document.createElement('button');
    minus.className = 'qty-btn';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Decrease quantity');
    minus.addEventListener('click', function() {
      Cart.updateQty(item.priceId, item.quantity - 1);
      renderCartItems();
      updateBadge();
      updateProgress();
    });

    const qty = document.createElement('span');
    qty.className = 'qty-count';
    qty.textContent = item.quantity;

    const plus = document.createElement('button');
    plus.className = 'qty-btn';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Increase quantity');
    plus.disabled = item.quantity >= 5;
    plus.addEventListener('click', function() {
      Cart.updateQty(item.priceId, item.quantity + 1);
      renderCartItems();
      updateBadge();
      updateProgress();
    });

    stepper.appendChild(minus);
    stepper.appendChild(qty);
    stepper.appendChild(plus);

    const remove = document.createElement('button');
    remove.className = 'cart-item-remove';
    remove.setAttribute('aria-label', 'Remove ' + item.name);
    remove.textContent = '×';
    remove.addEventListener('click', function() {
      Cart.removeItem(item.priceId);
      renderCartItems();
      updateBadge();
      updateProgress();
    });

    info.appendChild(name);
    info.appendChild(size);
    info.appendChild(price);
    info.appendChild(stepper);

    row.appendChild(thumb);
    row.appendChild(info);
    row.appendChild(remove);
    list.appendChild(row);
  });

  updateSubtotal();
}

function updateSubtotal() {
  const el = document.getElementById('cart-subtotal');
  if (el) el.textContent = '$' + Cart.getTotal().toFixed(0) + ' CAD';
}

function updateProgress() {
  const bar = document.getElementById('shipping-progress-bar');
  const label = document.getElementById('shipping-progress-label');
  if (!bar || !label) return;

  const total = Cart.getTotal();
  const pct = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);
  bar.style.width = pct + '%';

  if (total >= FREE_SHIPPING_THRESHOLD) {
    bar.classList.add('unlocked');
    label.textContent = 'Free shipping unlocked ✓';
  } else {
    bar.classList.remove('unlocked');
    const remaining = (FREE_SHIPPING_THRESHOLD - total).toFixed(0);
    label.textContent = 'Add $' + remaining + ' more for free shipping';
  }
}

function openCart() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (!drawer) return;
  renderCartItems();
  updateProgress();
  drawer.classList.add('open');
  backdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  drawer.querySelector('.cart-close-btn').focus();
}

function closeCart() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (!drawer) return;
  drawer.classList.remove('open');
  backdrop.hidden = true;
  document.body.style.overflow = '';
}

function handleAddToCart(btn) {
  Cart.addItem({
    priceId: btn.dataset.priceId,
    name: btn.dataset.name,
    size: btn.dataset.size,
    price: parseFloat(btn.dataset.price),
    img: btn.dataset.img,
  });
  updateBadge();
  const original = btn.textContent;
  btn.textContent = 'Added ✓';
  btn.disabled = true;
  setTimeout(function() {
    btn.textContent = original;
    btn.disabled = false;
  }, 1000);
  openCart();
}

async function checkoutCart() {
  const btn = document.getElementById('cart-checkout-btn');
  btn.textContent = 'Loading…';
  btn.disabled = true;

  const items = Cart.getItems().map(function(i) {
    return { priceId: i.priceId, quantity: i.quantity };
  });

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (data.error === 'sold_out') throw new Error('Sorry — that print is sold out.');
    if (data.error === 'insufficient_stock') throw new Error('Sorry — only ' + data.available + ' of that print left in stock.');
    if (data.error) throw new Error(data.error);

    closeCart();

    const coModal = document.getElementById('checkout-modal');
    const coLoading = document.getElementById('co-loading');
    const coContainer = document.getElementById('checkout');
    coModal.hidden = false;
    coLoading.hidden = false;
    while (coContainer.firstChild) coContainer.removeChild(coContainer.firstChild);
    document.body.style.overflow = 'hidden';

    const checkout = await Stripe(window.STRIPE_PK).initEmbeddedCheckout({ clientSecret: data.clientSecret });
    checkout.mount('#checkout');
    coLoading.hidden = true;
  } catch (err) {
    btn.textContent = 'Checkout';
    btn.disabled = false;
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  updateBadge();

  const cartToggle = document.getElementById('cart-toggle');
  if (cartToggle) cartToggle.addEventListener('click', openCart);

  const cartClose = document.getElementById('cart-close');
  if (cartClose) cartClose.addEventListener('click', closeCart);

  const backdrop = document.getElementById('cart-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeCart);

  const checkoutBtn = document.getElementById('cart-checkout-btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', checkoutCart);

  document.querySelectorAll('.add-to-cart-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { handleAddToCart(btn); });
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeCart();
  });
});
