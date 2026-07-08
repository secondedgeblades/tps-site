const NOTIFY_EMAIL = 'secondedgeblades@gmail.com';

const PRINT_NAMES = {
  'price_1TqiM91Ks67NRN3TXvxL6ebN': 'Warrior Fairy',
  'price_1TqiMA1Ks67NRN3T94t4WoMm': 'Hammer Time',
  'price_1TqiMB1Ks67NRN3TAce77AtJ': 'Cat Lady',
  'price_1TqiMC1Ks67NRN3T4EweoC45': 'Samurai',
  'price_1TqiMC1Ks67NRN3TvRUOc7G5': 'Storm Rider',
  'price_1TqiMD1Ks67NRN3TPyj4REw8': 'Battle Dragon',
  'price_1TqiMD1Ks67NRN3To7BuQ8J8': 'Complete Set',
};

async function verifySignature(body, sigHeader, secret) {
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const payload = `${parts.t}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === parts.v1;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const body = await request.text();
  const sigHeader = request.headers.get('stripe-signature') || '';

  if (env.STRIPE_WEBHOOK_SECRET) {
    const valid = await verifySignature(body, sigHeader, env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return new Response('Invalid signature', { status: 400 });
    }
  }

  let event;
  try { event = JSON.parse(body); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const amount = `$${(session.amount_total / 100).toFixed(2)} CAD`;
    const customer = session.customer_details?.name || 'Unknown';
    const email = session.customer_details?.email || 'Unknown';
    const city = session.shipping_details?.address?.city || '';
    const country = session.shipping_details?.address?.country || '';
    const paymentId = session.payment_intent;

    const lineItems = session.line_items?.data || [];
    const itemList = lineItems.length
      ? lineItems.map(i => `${PRINT_NAMES[i.price?.id] || i.description} x${i.quantity}`).join(', ')
      : 'see Stripe';

    const formData = new URLSearchParams({
      _subject: `New order — ${amount}`,
      _template: 'table',
      Amount: amount,
      Customer: customer,
      'Customer email': email,
      'Ships to': [city, country].filter(Boolean).join(', '),
      Items: itemList.replace(/\s*-\s*/g, '').trim(),
      'Stripe link': `https://dashboard.stripe.com/payments/${paymentId}`,
    });

    await fetch(`https://formsubmit.co/${NOTIFY_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
