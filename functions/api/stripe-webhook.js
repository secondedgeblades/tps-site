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

  // Notification is handled client-side on thanks-order.html via FormSubmit AJAX.
  // Server-side email requires a transactional email service (FormSubmit blocks non-browser requests).

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
