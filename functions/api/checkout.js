const ALLOWED_PRICES = new Set([
  'price_1TpFHV1Ks67NRN3TWV9WqIJd', // Warrior Fairy    $40
  'price_1TpFHV1Ks67NRN3THaeAQ7NH', // Hammer Time      $35
  'price_1TpFHW1Ks67NRN3TGMNU4ASl', // Cat Lady         $35
  'price_1TpFHW1Ks67NRN3TcQzwTi2n', // Samurai          $35
  'price_1TpFHX1Ks67NRN3TArG5kZ9E', // Storm Rider      $35
  'price_1TpFHY1Ks67NRN3TdeTX1tyJ', // Battle Dragon    $35
  'price_1TpFHY1Ks67NRN3TW1BDyvEd', // Complete Set    $185
]);

const CA_US_COUNTRIES = ['CA','US'];

const INTL_COUNTRIES = [
  'GB','AU','FR','DE','NL','SE','NZ','IE',
  'IT','ES','PT','BE','CH','AT','DK','FI','NO','JP',
];

const ALLOWED_COUNTRIES = [...CA_US_COUNTRIES, ...INTL_COUNTRIES];

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let priceId;
  try {
    ({ priceId } = await request.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!ALLOWED_PRICES.has(priceId)) {
    return new Response(JSON.stringify({ error: 'Invalid price ID' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({
    'ui_mode': 'embedded',
    'mode': 'payment',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'return_url': 'https://thepigletssatchel.ca/thanks-order.html?session_id={CHECKOUT_SESSION_ID}',
    'shipping_options[0][shipping_rate_data][display_name]': 'Canada & USA',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': '1200',
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'cad',
    'shipping_options[1][shipping_rate_data][display_name]': 'International',
    'shipping_options[1][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[1][shipping_rate_data][fixed_amount][amount]': '3200',
    'shipping_options[1][shipping_rate_data][fixed_amount][currency]': 'cad',
    'payment_method_types[0]': 'card',
    'payment_method_options[card][request_three_d_secure]': 'automatic',
  });

  CA_US_COUNTRIES.forEach((c, i) => {
    params.set(`shipping_options[0][shipping_rate_data][restrictions][allowed_countries][${i}]`, c);
  });

  INTL_COUNTRIES.forEach((c, i) => {
    params.set(`shipping_options[1][shipping_rate_data][restrictions][allowed_countries][${i}]`, c);
  });

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
    return new Response(JSON.stringify({ error: session.error?.message || 'Stripe error' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
