const STOCK_LIMIT = 5;

const PRICE_MAP = {
  'price_1TqiM91Ks67NRN3TXvxL6ebN': 2000,  // Warrior Fairy  $20
  'price_1TqiMA1Ks67NRN3T94t4WoMm': 2000,  // Hammer Time    $20
  'price_1TqiMB1Ks67NRN3TAce77AtJ': 2000,  // Cat Lady       $20
  'price_1TqiMC1Ks67NRN3T4EweoC45': 2000,  // Samurai        $20
  'price_1TqiMC1Ks67NRN3TvRUOc7G5': 2000,  // Storm Rider    $20
  'price_1TqiMD1Ks67NRN3TPyj4REw8': 2000,  // Battle Dragon  $20
  'price_1TqiMD1Ks67NRN3To7BuQ8J8': 10000, // Complete Set  $100
};

const FREE_SHIPPING_THRESHOLD = 9000; // $90 CAD in cents

const CA_US_COUNTRIES = ['CA','US'];

const INTL_COUNTRIES = [
  'GB','AU','FR','DE','NL','SE','NZ','IE',
  'IT','ES','PT','BE','CH','AT','DK','FI','NO','JP',
];

const ALLOWED_COUNTRIES = [...CA_US_COUNTRIES, ...INTL_COUNTRIES];

async function getSoldQty(_secretKey) {
  // Stock check temporarily bypassed for diagnostics
  return {};
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    let body;
    try { body = await request.json(); }
    catch {
      return json({ error: 'Invalid request body' }, 400);
    }

    // Normalise to items array
    let items;
    if (body.items) {
      items = body.items;
    } else if (body.priceId) {
      items = [{ priceId: body.priceId, quantity: 1 }];
    } else {
      return json({ error: 'Missing priceId or items' }, 400);
    }

    // Validate
    for (const item of items) {
      if (!PRICE_MAP[item.priceId]) {
        return json({ error: 'Invalid price ID: ' + item.priceId }, 400);
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 5) {
        return json({ error: 'Invalid quantity' }, 400);
      }
    }

    // Stock check
    const soldQty = await getSoldQty(env.STRIPE_SECRET_KEY);
    for (const item of items) {
      const sold = soldQty[item.priceId] || 0;
      const available = STOCK_LIMIT - sold;
      if (available <= 0) {
        return json({ error: 'sold_out', priceId: item.priceId }, 409);
      }
      if (item.quantity > available) {
        return json({ error: 'insufficient_stock', priceId: item.priceId, available }, 409);
      }
    }

    // Calculate total to determine shipping
    const totalCents = items.reduce((sum, item) => sum + PRICE_MAP[item.priceId] * item.quantity, 0);
    const freeShipping = totalCents >= FREE_SHIPPING_THRESHOLD;

    const params = new URLSearchParams({
      'ui_mode': 'embedded',
      'mode': 'payment',
      'return_url': 'https://thepigletssatchel.ca/thanks-order.html?session_id={CHECKOUT_SESSION_ID}',
      'payment_method_types[0]': 'card',
      'payment_method_options[card][request_three_d_secure]': 'automatic',
    });

    // Line items
    items.forEach((item, i) => {
      params.set(`line_items[${i}][price]`, item.priceId);
      params.set(`line_items[${i}][quantity]`, String(item.quantity));
    });

    // Shipping
    if (freeShipping) {
      params.set('shipping_options[0][shipping_rate_data][display_name]', 'Free Shipping');
      params.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
      params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', '0');
      params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'cad');
    } else {
      params.set('shipping_options[0][shipping_rate_data][display_name]', 'Canada & USA');
      params.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
      params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', '1200');
      params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'cad');
      params.set('shipping_options[1][shipping_rate_data][display_name]', 'International');
      params.set('shipping_options[1][shipping_rate_data][type]', 'fixed_amount');
      params.set('shipping_options[1][shipping_rate_data][fixed_amount][amount]', '3200');
      params.set('shipping_options[1][shipping_rate_data][fixed_amount][currency]', 'cad');
    }

    ALLOWED_COUNTRIES.forEach((c, i) => {
      params.set(`shipping_address_collection[allowed_countries][${i}]`, c);
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('Stripe create session error:', JSON.stringify(session));
      return json({ error: session.error?.message || 'Stripe error' }, 502);
    }

    return json({ clientSecret: session.client_secret });

  } catch (err) {
    console.error('Checkout function unhandled error:', err?.message || err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
